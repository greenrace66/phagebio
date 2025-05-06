
import { useEffect, useRef, useState } from 'react';
import * as NGL from 'ngl';
import { useIsMobile } from "@/hooks/use-mobile";

export interface MoleculeViewerProps {
  pdb: string;
  hideInfoOnMobile?: boolean;
}

const MoleculeViewer = ({ pdb, hideInfoOnMobile = true }: MoleculeViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!viewerRef.current) return;

    // Initialize NGL Stage
    const stage = new NGL.Stage(viewerRef.current, { backgroundColor: "white" });
    stageRef.current = stage;

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

  useEffect(() => {
    const loadStructure = async () => {
      if (!stageRef.current || !pdb) return;
      
      try {
        setIsLoading(true);
        // Clear existing structures
        stageRef.current.removeAllComponents();
        
        let component;
        // Check if pdb is a PDB ID (short string) or PDB data (long string)
        if (pdb.length < 10) {
          component = await stageRef.current.loadFile(`rcsb://${pdb}`);
        } else {
          component = await stageRef.current.loadFile(
            new Blob([pdb], {type: 'text/plain'}),
            { ext: 'pdb' }
          );
        }
        
        component.addRepresentation('cartoon', { color: 'chainname' });
        component.addRepresentation('ball+stick', { 
          sele: 'hetero', 
          color: 'element', 
          scale: 0.8 
        });
        
        component.autoView();
        
        // Optionally add spin animation
        stageRef.current.setSpin(true);
        
      } catch (error) {
        console.error('Error loading structure:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStructure();
  }, [pdb]);

  return <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />;
};

export default MoleculeViewer;
