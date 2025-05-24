
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { useNglBackground } from "./useNglBackground";

const Hero = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current) return;
    
    const plugin = createPluginUI(viewerRef.current, {
      ...DefaultPluginUISpec(),
      layout: {
        initial: {
          isExpanded: false,
          showControls: false,
          controlsDisplay: 'hidden'
        }
      },
      components: {
        controls: {
          left: 'none',
          right: 'none',
          top: 'none',
          bottom: 'none'
        }
      }
    });
    
    pluginRef.current = plugin;
    
    // Load structure from PDB
    const loadStructure = async () => {
      try {
        const data = await plugin.builders.data.download({ 
          url: 'https://files.rcsb.org/download/1AOI.pdb', 
          isBinary: false 
        });
        
        const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);
        
        // Add cartoon representation
        await plugin.builders.structure.representation.addRepresentation(structure, {
          type: 'cartoon',
          color: 'chain-id',
          size: 'uniform'
        });
        
        // Set background and spin
        const canvas = plugin.canvas3d;
        canvas.setBackground(Color(ColorNames.white));
        
        // Enable auto-rotation (spin)
        plugin.managers.animation.rotate.play();
        
        // Reset camera
        await plugin.canvas3d?.resetCamera();
        await plugin.canvas3d?.requestAnimation();
      } catch (error) {
        console.error('Error loading structure:', error);
      }
    };
    
    loadStructure();
    
    return () => {
      plugin.dispose();
      pluginRef.current = null;
    };
  }, []);

  useNglBackground(pluginRef.current);

  return (
    <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-biostruct-200/30 to-molecular-200/30 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-biostruct-200/20 to-molecular-200/20 rounded-full blur-3xl"></div>
      
      <div className="container px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="flex flex-col justify-center space-y-4 flex-1">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                <span className="text-gradient">Structural Biology</span> Made Simple
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                BioStruct brings powerful computational tools to researchers without the complexity. 
                Predict structures, analyze binding sites, and accelerate your discoveries.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="font-medium" asChild>
                <Link to="/login">Get Started</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/models">Explore Models</Link>
              </Button>
            </div>
            <div className="text-sm text-muted-foreground pt-2">
              No credit card required to start. Free plan available.
            </div>
          </div>
          
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="w-full max-w-[500px] aspect-square relative">
              <div 
                ref={viewerRef} 
                className="absolute inset-0 rounded-xl overflow-hidden shadow-lg" 
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
