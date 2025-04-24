import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as NGL from "ngl";

const MoleculeViewer = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Initialize NGL Stage
    const stage = new NGL.Stage(viewerRef.current, { backgroundColor: "white" });
    stageRef.current = stage;

    // Load a sample protein (PDB ID: 1CRN - Crambin)
    stage.loadFile("rcsb://1crn").then((component: any) => {
      component.addRepresentation("cartoon", {
        color: "chainname"
      });
      component.autoView();
    });

    // Handle window resize
    const handleResize = () => {
      stage.handleResize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stage.dispose();
    };
  }, []);

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
          <Button variant="outline" size="sm">Download</Button>
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
          <Tabs defaultValue="info">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
              <TabsTrigger value="analysis" className="flex-1">Analysis</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="p-4 text-sm">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Protein Information</h4>
                  <p className="text-muted-foreground">Sample Protein Structure</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Chains</h4>
                  <p className="text-muted-foreground">Chain A: 250 residues</p>
                  <p className="text-muted-foreground">Chain B: 230 residues</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Resolution</h4>
                  <p className="text-muted-foreground">2.1 Å</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Source</h4>
                  <p className="text-muted-foreground">PDB ID: 1ABC</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="analysis" className="p-4 text-sm">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Detected Pockets</h4>
                  <p className="text-muted-foreground">3 potential binding sites found</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-medium">Pocket 1</h4>
                  <p className="text-muted-foreground">Volume: 350 Å³</p>
                  <p className="text-muted-foreground">Key residues: ARG45, GLU62, ASP78</p>
                  <Button size="sm" variant="outline" className="mt-1 w-full">Highlight</Button>
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-medium">Pocket 2</h4>
                  <p className="text-muted-foreground">Volume: 280 Å³</p>
                  <p className="text-muted-foreground">Key residues: TYR120, PHE124, LEU210</p>
                  <Button size="sm" variant="outline" className="mt-1 w-full">Highlight</Button>
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-medium">Pocket 3</h4>
                  <p className="text-muted-foreground">Volume: 210 Å³</p>
                  <p className="text-muted-foreground">Key residues: HIS33, SER56, ASP102</p>
                  <Button size="sm" variant="outline" className="mt-1 w-full">Highlight</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MoleculeViewer;
