import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Loader } from "lucide-react";
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
  convertESMFoldToPredictionData,
  PolymerViewType,
  PolymerColorType,
  PolymerRepresentation,
  PocketRepresentation,
  PredictionData
} from '@/utils/molstar';

interface MoleculeViewerProps {
  initialStyle?: string;
  pdb?: string;
}

const MoleculeViewer = ({ 
  initialStyle = "cartoon",
  pdb
}: MoleculeViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginContext | null>(null);
  const { toast } = useToast();
  
  // Structure prediction states
  const [sequence, setSequence] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [structureSource, setStructureSource] = useState<"pdb" | "prediction">("pdb");
  const [prediction, setPrediction] = useState<{
    pdbData: string | null;
    confidence: number | null;
  }>({ pdbData: null, confidence: null });
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
  const [currentColorType, setCurrentColorType] = useState<PolymerColorType>(PolymerColorType.White);
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
            }
          }
        };
        const plugin = new PluginContext(spec);
        await plugin.init();
        plugin.initViewer(canvas, viewerRef.current);
        pluginRef.current = plugin;

        if (pdb) {
          loadStructure(pdb);
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
  }, [pdb]);

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

  const loadStructure = async (pdbData: string) => {
    if (!pluginRef.current) return;
    
    try {
      // Clear existing structures
      await pluginRef.current.clear();
      
      // Create a blob URL for the PDB data
      const blob = new Blob([pdbData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Load structure using the advanced function
      const [model, structure, polymerReps] = await loadStructureIntoMolstar(
        pluginRef.current, 
        url,
        structureTransparency
      );
      
      // Store the polymer representations
      setPolymerRepresentations(polymerReps);
      
      // Calculate average confidence
      const avgConf = calculateAverageConfidence(structure.data);
      setAverageConfidence(avgConf);
      
      // If this is a prediction, create predicted polymer representations
      if (structureSource === "prediction" && pdbData) {
        // Extract confidence scores from B-factors
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
      }
      
      // Update the polymer view to show the current representation
      updatePolymerView(
        currentPolymerView,
        pluginRef.current,
        polymerReps,
        predictedPolymerRepresentations,
        showConfidentResidues
      );
      
      // Auto-focus the structure
      await PluginCommands.Camera.Reset(pluginRef.current, {});
      
      // Clean up the blob URL
      URL.revokeObjectURL(url);
      
      setStructureSource("prediction");
      toast({
        title: "Structure loaded",
        description: "Successfully loaded structure",
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

  // Handle protein sequence submission for structure prediction
  const handlePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your NVIDIA API key.",
        variant: "destructive",
      });
      return;
    }
    
    if (!sequence || !validateSequence(sequence)) {
      toast({
        title: "Invalid Sequence",
        description: "Please enter a valid protein sequence.",
        variant: "destructive",
      });
      return;
    }
    
    setPredicting(true);
    setProgress(10);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 1000);
      
      const result = await predictStructure(sequence, apiKey);
      
      clearInterval(progressInterval);
      
      if (result.success && result.data) {
        setProgress(100);
        setPrediction({
          pdbData: result.data,
          confidence: 0.85 // This would ideally come from the API
        });
        
        // Load the predicted structure
        loadStructure(result.data);
        
        toast({
          title: "Prediction Complete",
          description: "Structure prediction successful!",
        });
      } else {
        setProgress(0);
        toast({
          title: "Prediction Failed",
          description: result.error || "Failed to predict structure.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setProgress(0);
      toast({
        title: "Error",
        description: "An unexpected error occurred during prediction.",
        variant: "destructive",
      });
    } finally {
      setPredicting(false);
    }
  };
  
  // Download predicted structure
  const downloadPrediction = () => {
    const pdbData = pdb || prediction.pdbData;
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
  
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 border-b px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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
              "bfactor"
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
          <Button variant="outline" size="sm" onClick={handleResetView} className="h-8 text-xs">Reset</Button>
          {(pdb || prediction.pdbData) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadPrediction}
            >
              <Download className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}
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
          <div className="p-3 md:p-4 text-xs md:text-sm">
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:space-y-4 md:gap-0">
              <div>
                <h4 className="font-medium mb-1 text-xs md:text-sm">Protein Information</h4>
                <p className="text-muted-foreground">
                  {structureSource === "prediction" 
                    ? "Predicted Structure" 
                    : "PDB Structure"}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1 text-xs md:text-sm">Confidence</h4>
                {averageConfidence !== null ? (
                  <div className="space-y-1 md:space-y-2">
                    <p className="text-muted-foreground">
                      Average: {averageConfidence.toFixed(1)}
                    </p>
                    <div className="h-3 md:h-4 w-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-full" />
                    <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Not available</p>
                )}
              </div>
              
              <div>
                <h4 className="font-medium mb-1 text-xs md:text-sm">Source</h4>
                {structureSource === "prediction" ? (
                  <div className="flex items-center text-muted-foreground">
                    <FileText className="h-3 w-3 mr-1" />
                    ESMFold Prediction
                  </div>
                ) : (
                  <p className="text-muted-foreground">PDB Structure</p>
                )}
              </div>
              
              {(pdb || prediction.pdbData) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full col-span-2 md:col-span-1 mt-1 md:mt-0 h-8 text-xs"
                  onClick={downloadPrediction}
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Download Structure
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoleculeViewer;
