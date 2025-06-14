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
import { Structure } from "molstar/lib/mol-model/structure"; // Added for calculateAverageConfidence

interface MoleculeViewerProps {
  initialPdbId?: string;
  initialStyle?: string;
  initialColor?: string;
  focusLigand?: boolean; // This prop might become unused
  viewType?: "docking" | "prediction" | "standard";
}

const MoleculeViewer = ({ 
  initialPdbId = "1crn", // Default PDB for standard/docking
  initialStyle = "cartoon",
  initialColor = "chainname",
  focusLigand = false, // Prop kept, but related button removed
  viewType = "standard",
}: MoleculeViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginContext | null>(null);
  // pdbId state and setPdbId removed
  const { toast } = useToast();
  
  // Structure prediction states
  const [sequence, setSequence] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [structureSource, setStructureSource] = useState<"pdb" | "prediction">("pdb");
  const [result, setResult] = useState<{
    pdbString?: string;
    json?: any; // from API if needed
    error?: string;
  } | null>(null);
  const [averageConfidence, setAverageConfidence] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<"esmfold" | "alphafold2">("esmfold");

  // State for advanced controls removed

  useEffect(() => {
    // ... keep existing code (initMolstar setup)
    if (!viewerRef.current) return;

    const initMolstar = async () => {
      try {
        // Create canvas element
        const canvas = document.createElement('canvas');
        if (viewerRef.current) { 
            viewerRef.current.innerHTML = ''; 
            viewerRef.current.appendChild(canvas);
        }

        const spec = {
          ...DefaultPluginSpec(),
          layout: {
            initial: {
              isExpanded: true, 
              showControls: true, // Native Mol* controls enabled
              controlsDisplay: 'reactive' as const
            }
          },
          components: { 
            remoteState: 'none',
          }
        };
        const plugin = new PluginContext(spec);
        await plugin.init();
        
        if (viewerRef.current) { 
            plugin.initViewer(canvas, viewerRef.current);
        }
        pluginRef.current = plugin;

        // Load the protein structure with initial style for non-prediction views
        if (viewType !== "prediction" && initialPdbId) {
          loadStructure(initialPdbId);
          setStructureSource("pdb"); // Ensure source is set for initial PDB ID load
        } else if (viewType === "prediction") {
          setStructureSource("prediction"); // Default for prediction view
        }


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
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [initialPdbId, viewType]); // Removed toast from deps

  const calculateAverageConfidence = (structureData: Structure | undefined) => {
    // ... keep existing code (calculateAverageConfidence implementation)
    if (!structureData) return null;
    
    let totalBfactor = 0;
    let atomCount = 0;
    
    for (const unit of structureData.units) {
      const { elements } = unit;
      const bFactors = unit.model.atomicConformation.B_iso_or_equiv;
      
      if (elements && typeof elements.length === 'number') {
        for (let i = 0; i < elements.length; i++) {
          totalBfactor += bFactors.value(elements[i]);
          atomCount++;
        }
      }
    }
    
    return atomCount > 0 ? totalBfactor / atomCount : null;
  };

  const loadStructure = async (idOrLabel: string, pdbData?: string) => {
    // ... keep existing code (loadStructure implementation, careful with structure object)
    if (!pluginRef.current) return;
    
    try {
      await pluginRef.current.clear();
      
      let loadedStructureRef: StateObjectRef<Structure>; // To hold the structure reference for representations
      let structureObj: Structure | undefined;

      if (pdbData) {
        const data = await pluginRef.current.builders.data.rawData({
          data: pdbData,
          label: idOrLabel // Use idOrLabel as label
        });
        const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'pdb');
        const model = await pluginRef.current.builders.structure.createModel(trajectory);
        loadedStructureRef = await pluginRef.current.builders.structure.createStructure(model);
        
        structureObj = loadedStructureRef.cell?.obj?.data;
        setStructureSource("prediction");
        
        const avgConf = calculateAverageConfidence(structureObj);
        setAverageConfidence(avgConf);
        
        const reprType = initialStyle === 'cartoon' ? 'cartoon' : 
                         initialStyle === 'spacefill' ? 'spacefill' :
                         initialStyle === 'licorice' ? 'ball-and-stick' : 'cartoon';
        
        await pluginRef.current.builders.structure.representation.addRepresentation(loadedStructureRef, {
          type: reprType,
          colorTheme: { name: 'atom-test' } 
        });
      } else {
        // Load from PDB ID (idOrLabel is PDB ID here)
        const data = await pluginRef.current.builders.data.download({
          url: `https://files.rcsb.org/download/${idOrLabel}.cif`, 
          isBinary: false,
          label: idOrLabel
        });
        const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'mmcif');
        const model = await pluginRef.current.builders.structure.createModel(trajectory);
        loadedStructureRef = await pluginRef.current.builders.structure.createStructure(model);
        
        structureObj = loadedStructureRef.cell?.obj?.data;
        setStructureSource("pdb");
        setAverageConfidence(calculateAverageConfidence(structureObj)); // Also calculate for PDBs if B-factors exist
        
        const colorThemeName = viewType === 'prediction' ? 'atom-test' : 
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
      
      await PluginCommands.Camera.Reset(pluginRef.current, {});
      
      toast({
        title: "Structure loaded",
        description: pdbData 
          ? `Successfully loaded ${idOrLabel}` 
          : `Successfully loaded PDB ID: ${idOrLabel}`,
      });
    } catch (error) {
      console.error('Structure loading error:', error);
      toast({
        title: "Error",
        description: `Failed to load structure: ${idOrLabel || 'predicted data'}. Error: ${error.message}`,
        variant: "destructive",
      });
       setAverageConfidence(null); // Reset on error
    }
  };

  const handlePrediction = async (e: React.FormEvent) => {
    // ... keep existing code (handlePrediction implementation)
    e.preventDefault();
    
    if (!sequence.trim()) {
      toast({ title: "Empty Sequence", description: "Please enter a protein sequence.", variant: "destructive" });
      return;
    }
    
    if (!validateSequence(sequence)) {
      toast({ title: "Invalid Sequence", description: "Please enter a valid protein sequence.", variant: "destructive" });
      return;
    }
    
    setPredicting(true);
    setProgress(0);
    setResult(null);
    setAverageConfidence(null);
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 10;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 800);
    
    try {
      // Using a placeholder API key for demo as per original code
      const apiKey = "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"; 
      
      const apiResult = await predictStructure(sequence, apiKey, selectedModel);
      console.log('API Response for prediction:', apiResult);

      clearInterval(progressInterval);
      setProgress(100);
      
      if (apiResult.success && apiResult.data) {
        setResult({ pdbString: apiResult.data, json: apiResult.json });
        loadStructure(`predicted_${selectedModel}_structure`, apiResult.data);
        toast({ title: "Success", description: "Structure prediction completed successfully!" });
      } else {
        setResult({ error: apiResult.error });
        toast({ title: "Prediction Failed", description: apiResult.error || "An error occurred during prediction.", variant: "destructive" });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      setResult({ error: error instanceof Error ? error.message : "Unknown error occurred" });
      toast({ title: "Error", description: "Failed to connect to the prediction service.", variant: "destructive" });
    } finally {
      setPredicting(false);
    }
  };
  
  // renderLigandViewer is removed as docking tab is simplified / uses main viewer

  const renderSequenceInput = () => {
    // ... keep existing code (renderSequenceInput JSX and logic)
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
              type="button" 
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
          
          {structureSource === "prediction" && averageConfidence !== null && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm">Predicted Confidence (pLDDT)</h4>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Average pLDDT: {averageConfidence.toFixed(1)}
                </p>
                <div className="h-3 w-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-full" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Low (&lt;50)</span> {/* Simpler labels */}
                  <span>Confident (70-90)</span>
                  <span>Very High (&gt;90)</span>
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
      <div className="flex flex-1 min-h-0">
        {viewType === "docking" ? (
          <div className="flex flex-col md:flex-row w-full">
            <div className="w-full md:w-1/2 md:border-r border-b md:border-b-0 overflow-y-auto p-4">
              <h3 className="text-lg font-medium mb-2">Docking View</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Docking controls and information would appear here. The 3D viewer shows the protein target.
                Ligand loading/selection would be managed via Mol* controls or dedicated UI.
              </p>
              {/* Placeholder for docking specific controls or info */}
              <div className="bg-muted/10 p-3 rounded">
                <p className="text-xs">PDB ID: {initialPdbId || "N/A"}</p>
                <p className="text-xs mt-1">Use Mol* controls (usually on the left or via panel) to interact with the structure.</p>
              </div>
            </div>
            <div className="w-full md:w-1/2 h-[400px] md:h-auto bg-black/5 relative">
              <div ref={viewerRef} className="absolute inset-0" />
               {(!pluginRef.current?.state?.data?.models?.size && initialPdbId) && (
                <div className="absolute top-4 left-4 bg-background/80 p-2 rounded text-xs shadow">
                    Loading {initialPdbId}...
                </div>
              )}
            </div>
          </div>
        ) : viewType === "prediction" ? (
          <div className="flex flex-col md:flex-row w-full">
            <div className="w-full md:w-1/3 border-r overflow-y-auto">
              {renderSequenceInput()}
            </div>
            <div className="w-full md:w-2/3 h-[400px] md:h-auto bg-black/5 relative">
              <div ref={viewerRef} className="absolute inset-0" />
              {/* Message for prediction view if no structure yet */}
              {(!pluginRef.current?.state?.data?.models?.size && !predicting) && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground p-4 text-center">
                    Enter a sequence and click "Predict Structure" to view the model.
                </div>
              )}
            </div>
          </div>
        ) : ( // Standard view
          <div className="flex-1 h-full bg-black/5 relative">
            <div ref={viewerRef} className="absolute inset-0" />
             {/* Check pluginRef.current, then state, then data, then models, then size */}
             {(!pluginRef.current?.state?.data?.models?.size && initialPdbId) && (
                <div className="absolute top-4 left-4 bg-background/80 p-2 rounded text-xs shadow">
                    Loading {initialPdbId}... Use Mol* controls.
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoleculeViewer;
