
import { useEffect, useRef, useState } from "react";
import * as NGL from "ngl";
import { useNglBackground } from "@/components/landing/useNglBackground";
import { useIsMobile } from "@/hooks/use-mobile";

export interface MoleculeViewerProps {
  pdb: string;
}

const MoleculeViewer = ({ pdb }: MoleculeViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<NGL.Stage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clean up previous stage
    if (stageRef.current) {
      stageRef.current.dispose();
    }
    
    // Create new stage
    const stage = new NGL.Stage(containerRef.current, { backgroundColor: "white" });
    stageRef.current = stage;
    
    // Handle responsive layout
    const handleResize = () => {
      if (stage) stage.handleResize();
    };
    
    window.addEventListener("resize", handleResize);
    
    // Load structure
    setIsLoading(true);
    
    try {
      const blob = new Blob([pdb], { type: "text/plain" });
      const objectUrl = URL.createObjectURL(blob);
      
      stage.loadFile(objectUrl, { ext: "pdb" }).then((component) => {
        // Add representations
        component.addRepresentation("cartoon", {
          colorScheme: "chainname",
          smoothSheet: true,
          quality: isMobile ? "low" : "high"
        });
        component.addRepresentation("ball+stick", {
          sele: "hetero and not water",
          colorScheme: "element",
          quality: isMobile ? "low" : "medium"
        });
        
        // Adjust camera
        stage.autoView();
        stage.setParameters({
          clipNear: 0,
          clipFar: 100,
          clipDist: 0,
          fogNear: 50,
          fogFar: 100
        });
        
        // Enable spin for better visualization
        const rotationSpeed = isMobile ? 0.5 : 1;
        stage.setSpin([0, 1, 0], rotationSpeed);
        
        setIsLoading(false);
        URL.revokeObjectURL(objectUrl);
      });
    } catch (error) {
      console.error("Failed to load molecule:", error);
      setIsLoading(false);
    }
    
    return () => {
      window.removeEventListener("resize", handleResize);
      if (stageRef.current) {
        stageRef.current.setSpin(false);
        stageRef.current.dispose();
        stageRef.current = null;
      }
    };
  }, [pdb, isMobile]);
  
  // Set background color based on theme
  useNglBackground(stageRef.current);
  
  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: isMobile ? 'pan-y' : 'none' }} // Allow vertical scroll on mobile
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-100"></div>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-200"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoleculeViewer;
