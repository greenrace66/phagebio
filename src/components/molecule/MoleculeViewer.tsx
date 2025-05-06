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
import * as NGL from "ngl";
import { validateSequence, cleanSequence, predictStructure } from "@/utils/proteinApi";

interface MoleculeViewerProps {
  initialStyle?: string;
  pdb?: string;
}

const MoleculeViewer = ({ 
  initialStyle = "cartoon",
  pdb
}: MoleculeViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
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

  useEffect(() => {
    if (!viewerRef.current) return;

    // Initialize NGL Stage
    const stage = new NGL.Stage(viewerRef.current, { backgroundColor: "white" });
    stageRef.current = stage;

    if (pdb) {
      loadStructure(pdb);
    }

    // Handle window resize
    const handleResize = () => {
      stage.handleResize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stage.dispose();
    };
  }, [pdb]);

  const calculateAverageConfidence = (component: any) => {
    if (!component) return null;
    
    let totalBfactor = 0;
    let atomCount = 0;
    
    component.structure.eachAtom((atom: any) => {
      totalBfactor += atom.bfactor;
      atomCount++;
    });
    
    return atomCount > 0 ? totalBfactor / atomCount : null;
  };

  const loadStructure = async (pdbData: string) => {
    if (!stageRef.current) return;
    
    try {
      // Clear existing structures
      stageRef.current.removeAllComponents();
      
      const component = await stageRef.current.loadFile(
        new Blob([pdbData], {type: 'text/plain'}),
        { ext: 'pdb' }
      );
      
      // Calculate average confidence
      const avgConf = calculateAverageConfidence(component);
      setAverageConfidence(avgConf);
      
      component.addRepresentation(initialStyle, {
        color: 'bfactor'
      });
      component.autoView();
      
      setStructureSource("prediction");
      toast({
        title: "Structure loaded",
        description: "Successfully loaded predicted structure",
      });
    } catch (error) {
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
  const handleStyleChange = (style: string) => {
    const component = stageRef.current?.compList[0];
    if (!component) return;

    component.removeAllRepresentations();
    component.addRepresentation(style, {
      color: 'bfactor'
    });
  };

  // Handle color scheme changes
  const handleColorChange = (colorScheme: string) => {
    const component = stageRef.current?.compList[0];
    if (!component) return;

    const currentRepresentation = component.reprList[0];
    if (currentRepresentation) {
      currentRepresentation.setParameters({ color: colorScheme });
    }
  };

  // Reset view
  const handleResetView = () => {
    const component = stageRef.current?.compList[0];
    if (component) {
      component.autoView();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 border-b px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select defaultValue="cartoon" onValueChange={handleStyleChange}>
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
          
          <Select defaultValue="bfactor" onValueChange={handleColorChange}>
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
