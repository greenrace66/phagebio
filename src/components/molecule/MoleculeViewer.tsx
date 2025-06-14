// @ts-nocheck
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
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { validateSequence, cleanSequence, predictStructure } from "@/utils/proteinApi";
import { StructureRepresentation3D } from 'molstar/lib/mol-repr/structure/representation3d';
import { Structure } from 'molstar/lib/mol-model/structure';
import { StateObjectRef, StateObjectCell } from "molstar/lib/mol-state";


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

  // Toggle additional viewer controls
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  useEffect(() => {
    if (!viewerRef.current) return;

    const initMolstar = async () => {
      try {
        // Create canvas element
        const canvas = document.createElement('canvas');
        if (viewerRef.current) {
            viewerRef.current.innerHTML = ''; // Clear previous viewer
            viewerRef.current.appendChild(canvas);
        }

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
        
        if (viewerRef.current) { // Check again before calling initViewer
            plugin.initViewer(canvas, viewerRef.current);
        }
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
  }, [pdb]); // Removed toast from dependencies as it's stable

  const calculateAverageConfidence = (structureData: Structure | undefined) => {
    if (!structureData) return null;
    
    let totalBfactor = 0;
    let atomCount = 0;
    
    // Iterate through structure units and atoms
    for (const unit of structureData.units) {
      const { elements } = unit; // Assuming elements is an array of indices
      const bFactors = unit.model.atomicConformation.B_iso_or_equiv; // This is correct
      
      // Check if elements is a valid array-like object with length
      if (elements && typeof elements.length === 'number') {
          for (let i = 0; i < elements.length; i++) {
            // elements[i] is the index of the atom in the unit's atomic arrays
            // bFactors is a FunctionChain, so value(index) gets the B-factor
            totalBfactor += bFactors.value(elements[i]);
            atomCount++;
          }
      }
    }
    
    return atomCount > 0 ? totalBfactor / atomCount : null;
  };

  const loadStructure = async (pdbData: string) => {
    if (!pluginRef.current) return;
    
    try {
      // Clear existing structures
      await pluginRef.current.clear();
      
      // Load from PDB string data
      const data = await pluginRef.current.builders.data.rawData({
        data: pdbData,
        label: 'Predicted Structure'
      });
      const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'pdb');
      const model = await pluginRef.current.builders.structure.createModel(trajectory);
      const structure = await pluginRef.current.builders.structure.createStructure(model); // structure is StateObjectRef<Structure>
      
      // Calculate average confidence
      if (structure.cell?.obj?.data) { // Ensure data is available
        const avgConf = calculateAverageConfidence(structure.cell.obj.data);
        setAverageConfidence(avgConf);
      } else {
        setAverageConfidence(null);
      }
      
      // Apply representation with bfactor coloring for predictions
      const reprType = initialStyle === 'cartoon' ? 'cartoon' : 
                      initialStyle === 'spacefill' ? 'spacefill' :
                      initialStyle === 'licorice' ? 'ball-and-stick' : 'cartoon';
      
      await pluginRef.current.builders.structure.representation.addRepresentation(structure, {
        type: reprType,
        colorTheme: { name: 'atom-test' } // pLDDT
      });
      
      // Auto-focus the structure
      await PluginCommands.Camera.Reset(pluginRef.current, {});
      
      setStructureSource("prediction");
      toast({
        title: "Structure loaded",
        description: "Successfully loaded predicted structure",
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
    setAverageConfidence(null); // Reset confidence
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 1000);
      
      const result = await predictStructure(sequence, apiKey, "esmfold"); // Assuming esmfold for this component
      
      clearInterval(progressInterval);
      
      if (result.success && result.data) {
        setProgress(100);
        setPrediction({
          pdbData: result.data,
          // confidence: result.confidence, // If API provides confidence
          confidence: null // Placeholder
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
    const currentPdbData = pdb || prediction.pdbData;
    if (!currentPdbData) return;
    
    const blob = new Blob([currentPdbData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'predicted_structure.pdb';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download Started", description: "Predicted PDB file is downloading." });
  };

  // Handle style changes
  const handleStyleChange = async (style: string) => {
    if (!pluginRef.current) return;

    try {
      const state = pluginRef.current.state.data;
      const structures = pluginRef.current.managers.structure.hierarchy.current.structures;
      if (structures.length === 0) return;

      const structureRef = structures[0];
      if (!structureRef || !structureRef.ref) return;

      // Ensure we have the StateObjectCell for the structure
      const structureCell = state.cells.get(structureRef.ref) as StateObjectCell<Structure> | undefined;
      if (!structureCell || !structureCell.obj?.data) {
          console.error("Could not find valid structure cell for ref:", structureRef.ref);
          toast({ title: "Error", description: "Failed to apply style: Structure not found.", variant: "destructive" });
          return;
      }
      
      // Remove existing representations for this structure
      const existingRepresentations = state.selectQ(q => 
        q.rootRef(structureCell.transform.ref) // Representations are children of the structure
         .ofType(StructureRepresentation3D)
      );
      
      const update = state.build();
      for (const repr of existingRepresentations) {
        update.delete(repr.transform.ref);
      }
      await update.commit();


      // Add new representation
      const reprType = style === 'cartoon' ? 'cartoon' : 
                      style === 'spacefill' ? 'spacefill' :
                      style === 'licorice' ? 'ball-and-stick' : 'cartoon';
      
      let colorThemeName;
      if (structureSource === 'prediction') {
        colorThemeName = 'atom-test'; // pLDDT for predictions
      } else {
        // For PDB structures, ideally get current color from UI or default
        colorThemeName = 'chain-id'; // Defaulting, or get from a state if color select exists
      }
      
      await pluginRef.current.builders.structure.representation.addRepresentation(
        structureCell, // Pass the StateObjectCell
        {
          type: reprType,
          colorTheme: { name: colorThemeName }
        }
      );
    } catch (error) {
      console.error('Style change error:', error);
      toast({ title: "Error", description: "Failed to change style.", variant: "destructive" });
    }
  };

  // Handle color scheme changes
  const handleColorChange = async (colorScheme: string) => {
    if (!pluginRef.current) return;
    
    try {
      const state = pluginRef.current.state.data;
      const reprs = state.selectQ(q => q.ofType(StructureRepresentation3D));
      if (reprs.length === 0) return;

      let colorThemeName;
      if (structureSource === 'prediction') {
        // For predictions, pLDDT (atom-test) is often preferred if the selected scheme is bfactor-like
        // If the user explicitly selects something else, allow it, but default to atom-test for 'bfactor'
        colorThemeName = (colorScheme === 'bfactor' || colorScheme === 'plddt') ? 'atom-test' :
                         colorScheme === 'chainname' ? 'chain-id' :
                         colorScheme === 'residueindex' ? 'residue-name' : // Molstar uses 'residue-name' for by residue index
                         colorScheme === 'atomindex' ? 'element-symbol' : 'atom-test';
      } else {
        // For PDB structures, map as before
        switch (colorScheme) {
          case 'chainname': colorThemeName = 'chain-id'; break;
          case 'residueindex': colorThemeName = 'residue-name'; break;
          case 'atomindex': colorThemeName = 'element-symbol'; break;
          case 'bfactor': colorThemeName = 'atom-test'; break; // b-factor or pLDDT
          default: colorThemeName = 'chain-id';
        }
      }

      const update = state.build();
      let changed = false;
      for (const repr of reprs) {
        const currentParams = repr.params?.values;
        if (currentParams && currentParams.type && currentParams.type.params) {
          const newTypeParams = {
            ...currentParams.type.params,
            colorTheme: { name: colorThemeName, params: {} }
          };
          const newRepresentationParams = { 
            ...currentParams, 
            type: { ...currentParams.type, params: newTypeParams } 
          };
          update.to(repr.transform.ref).update(newRepresentationParams);
          changed = true;
        }
      }

      if (changed) {
        await update.commit({ doNotUpdateCurrent: true });
         toast({ title: "Color Updated", description: `Color scheme changed to ${colorScheme}.` });
      }
    } catch (error) {
      console.error('Color change error:', error);
      toast({ title: "Error", description: "Failed to change color scheme.", variant: "destructive" });
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
              <SelectItem value="bfactor">pLDDT/B-factor</SelectItem>
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
              className="h-8 text-xs" // Ensure consistent button height
            >
              <Download className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Prediction Input Section (conditionally rendered or part of a tab) */}
      {/* This component seems designed for viewing a single PDB or prediction,
          If prediction input is needed, it would typically be separate or in a tab.
          For simplicity, I'll assume this component is primarily for viewing a passed `pdb` prop
          or a structure predicted elsewhere and then loaded.
          If prediction input is desired within THIS component, it needs a dedicated UI section.
          The existing `handlePrediction` function suggests it might be intended.
          Let's add a simple way to trigger prediction if sequence & API key are set.
      */}

      {/* Example: Minimal Prediction UI if showAdvancedControls is true */}
      {showAdvancedControls && (
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium mb-2">Predict Structure</h3>
          <form onSubmit={handlePrediction} className="space-y-2">
            <Input
              type="text"
              placeholder="NVIDIA API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-xs h-8"
              disabled={predicting}
            />
            <Textarea
              placeholder="Enter protein sequence (FASTA or raw)"
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              className="min-h-[80px] font-mono text-xs"
              disabled={predicting}
            />
            <Button size="sm" type="submit" disabled={predicting || !sequence.trim() || !apiKey.trim()} className="text-xs h-8">
              {predicting ? <><Loader className="mr-2 h-3 w-3 animate-spin" /> Predicting...</> : "Predict"}
            </Button>
            {predicting && progress > 0 && <Progress value={progress} className="h-1 mt-2" />}
          </form>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row flex-1 min-h-0"> {/* Added min-h-0 */}
        <div className="flex-1 h-[300px] md:h-full bg-black/5 relative">
          <div 
            ref={viewerRef} 
            className="absolute inset-0"
          />
           {/* Loading/empty state message */}
           {(!pdb && !prediction.pdbData && !pluginRef.current?.state.data.tree.root.obj?.data) && (
             <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
               No structure loaded. Use controls above to predict or load a PDB.
             </div>
           )}
        </div>
        
        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l flex-shrink-0 bg-background">
          <div className="p-3 md:p-4 text-xs md:text-sm">
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:space-y-4 md:gap-0">
              <div>
                <h4 className="font-medium mb-1 text-xs md:text-sm">Protein Information</h4>
                <p className="text-muted-foreground">
                  {structureSource === "prediction" 
                    ? "Predicted Structure" 
                    : pdb ? "PDB Structure" : "N/A"}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1 text-xs md:text-sm">Confidence (pLDDT)</h4>
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
                    Predicted (e.g., ESMFold)
                  </div>
                ) : pdb ? (
                  <p className="text-muted-foreground">PDB Database</p>
                ) : (
                   <p className="text-muted-foreground">N/A</p>
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
