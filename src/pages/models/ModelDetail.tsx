
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/landing/Footer";
import MoleculeViewer from "@/components/molecule/MoleculeViewer";
import { predictProteinStructure } from "@/utils/proteinApi";

interface ModelInfo {
  name: string;
  description: string;
  input: string;
  output: string;
  tag: string;
}

const DEFAULT_SEQUENCE = "FVNQHLCGSHLVEALYLVCGERGFFYTPKA";

const MODELS: Record<string, ModelInfo> = {
  "esmfold": {
    name: "ESMFold",
    description: "State-of-the-art protein structure prediction model powered by NVIDIA",
    input: "Protein sequence",
    output: "3D structure",
    tag: "Structure Prediction",
  }
};

interface Job {
  id: number;
  input_sequence: string;
  result: string;
  status: string;
}

const ModelDetail = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [sequence, setSequence] = useState(DEFAULT_SEQUENCE);
  const [jobData, setJobData] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdbData, setPdbData] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const modelInfo = modelId ? MODELS[modelId] : undefined;
  
  // Fetch job data if job ID is provided
  useEffect(() => {
    if (jobId && user) {
      supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error(error);
            toast({
              title: "Error fetching job",
              description: "Could not load the job details",
              variant: "destructive",
            });
          } else if (data) {
            setJobData(data as Job);
            setSequence(data.input_sequence);
            if (data.result && data.status === "completed") {
              setPdbData(data.result);
            }
          }
        });
    }
  }, [jobId, user, toast]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sequence.trim()) {
      setErrorMessage("Protein sequence is required");
      toast({
        title: "Error",
        description: "Please enter a protein sequence",
        variant: "destructive",
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit a prediction",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setErrorMessage("");
    
    try {
      // Create job record first
      const { data: jobRecord, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          model_id: modelId,
          input_sequence: sequence,
          status: "pending",
        })
        .select();
      
      if (jobError) throw new Error(jobError.message);
      
      const newJobId = jobRecord[0].id;
      
      // Call prediction API
      const result = await predictProteinStructure(sequence);
      
      if (!result.ok) {
        throw new Error(result.error || "Failed to predict structure");
      }
      
      // Update job with result
      await supabase
        .from("jobs")
        .update({
          status: "completed",
          result: result.data,
        })
        .eq("id", newJobId);
      
      setPdbData(result.data);
      
      toast({
        title: "Success",
        description: "Protein structure prediction completed",
      });
      
      // Refresh job data
      setJobData({
        id: newJobId,
        input_sequence: sequence,
        result: result.data,
        status: "completed",
      } as Job);
      
    } catch (error) {
      console.error("Prediction error:", error);
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMessage(message);
      toast({
        title: "Prediction Failed",
        description: message,
        variant: "destructive",
      });
      
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!pdbData) return;
    
    const blob = new Blob([pdbData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modelId}_prediction.pdb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: "Your PDB file is being downloaded",
    });
  };
  
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${modelInfo?.name} Prediction`,
          text: `Check out my ${modelInfo?.name} protein structure prediction!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "URL has been copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };
  
  const handleCopySequence = () => {
    navigator.clipboard.writeText(sequence);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };
  
  if (!modelInfo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p>Model not found</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold">{modelInfo.name}</h1>
              <Badge variant="outline" className="text-xs">{modelInfo.tag}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{modelInfo.description}</p>
          </div>
          {pdbData && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label htmlFor="sequence" className="text-sm font-medium">
                      Protein Sequence
                    </label>
                    <button
                      type="button" 
                      className="text-xs flex items-center text-muted-foreground hover:text-primary"
                      onClick={handleCopySequence}
                    >
                      {copiedToClipboard ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  
                  <Textarea
                    id="sequence"
                    value={sequence}
                    onChange={(e) => setSequence(e.target.value)}
                    placeholder="Enter protein sequence (amino acids)"
                    className="font-mono text-xs md:text-sm h-32"
                  />
                  
                  {errorMessage && (
                    <p className="text-xs text-destructive mt-1">{errorMessage}</p>
                  )}
                </div>
                
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Processing..." : "Predict Structure"}
                </Button>
              </form>
            </Card>

            {jobData && (
              <Card className="p-4">
                <h2 className="text-sm font-medium mb-3">Job Information</h2>
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="grid grid-cols-3 gap-1">
                    <span className="font-medium">ID:</span>
                    <span className="col-span-2">{jobData.id}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="font-medium">Status:</span>
                    <span className="col-span-2">
                      <Badge variant={jobData.status === "completed" ? "default" : "secondary"}>
                        {jobData.status}
                      </Badge>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="font-medium">Sequence:</span>
                    <span className="col-span-2 font-mono text-xs break-all">
                      {jobData.input_sequence.length > 20 
                        ? `${jobData.input_sequence.substring(0, 20)}...` 
                        : jobData.input_sequence}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {pdbData ? (
            <Card className="overflow-hidden">
              <Tabs defaultValue="visualization">
                <div className="px-4 pt-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="visualization" className="flex-1 text-xs md:text-sm">Visualization</TabsTrigger>
                    <TabsTrigger value="data" className="flex-1 text-xs md:text-sm">Data</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="visualization" className="m-0">
                  <div className="h-[350px] md:h-[500px]">
                    <MoleculeViewer pdb={pdbData} />
                  </div>
                </TabsContent>
                <TabsContent value="data" className="m-0">
                  <div className="p-4 overflow-auto h-[350px] md:h-[500px]">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {pdbData.substring(0, 1000)}
                      {pdbData.length > 1000 && "..."}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-[350px] md:h-[500px] bg-muted/20">
              {loading ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <p className="text-sm text-muted-foreground">Predicting structure...</p>
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">
                    {jobId 
                      ? "No prediction data available for this job" 
                      : "Submit a sequence to see the predicted structure"}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ModelDetail;
