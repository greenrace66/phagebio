
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Loader, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { validateSequence, cleanSequence, predictStructure } from "@/utils/proteinApi";

interface MoleculeViewerProps {
  initialPdbId?: string;
  initialStyle?: string;
  initialColor?: string;
  focusLigand?: boolean;
  viewType?: "docking" | "prediction" | "standard";
}

const DemoMoleculeViewer = ({ 
  initialPdbId = "1crn",
  initialStyle = "cartoon",
  initialColor = "chainname",
  focusLigand = false,
  viewType = "standard",
}: MoleculeViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const ligandViewerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<any>(null);
  const ligandPluginRef = useRef<any>(null);
  const structureRef = useRef<any>(null);
  const [pdbId, setPdbId] = useState(initialPdbId);
  const { toast } = useToast();
  
  // Structure prediction states
  const [sequence, setSequence] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [structureSource, setStructureSource] = useState<"pdb" | "prediction">("pdb");
  const [result, setResult] = useState<{
    pdbString?: string;
    json?: any;
    error?: string;
  } | null>(null);
  const [averageConfidence, setAverageConfidence] = useState<number | null>(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Initialize Mol* Plugin - createPluginUI returns a Plugin instance directly
    const plugin = createPluginUI(viewerRef.current, {
      ...DefaultPluginUISpec(),
      layout: {
        initial: {
          isExpanded: false,
          showControls: false,
          controlsDisplay: 'hidden'
        }
      },
      components: {
        controls: {
          left: 'none',
          right: 'none',
          top: 'none',
          bottom: 'none'
        }
      }
    });
    
    pluginRef.current = plugin;

    // Load the protein structure with initial style for non-prediction views
    if (viewType !== "prediction") {
      loadStructure(initialPdbId);
    }

    // Handle window resize
    const handleResize = () => {
      plugin.canvas3d?.resized();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      plugin.dispose();
    };
  }, [initialPdbId, viewType]);

  // Initialize ligand viewer for docking view
  useEffect(() => {
    if (viewType === "docking" && ligandViewerRef.current) {
      // Initialize Mol* Plugin for ligand - createPluginUI returns a Plugin instance directly
      const plugin = createPluginUI(ligandViewerRef.current, {
        ...DefaultPluginUISpec(),
        layout: {
          initial: {
            isExpanded: false,
            showControls: false,
            controlsDisplay: 'hidden'
          }
        },
        components: {
          controls: {
            left: 'none',
            right: 'none',
            top: 'none',
            bottom: 'none'
          }
        }
      });
      
      ligandPluginRef.current = plugin;
      
      // Load structure but only show ligand
      loadLigandStructure(initialPdbId);
      
      // Handle window resize
      const handleResize = () => {
        plugin.canvas3d?.resized();
      };
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        plugin.dispose();
      };
    }
  }, [viewType, initialPdbId]);

  const calculateAverageConfidence = (structure: any) => {
    if (!structure) return null;
    
    // For Mol*, we'll need to analyze the B-factor values differently
    // This is a simplified approach to estimate confidence from B-factors
    let totalBfactor = 0;
    let atomCount = 0;
    
    try {
      const model = structure.model;
      const bFactors = model.atomicConformation.b;
      
      for (let i = 0; i < bFactors.length; i++) {
        totalBfactor += bFactors[i];
        atomCount++;
      }
      
      return atomCount > 0 ? totalBfactor / atomCount : null;
    } catch (error) {
      console.error("Error calculating confidence:", error);
      return null;
    }
  };

  const loadLigandStructure = async (id: string) => {
    if (!ligandPluginRef.current) return;
    
    try {
      await ligandPluginRef.current.clear();
      
      // Load from PDB
      const data = await ligandPluginRef.current.builders.data.download({ 
        url: `https://files.rcsb.org/download/${id.toUpperCase()}.pdb`, 
        isBinary: false 
      });
      
      const trajectory = await ligandPluginRef.current.builders.structure.parseTrajectory(data, 'pdb');
      const model = await ligandPluginRef.current.builders.structure.createModel(trajectory);
      const structure = await ligandPluginRef.current.builders.structure.createStructure(model);
      
      // Add ball-and-stick representation for ligands only
      await ligandPluginRef.current.builders.structure.representation.addRepresentation(structure, {
        type: 'ball-and-stick',
        color: 'element-symbol',
        size: 'uniform',
        typeParams: { scale: 0.8 },
        selectQuery: { 
          atomGroups: [{ 'atom-test': q => q.isHetero && !q.isWater }]
        }
      });
      
      // Set background
      const canvas = ligandPluginRef.current.canvas3d;
      canvas.setBackground(Color(ColorNames.white));
      
      // Focus on ligands
      await ligandPluginRef.current.managers.camera.focusLoci(
        ligandPluginRef.current.managers.structure.selection.toLoci({ 
          entityIds: ['ligand']
        })
      );
      
      await ligandPluginRef.current.canvas3d?.resetCamera();
      await ligandPluginRef.current.canvas3d?.requestAnimation();
    } catch (error) {
      console.error('Error loading ligand structure:', error);
    }
  };

  const loadStructure = async (id: string, pdbData?: string) => {
    if (!pluginRef.current) return;
    
    try {
      // Clear existing structures
      await pluginRef.current.clear();
      
      let structure;
      
      if (pdbData) {
        // Load from provided PDB data
        const data = await pluginRef.current.builders.data.rawData({ 
          data: pdbData, 
          label: 'PDB' 
        });
        
        const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'pdb');
        const model = await pluginRef.current.builders.structure.createModel(trajectory);
        structure = await pluginRef.current.builders.structure.createStructure(model);
        
        setStructureSource("prediction");
      } else {
        // Load from PDB ID
        const data = await pluginRef.current.builders.data.download({ 
          url: `https://files.rcsb.org/download/${id.toUpperCase()}.pdb`, 
          isBinary: false 
        });
        
        const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'pdb');
        const model = await pluginRef.current.builders.structure.createModel(trajectory);
        structure = await pluginRef.current.builders.structure.createStructure(model);
        
        setStructureSource("pdb");
      }
      
      structureRef.current = structure;
      
      // Calculate average confidence for predicted structures
      if (pdbData) {
        const avgConf = calculateAverageConfidence(structure);
        setAverageConfidence(avgConf);
      }
      
      // Set up representation based on initialStyle and configuration
      if (pdbData) {
        // Use bfactor coloring for predictions
        await pluginRef.current.builders.structure.representation.addRepresentation(structure, {
          type: initialStyle,
          color: 'bfactor',
          size: 'uniform'
        });
      } else {
        // Use specified coloring for PDB structures
        await pluginRef.current.builders.structure.representation.addRepresentation(structure, {
          type: initialStyle,
          color: initialColor,
          size: 'uniform'
        });
        
        if (focusLigand) {
          // Add additional representation for ligands
          await pluginRef.current.builders.structure.representation.addRepresentation(structure, {
            type: 'ball-and-stick',
            color: 'element-symbol',
            size: 'uniform',
            typeParams: { scale: 0.8 },
            selectQuery: { 
              atomGroups: [{ 'atom-test': q => q.isHetero && !q.isWater }]
            }
          });
          
          // Focus on ligands
          await pluginRef.current.managers.camera.focusLoci(
            pluginRef.current.managers.structure.selection.toLoci({ 
              entityIds: ['ligand']
            })
          );
        }
      }
      
      // Set background and other canvas properties
      const canvas = pluginRef.current.canvas3d;
      canvas.setBackground(Color(ColorNames.white));
      
      // Reset camera view
      await pluginRef.current.canvas3d?.resetCamera();
      await pluginRef.current.canvas3d?.requestAnimation();
      
      toast({
        title: "Structure loaded",
        description: pdbData 
          ? "Successfully loaded predicted structure" 
          : `Successfully loaded PDB ID: ${id}`,
      });
    } catch (error) {
      console.error('Error loading structure:', error);
      toast({
        title: "Error",
        description: "Failed to load structure. Please check your input.",
        variant: "destructive",
      });
    }
  };

  // Handle PDB ID submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStructure(pdbId);
  };

  // Handle protein sequence submission for structure prediction
  const handlePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sequence.trim()) {
      toast({
        title: "Empty Sequence",
        description: "Please enter a protein sequence.",
        variant: "destructive",
      });
      return;
    }
    
    if (!validateSequence(sequence)) {
      toast({
        title: "Invalid Sequence",
        description: "Please enter a valid protein sequence containing only amino acid letters.",
        variant: "destructive",
      });
      return;
    }
    
    setPredicting(true);
    setProgress(0);
    setResult(null);
    
    // Progress simulation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 10;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 800);
    
    try {
      // For demo purposes, we're using a demo API key from ModelDetail.tsx
      const apiKey = "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";
      
      const apiResult = await predictStructure(sequence, apiKey);
      console.log('API Response:', apiResult);

      clearInterval(progressInterval);
      setProgress(100);
      
      if (apiResult.success) {
        // Convert JSON response to PDB format if needed
        const pdbString = apiResult.json?.pdbs?.[0] || apiResult.data;
        setResult({
          pdbString: pdbString,
          json: apiResult.json
        });
        
        // Load the predicted structure
        if (pdbString) {
          loadStructure("", pdbString);
        }
        
        toast({
          title: "Success",
          description: "Structure prediction completed successfully!",
        });
      } else {
        setResult({ error: apiResult.error });
        toast({
          title: "Prediction Failed",
          description: apiResult.error || "An error occurred during prediction.",
          variant: "destructive",
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      setResult({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      });
      toast({
        title: "Error",
        description: "Failed to connect to the prediction service.",
        variant: "destructive",
      });
    } finally {
      setPredicting(false);
    }
  };
  
  // Download currently loaded PDB file
  const downloadPrediction = () => {
    const pdbData = result?.pdbString || null;
    
    if (structureSource === "prediction" && pdbData) {
      // Download predicted structure
      const blob = new Blob([pdbData], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "predicted_structure.pdb";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Your PDB file is being downloaded.",
      });
    } else {
      // Fetch PDB file and trigger download via blob (supports cross-origin)
      const downloadPdb = async () => {
        try {
          const id = pdbId.toUpperCase();
          const url = `https://files.rcsb.org/download/${id}.pdb`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objUrl;
          a.download = `${id}.pdb`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objUrl);
        } catch (err: any) {
          toast({ 
            title: 'Download Failed', 
            description: err.message, 
            variant: 'destructive' 
          });
        }
      };
      downloadPdb();
    }
  };

  // Handle style changes
  const handleStyleChange = (style: string) => {
    if (!structureRef.current || !pluginRef.current) return;
    
    // Remove current representations
    pluginRef.current.builders.structure.representation.removeAll();
    
    // Add new representation with current color scheme
    const colorScheme = structureSource === "prediction" ? 'bfactor' : initialColor;
    
    pluginRef.current.builders.structure.representation.addRepresentation(structureRef.current, {
      type: style,
      color: colorScheme,
      size: 'uniform'
    });
    
    // Re-add ligand representation if needed
    if (focusLigand && structureSource === "pdb") {
      pluginRef.current.builders.structure.representation.addRepresentation(structureRef.current, {
        type: 'ball-and-stick',
        color: 'element-symbol',
        size: 'uniform',
        typeParams: { scale: 0.8 },
        selectQuery: { 
          atomGroups: [{ 'atom-test': q => q.isHetero && !q.isWater }]
        }
      });
    }
  };

  // Handle color scheme changes
  const handleColorChange = (colorScheme: string) => {
    if (!structureRef.current || !pluginRef.current) return;
    
    // Get current representation type from state
    const reprTypes = pluginRef.current.managers.structure.component.state.options.repr;
    const currentType = reprTypes[0]?.type || initialStyle;
    
    // Remove current representations
    pluginRef.current.builders.structure.representation.removeAll();
    
    // Add new representation with new color scheme
    pluginRef.current.builders.structure.representation.addRepresentation(structureRef.current, {
      type: currentType,
      color: colorScheme,
      size: 'uniform'
    });
    
    // Re-add ligand representation if needed
    if (focusLigand && structureSource === "pdb") {
      pluginRef.current.builders.structure.representation.addRepresentation(structureRef.current, {
        type: 'ball-and-stick',
        color: 'element-symbol',
        size: 'uniform',
        typeParams: { scale: 0.8 },
        selectQuery: { 
          atomGroups: [{ 'atom-test': q => q.isHetero && !q.isWater }]
        }
      });
    }
  };

  // Reset view
  const handleResetView = () => {
    if (!pluginRef.current) return;
    pluginRef.current.canvas3d?.resetCamera();
    pluginRef.current.canvas3d?.requestAnimation();
  };

  // Render sequence input for structure prediction similar to ModelDetail.tsx
  const renderSequenceInput = () => {
    const handleLoadExample = () => {
      setSequence("FVNQHLCGSHLVEALYLVCGERGFFYTPKA"); // Insulin sequence example
      toast({
        title: "Example Loaded",
        description: "An example protein sequence has been loaded.",
      });
    };
    
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-lg font-medium">Protein Sequence</h3>
        
        <form onSubmit={handlePrediction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="sequence" className="text-sm font-medium">
              Protein Sequence
            </label>
            <Textarea
              id="sequence"
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              placeholder="Enter your protein sequence..."
              className="min-h-[150px] font-mono text-xs"
              disabled={predicting}
            />
          </div>
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLoadExample}
              disabled={predicting}
            >
              Load Example
            </Button>
            <Button
              size="sm"
              disabled={predicting || !sequence.trim()}
              type="submit"
            >
              {predicting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Predict Structure
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            COST : 1 credit (Demo mode)
          </p>
          
          {/* Confidence color legend */}
          {structureSource === "prediction" && averageConfidence !== null && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm">Confidence</h4>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Average: {averageConfidence.toFixed(1)}
                </p>
                <div className="h-3 w-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-full" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          )}
          
          {result?.error && (
            <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
              <p className="font-medium">Error:</p>
              <p>{result.error}</p>
            </div>
          )}
          
          {predicting && (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs">
                <span>Processing</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          )}
        </form>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 border-b px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        {viewType === "standard" && (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={pdbId}
              onChange={(e) => setPdbId(e.target.value)}
              placeholder="Enter PDB ID"
              className="w-32"
            />
            <Button type="submit" variant="outline" size="sm">Load</Button>
          </form>
        )}
        
        <div className="flex items-center space-x-2">
          <Select defaultValue={initialStyle} onValueChange={handleStyleChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cartoon">Cartoon</SelectItem>
              <SelectItem value="ball-and-stick">Stick</SelectItem>
              <SelectItem value="spacefill">Sphere</SelectItem>
              <SelectItem value="molecular-surface">Surface</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue={initialColor} onValueChange={handleColorChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chain-id">Chain</SelectItem>
              <SelectItem value="residue-index">Residue</SelectItem>
              <SelectItem value="element-symbol">Atom</SelectItem>
              <SelectItem value="bfactor">B-factor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleResetView}>Reset View</Button>
          <Button variant="outline" size="sm" onClick={downloadPrediction}>Download</Button>
        </div>
      </div>
      
      <div className="flex flex-1">
        {viewType === "docking" ? (
          <div className="flex flex-col md:flex-row w-full">
            <div className="w-full md:w-1/2 md:border-r border-b md:border-b-0">
              <div className="p-4 space-y-4">
                <h3 className="text-lg font-medium">Ligand 3D Structure</h3>
                <div className="bg-muted/30 p-4 rounded-md">
                  <div className="aspect-square max-w-[400px] mx-auto relative">
                    <div 
                      ref={ligandViewerRef} 
                      className="absolute inset-0" 
                      style={{ position: 'absolute', width: '100%', height: '100%' }}
                    />
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>PDB ID: {initialPdbId}</p>
                    <p>Showing 3D structure of ligand only</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 h-[300px] md:h-auto bg-black/5 relative">
              <div 
                ref={viewerRef} 
                className="absolute inset-0" 
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
            </div>
          </div>
        ) : viewType === "prediction" ? (
          <div className="flex flex-col md:flex-row w-full">
            <div className="w-full md:w-1/3 border-r">
              {renderSequenceInput()}
            </div>
            <div className="w-full md:w-2/3 h-[300px] md:h-auto bg-black/5 relative">
              <div 
                ref={viewerRef} 
                className="absolute inset-0" 
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 h-full bg-black/5 relative">
            <div 
              ref={viewerRef} 
              className="absolute inset-0" 
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoMoleculeViewer;
