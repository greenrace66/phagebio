
import { 
  Book, 
  FileText, 
  Search,
  Database,
  Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      icon: <Search className="h-8 w-8 md:h-10 md:w-10 text-biostruct-500" />,
      title: "Structure Prediction",
      description: "Predict protein structures from sequences using state-of-the-art deep learning models."
    },
    {
      icon: <Database className="h-8 w-8 md:h-10 md:w-10 text-molecular-500" />,
      title: "Pocket Detection",
      description: "Automatically identify and analyze potential binding sites and pockets in protein structures."
    },
    {
      icon: <FileText className="h-8 w-8 md:h-10 md:w-10 text-biostruct-500" />,
      title: "Molecular Docking",
      description: "Screen compounds against protein targets to identify potential binding candidates."
    },
    {
      icon: <Book className="h-8 w-8 md:h-10 md:w-10 text-molecular-500" />,
      title: "Interactive Visualization",
      description: "Explore 3D molecular structures with our intuitive browser-based visualization tools."
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-muted/50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-8 md:mb-12">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
            Powerful Tools, Simple Interface
          </h2>
          <p className="max-w-[600px] text-muted-foreground text-sm md:text-lg">
            Access advanced computational biology capabilities without command-line complexity.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardContent className="p-4 md:p-6 flex flex-col items-center text-center space-y-3 md:space-y-4">
                <div className="p-2 rounded-full bg-muted">
                  {feature.icon}
                </div>
                <h3 className="text-lg md:text-xl font-semibold">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-10 md:mt-16 max-w-3xl mx-auto bg-gradient-to-r from-biostruct-50 to-molecular-50 dark:from-biostruct-800 dark:to-molecular-800 p-4 md:p-8 rounded-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="flex-1 space-y-3 md:space-y-4">
              <h3 className="text-xl md:text-2xl font-bold">Ready for your research?</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Start with our free tier - no credit card required.
              </p>
              <ul className="space-y-2 text-left text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 md:h-5 md:w-5 text-molecular-600 flex-shrink-0" />
                  <span>100 credits per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 md:h-5 md:w-5 text-molecular-600 flex-shrink-0" />
                  <span>Access to all models</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 md:h-5 md:w-5 text-molecular-600 flex-shrink-0" />
                  <span>Unlimited Demo Usage</span>
                </li>
              </ul>
            </div>
            <div className="flex-shrink-0">
              <button className="bg-primary text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-medium hover:bg-biostruct-600 transition-colors text-sm md:text-base">
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
