
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

const MoleculeViewer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const setDimensions = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    
    setDimensions();
    window.addEventListener('resize', setDimensions);

    // Draw a simple molecule placeholder
    const drawMolecule = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set the center of canvas
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.3;
      
      // Draw atoms (circles)
      const atoms = [
        { x: centerX, y: centerY, color: '#0c8de8', r: 20 },
        { x: centerX + radius * 0.7, y: centerY, color: '#15b594', r: 15 },
        { x: centerX - radius * 0.7, y: centerY, color: '#0c8de8', r: 15 },
        { x: centerX, y: centerY + radius * 0.7, color: '#15b594', r: 15 },
        { x: centerX, y: centerY - radius * 0.7, color: '#0c8de8', r: 15 },
      ];
      
      // Draw bonds (lines)
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#888';
      
      atoms.slice(1).forEach(atom => {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(atom.x, atom.y);
        ctx.stroke();
      });
      
      // Draw atoms
      atoms.forEach(atom => {
        ctx.beginPath();
        ctx.arc(atom.x, atom.y, atom.r, 0, Math.PI * 2);
        ctx.fillStyle = atom.color;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(atom.x, atom.y, atom.r, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };
    
    drawMolecule();
    
    // Add simple animation
    let rotation = 0;
    const animate = () => {
      rotation += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Transform context to rotate around center
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rotation);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      
      drawMolecule();
      
      ctx.restore();
      
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', setDimensions);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 border-b px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Select defaultValue="cartoon">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cartoon">Cartoon</SelectItem>
              <SelectItem value="stick">Stick</SelectItem>
              <SelectItem value="surface">Surface</SelectItem>
              <SelectItem value="sphere">Sphere</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="rainbow">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rainbow">Rainbow</SelectItem>
              <SelectItem value="chain">Chain</SelectItem>
              <SelectItem value="residue">Residue</SelectItem>
              <SelectItem value="element">Element</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">Reset View</Button>
          <Button variant="outline" size="sm">Take Screenshot</Button>
          <Button variant="outline" size="sm">Download</Button>
        </div>
      </div>
      
      <div className="flex flex-1">
        <div className="flex-1 h-full bg-black/5 relative">
          <canvas 
            ref={canvasRef} 
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
