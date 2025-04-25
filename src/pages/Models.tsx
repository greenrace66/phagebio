
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/landing/Footer";
import { Card } from "@/components/ui/card";
import { FileCode } from "lucide-react";

const ModelsPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-12">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Available Models
            </h1>
            <p className="max-w-[600px] text-muted-foreground text-lg">
              Explore our collection of state-of-the-art models
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileCode className="h-5 w-5 text-biostruct-500" />
                <h2 className="text-2xl font-bold">ESMFold</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">
                    State-of-the-art protein structure prediction model powered by NVIDIA
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Input</h3>
                  <p className="text-muted-foreground mb-2">
                    Protein sequence in plain text format
                  </p>
                  <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                    MDILCEENTSLSSTTNSLMQLND...
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">API Endpoint</h3>
                  <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                    https://health.api.nvidia.com/v1/biology/nvidia/esmfold
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Headers</h3>
                  <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto whitespace-pre">
{`Authorization: Bearer $API_KEY
Accept: application/json
Content-Type: application/json`}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Request Format</h3>
                  <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto whitespace-pre">
{`{
  "sequence": "PROTEIN_SEQUENCE_HERE"
}`}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ModelsPage;
