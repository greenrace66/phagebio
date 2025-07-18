// @ts-nocheck
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { validateSequence, cleanSequence, predictStructure } from "@/utils/proteinApi";

interface MoleculeViewerProps {
  initialPdbId?: string;
  initialStyle?: string;
  initialColor?: string;
  focusLigand?: boolean;
  viewType?: "docking" | "prediction" | "standard";
}

const MoleculeViewer = ({ 
  initialPdbId = "1crn",
  initialStyle = "cartoon",
  initialColor = "chainname",
  focusLigand = false,
  viewType = "standard",
}: MoleculeViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginContext | null>(null);
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
  const [selectedModel, setSelectedModel] = useState<"esmfold" | "alphafold2">("esmfold");

  // Toggle additional viewer controls
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [showFog, setShowFog] = useState(true);
  const [showClipping, setShowClipping] = useState(false);

  useEffect(() => {
    if (!viewerRef.current) return;

    const initMolstar = async () => {
      try {
        // Create canvas element
        const canvas = document.createElement('canvas');
        viewerRef.current.appendChild(canvas);

        // Initialize Mol* plugin
        const spec = {
          ...DefaultPluginSpec(),
          layout: {
            initial: {
              isExpanded: false,
              showControls: true,
              controlsDisplay: 'reactive' as const
            }
          }
        };
        const plugin = new PluginContext(spec);
        await plugin.init();
        plugin.initViewer(canvas, viewerRef.current);
        pluginRef.current = plugin;

        // Load the protein structure with initial style for non-prediction views
        if (viewType !== "prediction") {
          loadStructure(initialPdbId);
        }

        // Handle window resize
        const handleResize = () => {
          plugin.canvas3d?.handleResize();
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          plugin.dispose();
        };
      } catch (error) {
        console.error('Failed to initialize Mol*:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to initialize the molecular viewer.",
          variant: "destructive",
        });
      }
    };

    initMolstar();
  }, [initialPdbId, viewType]);

  const calculateAverageConfidence = (structure: any) => {
    if (!structure) return null;
    
    let totalBfactor = 0;
    let atomCount = 0;
    
    // Iterate through structure units and atoms
    for (const unit of structure.units) {
      const { elements } = unit;
      const bFactors = unit.model.atomicConformation.B_iso_or_equiv;
      
      for (let i = 0; i < elements.length; i++) {
        totalBfactor += bFactors.value(elements[i]);
        atomCount++;
      }
    }
    
    return atomCount > 0 ? totalBfactor / atomCount : null;
  };

  const loadStructure = async (id: string, pdbData?: string) => {
    if (!pluginRef.current) return;
    
    try {
      // Clear existing structures
      await pluginRef.current.clear();
      
      let data;
      if (pdbData) {
        // Load from PDB string data
        data = await pluginRef.current.builders.data.rawData({
          data: pdbData,
          label: 'Predicted Structure'
        });
        const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'pdb');
        const model = await pluginRef.current.builders.structure.createModel(trajectory);
        const structure = await pluginRef.current.builders.structure.createStructure(model);
        
        setStructureSource("prediction");
        
        // Calculate average confidence for predicted structures
        const avgConf = calculateAverageConfidence(structure.data);
        setAverageConfidence(avgConf);
        
        // Always use atom-test (pLDDT) coloring for predicted structures
        const reprType = initialStyle === 'cartoon' ? 'cartoon' : 
                         initialStyle === 'spacefill' ? 'spacefill' :
                         initialStyle === 'licorice' ? 'ball-and-stick' : 'cartoon';
        
        await pluginRef.current.builders.structure.representation.addRepresentation(structure, {
          type: reprType,
          colorTheme: { name: 'atom-test' } // Use b-factor coloring for pLDDT confidence
        });
      } else {
        // Load from PDB ID
        data = await pluginRef.current.builders.data.download({
          url: `https://files.rcsb.org/download/${id}.cif`,
          isBinary: false
        });
        const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'mmcif');
        const model = await pluginRef.current.builders.structure.createModel(trajectory);
        const structure = await pluginRef.current.builders.structure.createStructure(model);
        
        setStructureSource("pdb");
        
        // Apply representation with appropriate coloring based on view type
        const colorTheme = viewType === 'prediction' ? 'atom-test' : // pLDDT for predictions
                          initialColor === 'chainname' ? 'chain-id' : 
                          initialColor === 'residueindex' ? 'residue-name' :
                          initialColor === 'atomindex' ? 'element-symbol' : 
                          initialColor === 'bfactor' ? 'atom-test' : 'chain-id';
        
        const reprType = initialStyle === 'cartoon' ? 'cartoon' : 
                         initialStyle === 'spacefill' ? 'spacefill' :
                         initialStyle === 'licorice' ? 'ball-and-stick' : 'cartoon';
        
        await pluginRef.current.builders.structure.representation.addRepresentation(structure, {
          type: reprType,
          colorTheme: { name: colorTheme }
        });
        
        // Auto-focus the structure
        await PluginCommands.Camera.Reset(pluginRef.current, {});
      }
      
      toast({
        title: "Structure loaded",
        description: pdbData 
          ? "Successfully loaded predicted structure" 
          : `Successfully loaded PDB ID: ${id}`,
      });
    } catch (error) {
      console.error('Structure loading error:', error);
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
      
      const apiResult = await predictStructure(sequence, apiKey, selectedModel);
      console.log('API Response:', apiResult);

      clearInterval(progressInterval);
      setProgress(100);
      
      if (apiResult.success && apiResult.data) {
        setResult({
          pdbString: apiResult.data,
          json: apiResult.json
        });
        
        // Load the predicted structure
        loadStructure("", apiResult.data);
        
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
      setResult({ error: error instanceof Error ? error.message : "Unknown error occurred" });
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
          toast({ title: 'Download Failed', description: err.message, variant: 'destructive' });
        }
      };
      downloadPdb();
    }
  };

  // Handle style changes
  const handleStyleChange = async (style: string) => {
    if (!pluginRef.current) return;

    try {
      // Get current structure
      const structures = pluginRef.current.managers.structure.hierarchy.current.structures;
      if (structures.length === 0) return;

      const structure = structures[0];
      
      // Remove existing representations
      const reprs = pluginRef.current.managers.structure.hierarchy.current.representations;
      for (const repr of reprs) {
        await PluginCommands.State.RemoveObject(pluginRef.current, { state: repr.parent!, ref: repr.transform.ref });
      }

      // Add new representation
      const reprType = style === 'cartoon' ? 'cartoon' : 
                      style === 'spacefill' ? 'spacefill' :
                      style === 'licorice' ? 'ball-and-stick' : 'surface';
      
      // Use appropriate coloring based on structure source and view type
      let colorTheme;
      if (structureSource === 'prediction' || viewType === 'prediction') {
        // Always use pLDDT coloring for predictions
        colorTheme = 'atom-test';
      } else {
        // For PDB structures, use the current color scheme
        const currentColorSelect = document.querySelector('select[placeholder="Color"]') as HTMLSelectElement;
        const currentColor = currentColorSelect?.value || initialColor;
        
        colorTheme = currentColor === 'chainname' ? 'chain-id' : 
                    currentColor === 'residueindex' ? 'residue-name' :
                    currentColor === 'atomindex' ? 'element-symbol' :
                    currentColor === 'bfactor' ? 'atom-test' : 'chain-id';
      }
      
      await pluginRef.current.builders.structure.representation.addRepresentation(structure, {
        type: reprType,
        colorTheme: { name: colorTheme }
      });
      
      // If in docking view, re-add ligand representation
      if (viewType === 'docking' || focusLigand) {
        try {
          const model = structure.data.models[0];
          
          // Create a query for selecting ligands
          const query = {
            "kind": "composite",
            "parts": [
              { "kind": "atom-property", "property": "isHet" }
            ]
          };
          
          // Create ligand-specific structure with the query
          const ligandStructure = await pluginRef.current.builders.structure.createStructure(model, {
            name: 'ligand-only',
            params: { query }
          });
          
          // Add ball-and-stick representation for ligands with element coloring
          await pluginRef.current.builders.structure.representation.addRepresentation(ligandStructure, {
            type: 'ball-and-stick',
            colorTheme: { name: 'element-symbol' }
          });
        } catch (ligandError) {
          console.error('Failed to add ligand representation:', ligandError);
        }
      }
    } catch (error) {
      console.error('Style change error:', error);
    }
  };

  // Handle color scheme changes
  const handleColorChange = async (colorScheme: string) => {
    if (!pluginRef.current) return;

    try {
      const reprs = pluginRef.current.managers.structure.hierarchy.current.representations;
      if (reprs.length === 0) return;

      // Map color schemes to Mol* color themes
      let colorThemeName;
      
      // For prediction structures or prediction view type, always use pLDDT coloring
      if ((structureSource === 'prediction' || viewType === 'prediction') && colorScheme === 'bfactor') {
        colorThemeName = 'atom-test';
      } else {
        // For other cases, map to appropriate color themes
        switch (colorScheme) {
          case 'chainname':
            colorThemeName = 'chain-id';
            break;
          case 'residueindex':
            colorThemeName = 'residue-name';
            break;
          case 'atomindex':
            colorThemeName = 'element-symbol';
            break;
          case 'bfactor':
            colorThemeName = 'atom-test';
            break;
          default:
            colorThemeName = 'chain-id';
        }
      }

      // Update all representations except ligand representations
      for (const repr of reprs) {
        // Skip ligand representations (they should always use element-symbol coloring)
        const isLigandRepr = repr.obj?.label?.includes('ligand-only');
        if (!isLigandRepr) {
          await PluginCommands.State.Update(pluginRef.current, {
            state: repr.parent!,
            tree: repr,
            params: {
              colorTheme: { name: colorThemeName }
            }
          });
        }
      }
    } catch (error) {
      console.error('Color change error:', error);
    }
  };

  // Reset view
  const handleResetView = async () => {
    if (!pluginRef.current) return;
    
    try {
      await PluginCommands.Camera.Reset(pluginRef.current, {});
    } catch (error) {
      console.error('Reset view error:', error);
    }
  };

  // Render 3D ligand view for docking tab
  const renderLigandViewer = () => {
    const ligandViewerRef = useRef<HTMLDivElement>(null);
    const ligandPluginRef = useRef<PluginContext | null>(null);
    
    useEffect(() => {
      if (!ligandViewerRef.current) return;
      
      const initLigandViewer = async () => {
        try {
          // Create canvas element
          const canvas = document.createElement('canvas');
          ligandViewerRef.current.appendChild(canvas);

          // Initialize Mol* plugin for ligand
          const plugin = new PluginContext(DefaultPluginSpec());
          await plugin.init();
          plugin.initViewer(canvas, ligandViewerRef.current);
          ligandPluginRef.current = plugin;
          
          // Load the protein structure but only show ligand
          const loadLigand = async () => {
            try {
              const data = await plugin.builders.data.download({
                url: `https://files.rcsb.org/download/${initialPdbId}.cif`,
                isBinary: false
              });
              const trajectory = await plugin.builders.structure.parseTrajectory(data, 'mmcif');
              const model = await plugin.builders.structure.createModel(trajectory);
              
              // Create structure with ligand selection
              const structure = await plugin.builders.structure.createStructure(model, {
                name: 'ligand-only'
              });
              
              // Add ball-and-stick representation for ligands
              await plugin.builders.structure.representation.addRepresentation(structure, {
                type: 'ball-and-stick',
                colorTheme: { name: 'element-symbol' }
              });
              
              await PluginCommands.Camera.Reset(plugin, {});
            } catch (error) {
              console.error("Failed to load ligand:", error);
            }
          };
          
          loadLigand();
          
          // Handle window resize
          const handleResize = () => {
            plugin.canvas3d?.handleResize();
          };
          window.addEventListener('resize', handleResize);
          
          return () => {
            window.removeEventListener('resize', handleResize);
            plugin.dispose();
          };
        } catch (error) {
          console.error('Failed to initialize ligand viewer:', error);
        }
      };
      
      initLigandViewer();
    }, [initialPdbId]);
    
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-lg font-medium">Ligand 3D Structure</h3>
        <div className="bg-muted/30 p-4 rounded-md">
          <div className="aspect-square max-w-[400px] mx-auto relative">
            <div ref={ligandViewerRef} className="absolute inset-0" />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>PDB ID: {initialPdbId}</p>
            <p>Showing 3D structure of ligand only</p>
          </div>
        </div>
      </div>
    );
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
            <label htmlFor="model-select" className="text-sm font-medium">
              Model
            </label>
            <Select value={selectedModel} onValueChange={(value: "esmfold" | "alphafold2") => setSelectedModel(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="esmfold">ESMFold (1 credit)</SelectItem>
                <SelectItem value="alphafold2">AlphaFold2 (2 credits)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
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
            COST : {selectedModel === 'alphafold2' ? '2' : '1'} credit (Demo mode)
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

  // Toggle viewer settings
  const toggleAxes = async () => {
    if (!pluginRef.current?.canvas3d) return;
    try {
      const newState = !showAxes;
      setShowAxes(newState);
      toast({
        title: newState ? "Axes Enabled" : "Axes Disabled",
        description: `Coordinate axes are now ${newState ? 'visible' : 'hidden'}.`,
      });
    } catch (error) {
      console.error('Toggle axes error:', error);
    }
  };
  
  const toggleBoundingBox = async () => {
    if (!pluginRef.current?.canvas3d) return;
    try {
      const newState = !showBoundingBox;
      setShowBoundingBox(newState);
      toast({
        title: newState ? "Bounding Box Enabled" : "Bounding Box Disabled",
        description: `Structure bounding box is now ${newState ? 'visible' : 'hidden'}.`,
      });
    } catch (error) {
      console.error('Toggle bounding box error:', error);
    }
  };
  
  const toggleFog = async () => {
    if (!pluginRef.current?.canvas3d) return;
    try {
      const newState = !showFog;
      setShowFog(newState);
      toast({
        title: newState ? "Fog Enabled" : "Fog Disabled",
        description: `Depth fog effect is now ${newState ? 'on' : 'off'}.`,
      });
    } catch (error) {
      console.error('Toggle fog error:', error);
    }
  };
  
  const toggleClipping = async () => {
    if (!pluginRef.current?.canvas3d) return;
    try {
      const newState = !showClipping;
      setShowClipping(newState);
      toast({
        title: newState ? "Clipping Enabled" : "Clipping Disabled",
        description: `Camera clipping is now ${newState ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Toggle clipping error:', error);
    }
  };
  
  // Focus on ligand
  const focusOnLigand = async () => {
    if (!pluginRef.current) return;
    try {
      const structures = pluginRef.current.managers.structure.hierarchy.current.structures;
      if (structures.length === 0) return;
      
      const structure = structures[0];
      const model = structure.data.models[0];
      
      // Create a query for selecting ligands
      const query = {
        "kind": "composite",
        "parts": [
          { "kind": "atom-property", "property": "isHet" }
        ]
      };
      
      // Try to focus on ligands
      try {
        // Create a selection of ligands
        const selection = await pluginRef.current.builders.structure.tryCreateSelectionFromQuery(structure, query);
        
        if (selection && selection.elementCount > 0) {
          // Focus camera on the ligand selection
          await PluginCommands.Camera.Focus(pluginRef.current, { 
            target: selection,
            durationMs: 250
          });
          return true;
        }
      } catch (ligandError) {
        console.error('Failed to focus on ligand:', ligandError);
      }
      
      // If ligand focus fails, reset the camera view
      await PluginCommands.Camera.Reset(pluginRef.current, {});
      return false;
    } catch (error) {
      console.error('Focus on ligand error:', error);
      return false;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 border-b px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {viewType === "standard" && (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                value={pdbId}
                onChange={(e) => setPdbId(e.target.value)}
                placeholder="Enter PDB ID"
                className="w-24 sm:w-32 h-8 text-xs"
              />
              <Button type="submit" variant="outline" size="sm" className="h-8 text-xs">Load</Button>
            </form>
          )}
          
          <Select defaultValue={initialStyle} onValueChange={handleStyleChange}>
            <SelectTrigger className="w-24 sm:w-32 h-8 text-xs">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cartoon">Cartoon</SelectItem>
              <SelectItem value="spacefill">Sphere</SelectItem>
              <SelectItem value="licorice">Stick</SelectItem>
              <SelectItem value="surface">Surface</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue={initialColor} onValueChange={handleColorChange}>
            <SelectTrigger className="w-24 sm:w-32 h-8 text-xs">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chainname">Chain</SelectItem>
              <SelectItem value="residueindex">Residue</SelectItem>
              <SelectItem value="atomindex">Atom</SelectItem>
              <SelectItem value="bfactor">pLDDT</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAdvancedControls(!showAdvancedControls)} 
            className="h-8 text-xs"
          >
            {showAdvancedControls ? "Hide Controls" : "More Controls"}
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetView} className="h-8 text-xs">Reset View</Button>
          {viewType === 'docking' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={focusOnLigand}
              className="h-8 text-xs"
            >
              Focus Ligand
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadPrediction}
            className="h-8 text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>
      
      {showAdvancedControls && (
        <div className="bg-muted/20 border-b px-2 sm:px-4 py-2 flex flex-wrap items-center gap-2">
          <Button 
            variant={showAxes ? "default" : "outline"} 
            size="sm" 
            onClick={toggleAxes} 
            className="h-8 text-xs"
          >
            {showAxes ? "Hide Axes" : "Show Axes"}
          </Button>
          <Button 
            variant={showBoundingBox ? "default" : "outline"} 
            size="sm" 
            onClick={toggleBoundingBox} 
            className="h-8 text-xs"
          >
            {showBoundingBox ? "Hide Box" : "Show Box"}
          </Button>
          <Button 
            variant={showFog ? "default" : "outline"} 
            size="sm" 
            onClick={toggleFog} 
            className="h-8 text-xs"
          >
            {showFog ? "Fog On" : "Fog Off"}
          </Button>
          <Button 
            variant={showClipping ? "default" : "outline"} 
            size="sm" 
            onClick={toggleClipping} 
            className="h-8 text-xs"
          >
            {showClipping ? "Clipping On" : "Clipping Off"}
          </Button>
        </div>
      )}
      
      <div className="flex flex-1">
        {viewType === "docking" ? (
          <div className="flex flex-col md:flex-row w-full">
            <div className="w-full md:w-1/2 md:border-r border-b md:border-b-0">
              {/* {renderLigandViewer()} */}
            </div>
            <div className="w-full md:w-1/2 h-[300px] md:h-auto bg-black/5 relative">
              <div ref={viewerRef} className="absolute inset-0" />
            </div>
          </div>
        ) : viewType === "prediction" ? (
          <div className="flex flex-col md:flex-row w-full">
            <div className="w-full md:w-1/3 border-r">
              {renderSequenceInput()}
            </div>
            <div className="w-full md:w-2/3 h-[300px] md:h-auto bg-black/5 relative">
              <div ref={viewerRef} className="absolute inset-0" />
            </div>
          </div>
        ) : (
          <div className="flex-1 h-full bg-black/5 relative">
            <div ref={viewerRef} className="absolute inset-0" />
          </div>
        )}
      </div>
    </div>
  );
};


export default MoleculeViewer;
