
import { Button } from "@/components/ui/button";

const Hero = () => {
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
              <Button size="lg" className="font-medium">
                Get Started
              </Button>
              <Button variant="outline" size="lg">
                Explore Features
              </Button>
            </div>
            <div className="text-sm text-muted-foreground pt-2">
              No credit card required to start. Free plan available.
            </div>
          </div>
          
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="w-full max-w-[500px] aspect-square relative">
              {/* Protein visualization mockup */}
              <div className="absolute inset-0 bg-gradient-to-br from-biostruct-100 to-molecular-100 rounded-xl shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-3/4 h-3/4">
                    {/* Molecule representation circles */}
                    <div className="absolute top-1/4 left-1/4 w-6 h-6 bg-biostruct-500 rounded-full opacity-90 floating-icon" 
                         style={{animationDelay: "0s"}}></div>
                    <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-molecular-500 rounded-full opacity-80 floating-icon"
                         style={{animationDelay: "0.5s"}}></div>
                    <div className="absolute bottom-1/4 right-1/4 w-5 h-5 bg-biostruct-600 rounded-full opacity-70 floating-icon"
                         style={{animationDelay: "1s"}}></div>
                    <div className="absolute top-1/3 right-1/3 w-7 h-7 bg-molecular-600 rounded-full opacity-75 floating-icon"
                         style={{animationDelay: "1.5s"}}></div>
                    
                    {/* Connection lines */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-full border-2 border-dashed border-gray-300/30 rounded-full transform rotate-45"></div>
                      <div className="absolute w-3/4 h-3/4 border-2 border-dashed border-gray-300/30 rounded-full transform -rotate-12"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
