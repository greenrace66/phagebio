
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/landing/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Dna, Lock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

const ModelsPage = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const models = [
    {
      id: "esmfold",
      name: "ESMFold",
      description: "State-of-the-art protein structure prediction model powered by NVIDIA",
      icon: <FileCode className="h-6 w-6 text-biostruct-500" />,
      tag: "Structure Prediction",
      input: "Protein sequence",
      output: "3D structure",
      disabled: false
    },
    {
      id: "alphafold",
      name: "AlphaFold",
      description: "DeepMind's revolutionary protein structure prediction system",
      icon: <Dna className="h-6 w-6 text-molecular-500" />,
      tag: "Structure Prediction",
      input: "Protein sequence",
      output: "3D structure with confidence scores",
      disabled: true
    }
  ];

  const handleCardClick = (modelId: string, disabled: boolean) => {
    if (disabled) return;
    navigate(`/models/${modelId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-8 md:mb-12">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight lg:text-4xl">
              Available Models
            </h1>
            <p className="max-w-[600px] text-muted-foreground text-base md:text-lg">
              Explore our collection of state-of-the-art models
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
            {models.map((model) => (
              <Card 
                key={model.id}
                className={`p-4 md:p-6 transition-all duration-200 ${
                  model.disabled 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:shadow-lg transform hover:-translate-y-1 cursor-pointer"
                } ${hoveredCard === model.id && !model.disabled ? "border-biostruct-300" : ""}`}
                onClick={() => handleCardClick(model.id, model.disabled)}
                onMouseEnter={() => !isMobile && setHoveredCard(model.id)}
                onMouseLeave={() => !isMobile && setHoveredCard(null)}
                onTouchStart={() => isMobile && !model.disabled && setHoveredCard(model.id)}
                onTouchEnd={() => isMobile && setHoveredCard(null)}
              >
                <div className="relative">
                  {model.disabled && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-md">
                      <Badge variant="outline" className="bg-background border-2 border-muted-foreground px-3 py-1">
                        <Lock className="h-3 w-3 mr-1" /> COMING SOON
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-muted rounded-full p-3">
                      {model.icon}
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold">{model.name}</h2>
                      <Badge variant="secondary" className="mt-1">
                        {model.tag}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {model.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm font-medium">Input:</span>
                      <span className="text-sm text-muted-foreground col-span-2">{model.input}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm font-medium">Output:</span>
                      <span className="text-sm text-muted-foreground col-span-2">{model.output}</span>
                    </div>
                  </div>
                  
                  {!model.disabled && (
                    <Button 
                      className="w-full mt-6 group"
                      variant="default"
                    >
                      Try Model
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ModelsPage;
