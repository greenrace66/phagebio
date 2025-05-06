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
import * as NGL from "ngl";
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
  const stageRef = useRef<any>(null);
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

    // Initialize NGL Stage
    const stage = new NGL.Stage(viewerRef.current, { backgroundColor: "white" });
    stageRef.current = stage;

    // Load the protein structure with initial style for non-prediction views
    if (viewType !== "prediction") {
      loadStructure(initialPdbId);
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
  }, [initialPdbId, viewType]);

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
        
        // Calculate average confidence for predicted structures
        const avgConf = calculateAverageConfidence(component);
        setAverageConfidence(avgConf);
        
        // Use bfactor coloring for predictions
        component.addRepresentation(initialStyle, { color: 'bfactor' });
      } else {
        component = await stageRef.current.loadFile(`rcsb://${id}`);
        setStructureSource("pdb");
        component.addRepresentation(initialStyle, { color: initialColor });
      }
      
      if (focusLigand) {
        // Highlight ligand atoms only
        component.addRepresentation('ball+stick', { sele: 'hetero' });
        component.autoView('hetero');
      } else {
        component.autoView();
      }
      
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

  // Render 3D ligand view for docking tab
  const renderLigandViewer = () => {
    const ligandViewerRef = useRef<HTMLDivElement>(null);
    const ligandStageRef = useRef<any>(null);
    
    useEffect(() => {
      if (!ligandViewerRef.current) return;
      
      // Initialize NGL Stage for ligand
      const stage = new NGL.Stage(ligandViewerRef.current, { backgroundColor: "white" });
      ligandStageRef.current = stage;
      
      // Load the protein structure but only show ligand
      const loadLigand = async () => {
        try {
          const component = await stage.loadFile(`rcsb://${initialPdbId}`);
          // Only show ligand (hetero atoms)
          if (component) {
            component.addRepresentation('ball+stick', { 
              sele: 'hetero and not water',
              scale: 0.8
            });
            component.autoView();
          }
        } catch (error) {
          console.error("Failed to load ligand:", error);
        }
      };
      
      loadLigand();
      
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
              <SelectItem value="spacefill">Sphere</SelectItem>
              <SelectItem value="licorice">Stick</SelectItem>
              <SelectItem value="surface">Surface</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue={initialColor} onValueChange={handleColorChange}>
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
          <Button variant="outline" size="sm" onClick={downloadPrediction}>Download</Button>
        </div>
      </div>
      
      <div className="flex flex-1">
        {viewType === "docking" ? (
          <div className="flex flex-col md:flex-row w-full">
            <div className="w-full md:w-1/2 md:border-r border-b md:border-b-0">
              {renderLigandViewer()}
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
