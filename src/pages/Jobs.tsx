import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

  if (loading) return <div>Loading user...</div>;
  return (
    <section className="py-16">
      <div className="container px-4 md:px-6">
        <h2 className="text-2xl font-bold mb-4">Your Jobs</h2>
        {jobLoading ? (
          <p>Loading jobs...</p>
        ) : jobs.length ? (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id} className="p-4 border rounded-lg flex justify-between items-center">
                <div>
                  <p>ID: {job.id}</p>
                  <p>Model: {job.model_id}</p>
                  <p>Status: {job.status}</p>
                  <p>Created: {new Date(job.created_at).toLocaleString()}</p>
                </div>
                <Link to={`/models/${job.model_id}?job=${job.id}`} className="text-sm font-medium text-primary hover:underline">
                  View
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No jobs found.</p>
        )}
      </div>
    </section>
  );
};

export default Jobs;
