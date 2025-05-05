
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/landing/Footer";
import { Card } from "@/components/ui/card";

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

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <p>Loading user...</p>
      </main>
      <Footer />
    </div>
  );
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8 md:py-16">
        <div className="container px-4 md:px-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4">Your Jobs</h2>
          {jobLoading ? (
            <p>Loading jobs...</p>
          ) : jobs.length ? (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Card className="p-4 space-y-2 md:space-y-0 md:flex md:justify-between md:items-center">
                    <div className="space-y-1">
                      <p className="text-sm"><span className="font-medium">ID:</span> {job.id}</p>
                      <p className="text-sm"><span className="font-medium">Model:</span> {job.model_id}</p>
                      <p className="text-sm"><span className="font-medium">Status:</span> {job.status}</p>
                      <p className="text-sm"><span className="font-medium">Created:</span> {new Date(job.created_at).toLocaleString()}</p>
                    </div>
                    <Link 
                      to={`/models/${job.model_id}?job=${job.id}`} 
                      className="block w-full md:w-auto text-center mt-2 md:mt-0 text-sm font-medium text-primary hover:underline bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-md transition-colors"
                    >
                      View
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p>No jobs found.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Jobs;
