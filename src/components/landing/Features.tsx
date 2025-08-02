import { 
  Book, 
  FileText, 
  Search,
  Database,
  Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Features = () => {
  const features = [
    {
      icon: <Search className="h-10 w-10 text-Phage-500" />,
      title: "Structure Prediction",
      description: "Predict protein structures from sequences using state-of-the-art deep learning models."
    },
    {
      icon: <Database className="h-10 w-10 text-molecular-500" />,
      title: "Pocket Detection",
      description: "Automatically identify and analyze potential binding sites and pockets in protein structures."
    },
    {
      icon: <FileText className="h-10 w-10 text-Phage-500" />,
      title: "Molecular Docking",
      description: "Screen compounds against protein targets to identify potential binding candidates."
    },
    {
      icon: <Book className="h-10 w-10 text-molecular-500" />,
      title: "Interactive Visualization",
      description: "Explore 3D molecular structures with our intuitive browser-based visualization tools."
    }
  ];

  return (
    <section id="features" className="py-16 bg-muted/50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Powerful Tools, Simple Interface
          </h2>
          <p className="max-w-[600px] text-muted-foreground text-lg">
            Access advanced computational biology capabilities without command-line complexity.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="p-2 rounded-full bg-muted">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-16 max-w-3xl mx-auto bg-gradient-to-r from-Phage-50 to-molecular-50 dark:from-Phage-800 dark:to-molecular-800 p-8 rounded-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="flex-1 space-y-4">
              <h3 className="text-2xl font-bold">Ready for your research?</h3>
              <p className="text-muted-foreground">
                Start with our free tier - no credit card required.
              </p>
              <ul className="space-y-2 text-left">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-molecular-600" />
                  <span>100 credits per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-molecular-600" />
                  <span>Access to all models</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-molecular-600" />
                  <span>Unlimited Demo Usage</span>
                </li>
              </ul>
            </div>
            <div className="flex-shrink-0">
              <Link 
                to="/login?tab=signup" 
                className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-Phage-600 transition-colors inline-block text-center"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
