import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MoleculeViewer from "@/components/molecule/MoleculeViewer";
import { ArrowLeft, Send, Download, Share, FileCode, Loader2 } from "lucide-react";
import { predictStructure, validateSequence, cleanSequence } from "@/utils/proteinApi";

const models = {
  esmfold: {
    name: "ESMFold",
    description: "State-of-the-art protein structure prediction model powered by NVIDIA",
    icon: <FileCode className="h-6 w-6 text-biostruct-500" />,
    tag: "Structure Prediction",
    apiEndpoint: "https://health.api.nvidia.com/v1/biology/nvidia/esmfold",
    disclaimer: "ESMFold is a service provided by NVIDIA. Usage of this model requires an API key.",
    exampleSequence: "MDILCEENTSLSSTTNSLMQLGDGPVQLTQVVEETQKLTWNDKETQSVQGPLLVEPAPGESQRPEIITPTAFTVTDTRKITSAVTVTPPPTAVETSDSRNSSVTTTPATLSAAPTTTTTRISAPTQTTQTTATPPATTTSAPIGSPASPPANISATTIFAGTIGAGGLTGVLGMGLATVTLILLRKRWNQCRALQDAFENLNKATSPLSTAQNRFEIKLSKFQNSLQKSFANLQKEFNNATPQLRSTVASAASAAPHIVGGPGGPVSGASVVNLTAGVGSGGRPSVFMDAAADAQRPGDVSARFHGDVLCDGIAGLGTVAMALPRAGVAPDIRHRGFVRVVASGRGSFVLEHHELARLTGVEPELDARLAAAAADRQAELERFMAGGLRGEALALRGDLAALRTELQAAQSSAQGVVTLARQVPDLEQVLSSLQGDAALSQAVRSLAGRAGRAMEPAPLLEAIVRRLSAATAVPDAGKDSAVVLQMAQALRDSLAPPIMGPSALTALPTPFGSDVVHPDRRTVFDQPPGHFRLELRGPGAAPVPPFSFQPPGSHRLSGG"
  }
};

const ModelDetail = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sequence, setSequence] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    pdbString?: string;
    json?: any;
    error?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("view");

  // Check if the model exists
  const model = modelId ? models[modelId as keyof typeof models] : null;

  if (!model) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 container flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">Model Not Found</h1>
          <p className="mb-6 text-muted-foreground">The model you're looking for doesn't exist or is not available.</p>
          <Button onClick={() => navigate("/models")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Models
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSequence(e.target.value);
  };

  const handleLoadExample = () => {
    setSequence(model.exampleSequence);
    toast({
      title: "Example Loaded",
      description: "An example protein sequence has been loaded.",
    });
  };

  const handleSubmit = async () => {
    if (!sequence.trim()) {
      toast({
        title: "Empty Sequence",
        description: "Please enter a protein sequence.",
        variant: "destructive",
      });
      return;
    }

    if (!validateSequence(sequence)) {
      toast({
        title: "Invalid Sequence",
        description: "Please enter a valid protein sequence containing only amino acid letters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setResult(null);

    // Progress simulation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 10;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 800);

    try {
      // For demo purposes, we're using a demo API key
      // In a production app, this should come from environment variables or user input
      const apiKey = "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";
      
      const result = await predictStructure(sequence, apiKey);

      clearInterval(progressInterval);
      setProgress(100);
      
      if (result.success) {
        setResult({
          pdbString: result.data,
          json: { pdb_string: result.data?.substring(0, 100) + "..." } // Display truncated JSON for demo
        });
        setActiveTab("view");
        toast({
          title: "Success",
          description: "Structure prediction completed successfully!",
        });
      } else {
        setResult({ error: result.error });
        toast({
          title: "Prediction Failed",
          description: result.error || "An error occurred during prediction.",
          variant: "destructive",
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      setResult({ error: error instanceof Error ? error.message : "Unknown error occurred" });
      toast({
        title: "Error",
        description: "Failed to connect to the prediction service.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result?.pdbString) return;
    
    const blob = new Blob([result.pdbString], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "protein_structure.pdb";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your PDB file is being downloaded.",
    });
  };

  const handleShare = () => {
    toast({
      title: "Share Feature",
      description: "Sharing functionality will be available soon.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container px-4 md:px-6">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={() => navigate("/models")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Models
          </Button>
          
          <div className="flex flex-col space-y-8 md:flex-row md:space-y-0 md:space-x-8">
            {/* Input Section */}
            <div className="w-full md:w-1/3 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-muted rounded-full p-2">
                      {model.icon}
                    </div>
                    <div>
                      <CardTitle>{model.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {model.tag}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {model.description}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="sequence" className="text-sm font-medium">
                        Protein Sequence
                      </label>
                      <Textarea
                        id="sequence"
                        placeholder="Enter your protein sequence..."
                        className="min-h-[150px] font-mono text-xs"
                        value={sequence}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleLoadExample}
                        disabled={isLoading}
                      >
                        Load Example
                      </Button>
                      <Button
                        size="sm"
                        disabled={isLoading || !sequence.trim()}
                        onClick={handleSubmit}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Predict Structure
                            <Send className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col items-start pt-0">
                  <p className="text-xs text-muted-foreground mb-2">
                    {model.disclaimer}
                  </p>
                  {isLoading && (
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Processing</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-1" />
                    </div>
                  )}
                </CardFooter>
              </Card>
            </div>
            
            {/* Results Section */}
            <div className="w-full md:w-2/3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {!result && !isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                      <FileCode className="h-16 w-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium">No Prediction Results</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        Enter a protein sequence and click "Predict Structure" to see the results here.
                      </p>
                    </div>
                  ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                      <Loader2 className="h-16 w-16 text-biostruct-500 animate-spin mb-4" />
                      <h3 className="text-lg font-medium">Processing Your Request</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        This may take a minute or two depending on the sequence length.
                      </p>
                    </div>
                  ) : result?.error ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                      <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20 mb-4">
                        <div className="rounded-full bg-red-200 p-3 dark:bg-red-900/40">
                          <div className="text-red-600 dark:text-red-200">❗</div>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium">Prediction Error</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        {result.error}
                      </p>
                    </div>
                  ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full justify-start mb-4">
                        <TabsTrigger value="view">3D View</TabsTrigger>
                        <TabsTrigger value="data">Raw Data</TabsTrigger>
                      </TabsList>
                      <TabsContent value="view">
                        <div className="h-[60vh] bg-black/5 dark:bg-white/5 rounded-md overflow-hidden">
                          {result?.pdbString ? (
                            <MoleculeViewer pdb={result.pdbString} />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Skeleton className="h-full w-full" />
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="data">
                        {result?.pdbString ? (
                          <div className="h-[60vh] overflow-auto">
                            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                              {result.pdbString.substring(0, 2000)}...
                            </pre>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-[60vh]">
                            <Skeleton className="h-full w-full" />
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
                {result?.pdbString && (
                  <CardFooter className="justify-end space-x-2">
                    <Button variant="outline" onClick={handleShare}>
                      <Share className="mr-2 h-4 w-4" /> Share
                    </Button>
                    <Button onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" /> Download PDB
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ModelDetail;
