// @ts-nocheck
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
// Input removed as PDB ID input is removed
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
// Skeleton removed as it might not be used after removing controls
// Download, FileText, Loader, Send icons might still be used by prediction panel
import { Download, FileText, Loader, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Select might still be used by prediction panel for model selection
// Tabs, TabsContent, TabsList, TabsTrigger might not be used if docking tab is simplified or removed in future
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
  focusLigand?: boolean; // This prop might become unused
  viewType?: "docking" | "prediction" | "standard";
}

const MoleculeViewer = ({ 
  initialPdbId = "1crn",
  initialStyle = "cartoon",
  initialColor = "chainname",
  focusLigand = false, // Prop kept, but related button removed
  viewType = "standard",
}: MoleculeViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginContext | null>(null);
  // pdbId state and setPdbId removed
  const { toast } = useToast();
  
  // Structure prediction states (remain unchanged)
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

  // State for advanced controls removed:
  // showAdvancedControls, showAxes, showBoundingBox, showFog, showClipping

  useEffect(() => {
    if (!viewerRef.current) return;

    const initMolstar = async () => {
      try {
        // Create canvas element
        const canvas = document.createElement('canvas');
        if (viewerRef.current) { // Ensure viewerRef.current is not null
            viewerRef.current.innerHTML = ''; // Clear previous canvas if any
            viewerRef.current.appendChild(canvas);
        }


        // Initialize Mol* plugin
        const spec = {
          ...DefaultPluginSpec(),
          layout: {
            initial: {
              isExpanded: true, // Set to true to show controls by default
              showControls: true,
              controlsDisplay: 'reactive' as const
            }
          },
          components: { // Ensure essential components are enabled
            remoteState: 'none',
          }
        };
        const plugin = new PluginContext(spec);
        await plugin.init();
        
        if (viewerRef.current) { // Check again before calling initViewer
            plugin.initViewer(canvas, viewerRef.current);
        }
        pluginRef.current = plugin;

        // Load the protein structure with initial style for non-prediction views
        if (viewType !== "prediction" && initialPdbId) {
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
  // initialPdbId is used for initial load, viewType determines behavior
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [initialPdbId, viewType, toast]); // Added toast to dependency array

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
      let loadedStructureRef; // To hold the structure reference for representations

      if (pdbData) {
        // Load from PDB string data
        data = await pluginRef.current.builders.data.rawData({
          data: pdbData,
          label: 'Predicted Structure'
        });
        const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'pdb');
        const model = await pluginRef.current.builders.structure.createModel(trajectory);
        loadedStructureRef = await pluginRef.current.builders.structure.createStructure(model);
        
        setStructureSource("prediction");
        
        // Calculate average confidence for predicted structures
        const avgConf = calculateAverageConfidence(loadedStructureRef.data);
        setAverageConfidence(avgConf);
        
        // Always use atom-test (pLDDT) coloring for predicted structures
        const reprType = initialStyle === 'cartoon' ? 'cartoon' : 
                         initialStyle === 'spacefill' ? 'spacefill' :
                         initialStyle === 'licorice' ? 'ball-and-stick' : 'cartoon';
        
        await pluginRef.current.builders.structure.representation.addRepresentation(loadedStructureRef, {
          type: reprType,
          colorTheme: { name: 'atom-test' } // Use b-factor coloring for pLDDT confidence
        });
      } else {
        // Load from PDB ID
        data = await pluginRef.current.builders.data.download({
          url: `https://files.rcsb.org/download/${id}.cif`, // Using CIF for better quality
          isBinary: false,
          label: id
        });
        const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'mmcif');
        const model = await pluginRef.current.builders.structure.createModel(trajectory);
        loadedStructureRef = await pluginRef.current.builders.structure.createStructure(model);
        
        setStructureSource("pdb");
        setAverageConfidence(null); // Reset confidence for PDB files
        
        // Apply representation with appropriate coloring based on view type
        const colorThemeName = viewType === 'prediction' ? 'atom-test' : // pLDDT for predictions
                          initialColor === 'chainname' ? 'chain-id' : 
                          initialColor === 'residueindex' ? 'residue-name' :
                          initialColor === 'atomindex' ? 'element-symbol' : 
                          initialColor === 'bfactor' ? 'atom-test' : 'chain-id';
        
        const reprType = initialStyle === 'cartoon' ? 'cartoon' : 
                         initialStyle === 'spacefill' ? 'spacefill' :
                         initialStyle === 'licorice' ? 'ball-and-stick' : 'cartoon';
        
        await pluginRef.current.builders.structure.representation.addRepresentation(loadedStructureRef, {
          type: reprType,
          colorTheme: { name: colorThemeName }
        });
      }
      
      // Auto-focus the structure
      await PluginCommands.Camera.Reset(pluginRef.current, {});
      
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
        description: `Failed to load structure: ${id || 'predicted data'}. Please check your input or network.`,
        variant: "destructive",
      });
    }
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
    setAverageConfidence(null); // Reset confidence before new prediction
    
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
        loadStructure("predicted_structure", apiResult.data); // Pass a label and PDB data
        
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
                // Add query for ligand selection if needed, e.g. by HETATM
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
        <h3 className="text-lg font-medium">Protein Structure Prediction</h3>
        
        <form onSubmit={handlePrediction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="model-select" className="text-sm font-medium">
              Prediction Model
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
              Protein Sequence (FASTA or raw)
            </label>
            <Textarea
              id="sequence"
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              placeholder="Enter your protein sequence here..."
              className="min-h-[150px] font-mono text-xs"
              disabled={predicting}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <Button 
              type="button" // Ensure it doesn't submit the form
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
              <h4 className="font-medium text-sm">Predicted Confidence (pLDDT)</h4>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Average pLDDT: {averageConfidence.toFixed(1)}
                </p>
                <div className="h-3 w-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-full" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Low (pLDDT &lt; 50)</span>
                  <span>Confident (70-90)</span>
                  <span>Very High (&gt; 90)</span>
                </div>
              </div>
            </div>
          )}
          
          {result?.error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <p className="font-medium">Prediction Error:</p>
              <p>{result.error}</p>
            </div>
          )}
          
          {predicting && (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs">
                <span>Processing Sequence</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          )}
        </form>

        {(structureSource === "prediction" && result?.pdbString) && (
             <div className="mt-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const pdbData = result?.pdbString;
                        if (!pdbData) return;
                        const blob = new Blob([pdbData], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'predicted_structure.pdb';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast({ title: "Download Started", description: "Predicted PDB file is downloading."});
                    }}
                >
                    <Download className="w-3 h-3 mr-1" /> Download Predicted PDB
                </Button>
             </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Top bar with external controls removed */}
      {/* Advanced controls bar removed */}
      
      <div className="flex flex-1 min-h-0"> {/* Added min-h-0 to prevent layout issues */}
        {viewType === "docking" ? (
          <div className="flex flex-col md:flex-row w-full">
            <div className="w-full md:w-1/2 md:border-r border-b md:border-b-0 overflow-y-auto"> {/* Added overflow */}
              {/* {renderLigandViewer()} // This is still commented out */}
              <div className="p-4">Placeholder for Docking Controls/Info</div>
            </div>
            <div className="w-full md:w-1/2 h-[400px] md:h-auto bg-black/5 relative"> {/* Min height for visibility */}
              <div ref={viewerRef} className="absolute inset-0" />
            </div>
          </div>
        ) : viewType === "prediction" ? (
          <div className="flex flex-col md:flex-row w-full">
            <div className="w-full md:w-1/3 border-r overflow-y-auto"> {/* Added overflow */}
              {renderSequenceInput()}
            </div>
            <div className="w-full md:w-2/3 h-[400px] md:h-auto bg-black/5 relative"> {/* Min height for visibility */}
              <div ref={viewerRef} className="absolute inset-0" />
            </div>
          </div>
        ) : ( // Standard view
          <div className="flex-1 h-full bg-black/5 relative">
            <div ref={viewerRef} className="absolute inset-0" />
             {/* Instructions for standard view if needed */}
             {!pluginRef.current?.state.data.models.length && initialPdbId && (
                <div className="absolute top-4 left-4 bg-background/80 p-2 rounded text-xs">
                    Loading {initialPdbId}... Use Mol* controls on the left.
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoleculeViewer;
