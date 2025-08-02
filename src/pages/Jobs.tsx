
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCode, Calendar, User, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: number;
  user_id: string;
  model_id: string;
  input_sequence: string;
  status: string;
  created_at: string;
  result: string | null;
}

const Jobs = () => {
  const { user, loading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobLoading, setJobLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setJobLoading(true);
    supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setJobs(data || []);
        setJobLoading(false);
      });
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const truncateSequence = (sequence: string, maxLength: number = 50) => {
    return sequence.length > maxLength ? sequence.substring(0, maxLength) + '...' : sequence;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-Phage-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading user...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-6 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please sign in to view your jobs</p>
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Your Jobs</h1>
            <p className="text-muted-foreground">
              Track your protein structure prediction jobs and view results
            </p>
          </div>

          {jobLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-4" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-8 w-full" />
                </Card>
              ))}
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <FileCode className="h-5 w-5 text-Phage-500" />
                        <span>{job.model_id.toUpperCase()}</span>
                      </CardTitle>
                      <Badge className={`${getStatusColor(job.status)} border-0`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(job.status)}
                          <span className="capitalize">{job.status}</span>
                        </div>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Job ID:</span> #{job.id}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Input Sequence:</span>
                      <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                        {truncateSequence(job.input_sequence)}
                      </div>
                    </div>
                    
                    <Button asChild className="w-full">
                      <Link 
                        to={`/models/${job.model_id}?job=${job.id}`}
                        className="flex items-center justify-center space-x-2"
                      >
                        <span>View Details</span>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">No Jobs Found</h3>
              <p className="text-muted-foreground mb-6">
                You haven't run any protein structure predictions yet.
              </p>
              <Button asChild>
                <Link to="/models">
                  Explore Models
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Jobs;
