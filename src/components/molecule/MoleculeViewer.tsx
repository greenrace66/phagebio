
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
  initialPdbId?: string;
  initialStyle?: string;
  initialColor?: string;
}

const MoleculeViewer = ({ 
  initialPdbId = "1crn",
  initialStyle = "cartoon",
  initialColor = "chainname"
}: MoleculeViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [pdbId, setPdbId] = useState(initialPdbId);
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

  useEffect(() => {
    if (!viewerRef.current) return;

    // Initialize NGL Stage
    const stage = new NGL.Stage(viewerRef.current, { backgroundColor: "white" });
    stageRef.current = stage;

    // Load the protein structure with initial style
    loadStructure(initialPdbId);

    // Handle window resize
    const handleResize = () => {
      stage.handleResize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stage.dispose();
    };
  }, [initialPdbId]);

  const loadStructure = async (id: string, pdbData?: string) => {
    if (!stageRef.current) return;
    
    try {
      // Clear existing structures
      stageRef.current.removeAllComponents();
      
      let component;
      if (pdbData) {
        component = await stageRef.current.loadFile(
          new Blob([pdbData], {type: 'text/plain'}),
          { ext: 'pdb' }
        );
        setStructureSource("prediction");
      } else {
        component = await stageRef.current.loadFile(`rcsb://${id}`);
        setStructureSource("pdb");
      }
      
      component.addRepresentation(initialStyle, {
        color: initialColor
      });
      component.autoView();
      
      toast({
        title: "Structure loaded",
        description: pdbData 
          ? "Successfully loaded predicted structure" 
          : `Successfully loaded PDB ID: ${id}`,
      });
    } catch (error) {
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
        loadStructure("", result.data);
        
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
    if (!prediction.pdbData) return;
    
    const blob = new Blob([prediction.pdbData], { type: 'text/plain' });
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
      color: stageRef.current.parameters.colorScheme
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
      <div className="bg-muted/30 border-b px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={pdbId}
            onChange={(e) => setPdbId(e.target.value)}
            placeholder="Enter PDB ID"
            className="w-32"
          />
          <Button type="submit" variant="outline" size="sm">Load</Button>
        </form>
        
        <div className="flex items-center space-x-2">
          <Select defaultValue="cartoon" onValueChange={handleStyleChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cartoon">Cartoon</SelectItem>
              <SelectItem value="spacefill">Sphere</SelectItem>
              <SelectItem value="licorice">Stick</SelectItem>
              <SelectItem value="surface">Surface</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="chainname" onValueChange={handleColorChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chainname">Chain</SelectItem>
              <SelectItem value="residueindex">Residue</SelectItem>
              <SelectItem value="atomindex">Atom</SelectItem>
              <SelectItem value="bfactor">B-factor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleResetView}>Reset View</Button>
          <Button variant="outline" size="sm" onClick={() => stageRef.current?.makeImage()}>Take Screenshot</Button>
          {prediction.pdbData && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadPrediction}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex flex-1">
        <div className="flex-1 h-full bg-black/5 relative">
          <div 
            ref={viewerRef} 
            className="absolute inset-0"
          />
        </div>
        
        <div className="w-64 border-l flex-shrink-0 bg-background">
          <div className="p-4 text-sm">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Protein Information</h4>
                <p className="text-muted-foreground">
                  {structureSource === "prediction" 
                    ? "Predicted Structure" 
                    : "PDB Structure"}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Chains</h4>
                {structureSource === "prediction" ? (
                  <p className="text-muted-foreground">Chain A (Predicted)</p>
                ) : (
                  <>
                    <p className="text-muted-foreground">Chain A: 250 residues</p>
                    <p className="text-muted-foreground">Chain B: 230 residues</p>
                  </>
                )}
              </div>
              
              <div>
                <h4 className="font-medium mb-1">
                  {structureSource === "prediction" ? "Confidence" : "Resolution"}
                </h4>
                {structureSource === "prediction" ? (
                  prediction.confidence ? (
                    <p className="text-muted-foreground">
                      {(prediction.confidence * 100).toFixed(1)}% estimated
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Not available</p>
                  )
                ) : (
                  <p className="text-muted-foreground">2.1 Å</p>
                )}
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Source</h4>
                {structureSource === "prediction" ? (
                  <div className="flex items-center text-muted-foreground">
                    <FileText className="h-3 w-3 mr-1" />
                    ESMFold Prediction
                  </div>
                ) : (
                  <p className="text-muted-foreground">PDB ID: {pdbId}</p>
                )}
              </div>
              
              {structureSource === "prediction" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={downloadPrediction}
                >
                  <Download className="w-4 h-4 mr-1" />
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
