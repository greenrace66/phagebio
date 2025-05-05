
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import * as NGL from "ngl";
import { useNglBackground } from "../landing/useNglBackground";

const Hero = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<NGL.Stage|null>(null);

  useEffect(() => {
    if (!viewerRef.current) return;
    const stage = new NGL.Stage(viewerRef.current);
    stageRef.current = stage;
    stage.loadFile("rcsb://1aoi", { defaultRepresentation: true }).then(() => {
      stage.autoView();
      stage.setSpin(true);
    });
    return () => {
      stage.dispose();
      stageRef.current = null;
    };
  }, []);

  useNglBackground(stageRef.current);

  return (
    <section className="py-8 md:py-16 lg:py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-24 -right-24 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-br from-biostruct-200/30 to-molecular-200/30 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-tr from-biostruct-200/20 to-molecular-200/20 rounded-full blur-3xl"></div>
      
      <div className="container px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="flex flex-col justify-center space-y-4 flex-1 text-center lg:text-left">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter">
                <span className="text-gradient">Structural Biology</span> Made Simple
              </h1>
              <p className="max-w-[600px] mx-auto lg:mx-0 text-muted-foreground text-sm md:text-base lg:text-xl">
                BioStruct brings powerful computational tools to researchers without the complexity. 
                Predict structures, analyze binding sites, and accelerate your discoveries.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
              <Button size="lg" className="font-medium" asChild>
                <Link to="/login">Get Started</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/models">Explore Models</Link>
              </Button>
            </div>
            <div className="text-xs md:text-sm text-muted-foreground pt-2">
              No credit card required to start. Free plan available.
            </div>
          </div>
          
          <div className="flex-1 flex justify-center lg:justify-end mt-8 lg:mt-0">
            <div className="w-full max-w-[300px] md:max-w-[400px] lg:max-w-[500px] aspect-square relative">
              <div ref={viewerRef} className="absolute inset-0 rounded-xl overflow-hidden shadow-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
