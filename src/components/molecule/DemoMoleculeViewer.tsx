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
import { StateSelection } from 'molstar/lib/mol-state';
import { StructureRepresentationPresetProvider } from 'molstar/lib/mol-plugin-state/builder/structure/representation-preset';
import { ColorTheme } from 'molstar/lib/mol-theme/color';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { validateSequence, cleanSequence, predictStructure } from "@/utils/proteinApi";

// Import the modular MolStar utilities
import {
  loadStructureIntoMolstar,
  updatePolymerView,
  overPaintPolymer,
  setStructureTransparency,
  addPredictedPolymerRepresentation,
  createLigandRepresentations,
  focusOnSecondLoadedStructure,
  convertESMFoldToPredictionData,
  PolymerViewType,
  PolymerColorType,
  PolymerRepresentation,
  PocketRepresentation,
  PredictionData
} from '@/utils/molstar';

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
  
  // Advanced MolStar states
  const [polymerRepresentations, setPolymerRepresentations] = useState<PolymerRepresentation[]>([]);
  const [predictedPolymerRepresentations, setPredictedPolymerRepresentations] = useState<PolymerRepresentation[]>([]);
  const [pocketRepresentations, setPocketRepresentations] = useState<PocketRepresentation[]>([]);
  const [currentPolymerView, setCurrentPolymerView] = useState<PolymerViewType>(
    initialStyle === 'cartoon' ? PolymerViewType.Cartoon : 
    initialStyle === 'spacefill' || initialStyle === 'licorice' ? PolymerViewType.Atoms : 
    PolymerViewType.Gaussian_Surface
  );
  const [currentColorType, setCurrentColorType] = useState<PolymerColorType>(
    initialColor === 'chainname' ? PolymerColorType.Chain :
    initialColor === 'residueindex' ? PolymerColorType.Residue :
    initialColor === 'atomindex' ? PolymerColorType.Element :
    initialColor === 'bfactor' ? PolymerColorType.AlphaFold :
    PolymerColorType.White
  );
  const [structureTransparency, setStructureTransparency] = useState<number>(1);
  const [showConfidentResidues, setShowConfidentResidues] = useState<boolean>(false);

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
              controlsDisplay: 'reactive'
            },
            controls: {
              left: { collapsed: false },
              right: { collapsed: false },
              top: { collapsed: false },
              bottom: { collapsed: false }
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
      
      let structure;
      let polymerReps;
      
      if (pdbData) {
        // Load from PDB string data
        const blob = new Blob([pdbData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Use the modular function to load structure
        const [model, structureObj, polymerRepresentations] = await loadStructureIntoMolstar(
          pluginRef.current, 
          url,
          structureTransparency
        );
        
        structure = structureObj;
        polymerReps = polymerRepresentations;
        setPolymerRepresentations(polymerRepresentations);
        
        setStructureSource("prediction");
        
        // Calculate average confidence for predicted structures
        const avgConf = calculateAverageConfidence(structure.data);
        setAverageConfidence(avgConf);
        
        // Extract confidence scores from B-factors for prediction data
        const confidenceScores: number[] = [];
        const lines = pdbData.split('\n');
        for (const line of lines) {
          if (line.startsWith('ATOM')) {
            const bFactor = parseFloat(line.substring(60, 66).trim());
            if (!isNaN(bFactor) && !confidenceScores.includes(bFactor)) {
              confidenceScores.push(bFactor);
            }
          }
        }
        
        // Create a prediction data object
        const predictionData = convertESMFoldToPredictionData(pdbData, confidenceScores);
        
        // Add predicted polymer representations if needed
        if (predictionData.structure.scores.plddt && predictionData.structure.scores.plddt.length > 0) {
          const predictedReps = await addPredictedPolymerRepresentation(
            pluginRef.current,
            predictionData,
            structure
          );
          setPredictedPolymerRepresentations(predictedReps);
        }
        
        // Clean up the blob URL
        URL.revokeObjectURL(url);
      } else {
        // Load from PDB ID
        const url = `https://files.rcsb.org/download/${id}.cif`;
        
        // Use the modular function to load structure
        const [model, structureObj, polymerRepresentations] = await loadStructureIntoMolstar(
          pluginRef.current, 
          url,
          structureTransparency
        );
        
        structure = structureObj;
        polymerReps = polymerRepresentations;
        setPolymerRepresentations(polymerRepresentations);
        
        setStructureSource("pdb");
        
        // If in docking view or focusLigand is true, add ligand representation
        if (focusLigand || viewType === 'docking') {
          try {
            // Create ligand representations
            await createLigandRepresentations(pluginRef.current, structure);
            
            // Focus on ligands
            await focusOnSecondLoadedStructure(pluginRef.current);
          } catch (ligandError) {
            console.error('Failed to focus on ligand:', ligandError);
            // If ligand focus fails, just reset the camera to show the whole structure
            await PluginCommands.Camera.Reset(pluginRef.current, {});
          }
        } else {
          // Auto-focus the structure
          await PluginCommands.Camera.Reset(pluginRef.current, {});
        }
      }
      
      // Update the polymer view to show the current representation
      updatePolymerView(
        currentPolymerView,
        pluginRef.current,
        polymerReps,
        predictedPolymerRepresentations,
        showConfidentResidues
      );
      
      // Apply coloring if needed
      if (currentColorType !== PolymerColorType.White) {
        // Create a minimal prediction data object for coloring
        const predictionData: PredictionData = {
          structure: {
            indices: [], // Would need to be populated from actual data
            scores: {
              plddt: [] // Would need to be populated from actual data
            },
            regions: []
          },
          pockets: []
        };
        
        await overPaintPolymer(
          currentColorType,
          pluginRef.current,
          predictionData,
          polymerReps,
          predictedPolymerRepresentations,
          pocketRepresentations
        );
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
      // Map style string to PolymerViewType
      let viewType: PolymerViewType;
      switch (style) {
        case 'cartoon':
          viewType = PolymerViewType.Cartoon;
          break;
        case 'spacefill':
        case 'licorice':
          viewType = PolymerViewType.Atoms;
          break;
        case 'surface':
          viewType = PolymerViewType.Gaussian_Surface;
          break;
        default:
          viewType = PolymerViewType.Cartoon;
      }
      
      // Update the current polymer view
      setCurrentPolymerView(viewType);
      
      // Update the view using the advanced function
      updatePolymerView(
        viewType,
        pluginRef.current,
        polymerRepresentations,
        predictedPolymerRepresentations,
        showConfidentResidues
      );
    } catch (error) {
      console.error('Style change error:', error);
    }
  };

  // Handle color scheme changes
  const handleColorChange = async (colorScheme: string) => {
    if (!pluginRef.current) return;

    try {
      // Map color scheme string to PolymerColorType
      let colorType: PolymerColorType;
      switch (colorScheme) {
        case 'chainname':
          colorType = PolymerColorType.Chain;
          break;
        case 'residueindex':
          colorType = PolymerColorType.Residue;
          break;
        case 'atomindex':
          colorType = PolymerColorType.Element;
          break;
        case 'bfactor':
          colorType = PolymerColorType.AlphaFold;
          break;
        default:
          colorType = PolymerColorType.White;
      }
      
      // Update the current color type
      setCurrentColorType(colorType);
      
      // Create a minimal prediction data object for coloring
      const predictionData: PredictionData = {
        structure: {
          indices: [], // Would need to be populated from actual data
          scores: {
            plddt: [] // Would need to be populated from actual data
          },
          regions: []
        },
        pockets: []
      };
      
      // Apply the color using the advanced function
      await overPaintPolymer(
        colorType,
        pluginRef.current,
        predictionData,
        polymerRepresentations,
        predictedPolymerRepresentations,
        pocketRepresentations
      );
    } catch (error) {
      console.error('Color change error:', error);
    }
  };

  // Handle transparency changes
  const handleTransparencyChange = async (value: number) => {
    if (!pluginRef.current) return;
    
    try {
      // Update the transparency state
      setStructureTransparency(value);
      
      // Apply transparency using the advanced function
      await setStructureTransparency(
        pluginRef.current,
        value,
        polymerRepresentations
      );
    } catch (error) {
      console.error('Transparency change error:', error);
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

  // Toggle additional viewer controls
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [showFog, setShowFog] = useState(true);
  const [showClipping, setShowClipping] = useState(false);
  
  // Toggle viewer settings
  const toggleAxes = async () => {
    if (!pluginRef.current) return;
    try {
      await pluginRef.current.canvas3d?.setProps({ camera: { helper: { axes: showAxes ? 'off' : 'on' } } });
      setShowAxes(!showAxes);
    } catch (error) {
      console.error('Toggle axes error:', error);
    }
  };
  
  const toggleBoundingBox = async () => {
    if (!pluginRef.current) return;
    try {
      await pluginRef.current.canvas3d?.setProps({ camera: { helper: { boundingBox: showBoundingBox ? 'off' : 'on' } } });
      setShowBoundingBox(!showBoundingBox);
    } catch (error) {
      console.error('Toggle bounding box error:', error);
    }
  };
  
  const toggleFog = async () => {
    if (!pluginRef.current) return;
    try {
      await pluginRef.current.canvas3d?.setProps({ cameraFog: { name: showFog ? 'off' : 'on' } });
      setShowFog(!showFog);
    } catch (error) {
      console.error('Toggle fog error:', error);
    }
  };
  
  const toggleClipping = async () => {
    if (!pluginRef.current) return;
    try {
      await pluginRef.current.canvas3d?.setProps({ cameraClipping: { far: showClipping ? 100 : 1 } });
      setShowClipping(!showClipping);
    } catch (error) {
      console.error('Toggle clipping error:', error);
    }
  };
  
  // Toggle confident residues
  const toggleConfidentResidues = () => {
    setShowConfidentResidues(!showConfidentResidues);
    if (pluginRef.current) {
      updatePolymerView(
        currentPolymerView,
        pluginRef.current,
        polymerRepresentations,
        predictedPolymerRepresentations,
        !showConfidentResidues
      );
    }
  };
  
  // Focus on ligand
  const focusOnLigand = async () => {
    if (!pluginRef.current) return;
    try {
      await focusOnSecondLoadedStructure(pluginRef.current);
    } catch (error) {
      console.error('Focus on ligand error:', error);
      // If ligand focus fails, reset the camera view
      await PluginCommands.Camera.Reset(pluginRef.current, {});
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 border-b px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {viewType !== "prediction" && (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                value={pdbId}
                onChange={(e) => setPdbId(e.target.value)}
                placeholder="PDB ID"
                className="w-24 sm:w-32 h-8 text-xs"
              />
              <Button type="submit" variant="outline" size="sm" className="h-8 text-xs">
                Load
              </Button>
            </form>
          )}
          
          <Select 
            defaultValue={
              currentPolymerView === PolymerViewType.Cartoon ? "cartoon" :
              currentPolymerView === PolymerViewType.Atoms ? "licorice" :
              "surface"
            } 
            onValueChange={handleStyleChange}
          >
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
          
          <Select 
            defaultValue={
              currentColorType === PolymerColorType.Chain ? "chainname" :
              currentColorType === PolymerColorType.Residue ? "residueindex" :
              currentColorType === PolymerColorType.Element ? "atomindex" :
              currentColorType === PolymerColorType.AlphaFold ? "bfactor" :
              "chainname"
            } 
            onValueChange={handleColorChange}
          >
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
          {(viewType === "docking" || focusLigand) && (
            <Button variant="outline" size="sm" onClick={focusOnLigand} className="h-8 text-xs">
              Focus Ligand
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleResetView} className="h-8 text-xs">Reset</Button>
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
          
          {/* New transparency slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs">Transparency:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={structureTransparency}
              onChange={(e) => handleTransparencyChange(parseFloat(e.target.value))}
              className="w-24"
            />
          </div>
          
          {/* Confident residues toggle for predictions */}
          {structureSource === "prediction" && predictedPolymerRepresentations.length > 0 && (
            <Button
              variant={showConfidentResidues ? "default" : "outline"}
              size="sm"
              onClick={toggleConfidentResidues}
              className="h-8 text-xs"
            >
              {showConfidentResidues ? "All Residues" : "Confident Only"}
            </Button>
          )}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row flex-1">
        <div className="flex-1 h-[300px] md:h-full bg-black/5 relative">
          <div 
            ref={viewerRef} 
            className="absolute inset-0"
          />
        </div>
        
        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l flex-shrink-0 bg-background">
          <Tabs defaultValue={viewType === "prediction" ? "predict" : "info"} className="h-full flex flex-col">
            <TabsList className="grid grid-cols-3 mx-4 mt-4">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="predict">Predict</TabsTrigger>
              {viewType === "docking" && <TabsTrigger value="ligand">Ligand</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="info" className="flex-1 overflow-auto">
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Structure Information</h3>
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <div className="font-medium">Source:</div>
                      <div>{structureSource === "prediction" ? "Prediction" : "PDB"}</div>
                      
                      {structureSource !== "prediction" && (
                        <>
                          <div className="font-medium">PDB ID:</div>
                          <div>{pdbId.toUpperCase()}</div>
                        </>
                      )}
                      
                      <div className="font-medium">View Type:</div>
                      <div className="capitalize">{viewType}</div>
                      
                      {structureSource === "prediction" && averageConfidence !== null && (
                        <>
                          <div className="font-medium">Avg. Confidence:</div>
                          <div>{averageConfidence.toFixed(1)}</div>
                        </>
                      )}
                    </div>
                    
                    {structureSource === "prediction" && averageConfidence !== null && (
                      <div className="mt-4 space-y-1">
                        <div className="h-3 w-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-full" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Low</span>
                          <span>Medium</span>
                          <span>High</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium">Controls</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><span className="font-medium">Mouse:</span> Rotate structure</p>
                    <p><span className="font-medium">Scroll:</span> Zoom in/out</p>
                    <p><span className="font-medium">Shift+Mouse:</span> Pan view</p>
                    <p><span className="font-medium">Ctrl+Mouse:</span> Rotate in plane</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="predict" className="flex-1 overflow-auto">
              {renderSequenceInput()}
            </TabsContent>
            
            {viewType === "docking" && (
              <TabsContent value="ligand" className="flex-1 overflow-auto">
                {renderLigandViewer()}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DemoMoleculeViewer;
