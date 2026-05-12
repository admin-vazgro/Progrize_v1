import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, Briefcase, MapPin, Users, ArrowRight } from "lucide-react";
import DeleteJobButton from "@/components/recruiter/DeleteJobButton";

const WORK_MODE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  freelance: "Freelance",
};

export default async function RecruiterJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: jobs } = await sb
    .from("job_postings")
    .select("id, title, location, work_mode, employment_type, seniority, required_skills, is_active, posted_at, created_at, companies(name)")
    .eq("recruiter_id", user.id)
    .order("created_at", { ascending: false });

  const jobIds = (jobs ?? []).map((j: { id: string }) => j.id);
  let appCounts: Record<string, number> = {};
  if (jobIds.length > 0) {
    const { data: appRows } = await sb
      .from("applications")
      .select("job_posting_id")
      .in("job_posting_id", jobIds);
    (appRows ?? []).forEach((a: { job_posting_id: string }) => {
      appCounts[a.job_posting_id] = (appCounts[a.job_posting_id] ?? 0) + 1;
    });
  }

  const activeJobs = (jobs ?? []).filter((j: { is_active: boolean }) => j.is_active);
  const closedJobs = (jobs ?? []).filter((j: { is_active: boolean }) => !j.is_active);

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[900px] mx-auto px-8 py-8">

        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">Manage</p>
            <h1 className="text-[28px] font-semibold text-[#0a2412] tracking-[-0.6px]">Job Postings</h1>
          </div>
          <Link
            href="/recruiter/jobs/new"
            className="flex items-center gap-2 h-[40px] px-5 bg-[#0a2412] text-[#dee2df] text-[13px] font-medium rounded-[10px] hover:bg-[#142e1c] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Post a Job
          </Link>
        </div>

        {(jobs ?? []).length === 0 ? (
          <div className="bg-white rounded-[20px] border border-dashed border-[#d4d0c8] p-16 text-center">
            <Briefcase className="w-10 h-10 text-[#c8c5bc] mx-auto mb-4" />
            <p className="text-[16px] font-semibold text-[#3d3c36] mb-2">No jobs posted yet</p>
            <p className="text-[13px] text-[#8a877b] mb-6">Create your first job posting to start finding candidates.</p>
            <Link
              href="/recruiter/jobs/new"
              className="inline-flex items-center gap-2 h-[40px] px-6 bg-[#0a2412] text-[#dee2df] text-[13px] font-medium rounded-[10px] hover:bg-[#142e1c] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Post your first job
            </Link>
          </div>
        ) : (
          <>
            {activeJobs.length > 0 && (
              <div className="mb-8">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Active ({activeJobs.length})</p>
                <div className="flex flex-col gap-3">
                  {activeJobs.map((job: {
                    id: string;
                    title: string;
                    location: string | null;
                    work_mode: string | null;
                    employment_type: string | null;
                    required_skills: string[];
                    posted_at: string;
                    companies: { name: string };
                  }) => (
                    <Link
                      key={job.id}
                      href={`/recruiter/jobs/${job.id}`}
                      className="group bg-white rounded-[20px] p-5 hover:shadow-sm transition-shadow flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-[10px] bg-[#f0ede8] flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-[#5f5d54]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <p className="text-[15px] font-semibold text-[#0a2412] tracking-[-0.3px]">{job.title}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="flex items-center gap-1 text-[12px] text-[#5f5d54]">
                              <Users className="w-3 h-3" />
                              {appCounts[job.id] ?? 0}
                            </span>
                            <DeleteJobButton jobId={job.id} />
                            <ArrowRight className="w-3.5 h-3.5 text-[#c8c5bc] group-hover:text-[#8a877b] transition-colors" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-[#8a877b] mb-2">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.location}
                            </span>
                          )}
                          {job.work_mode && (
                            <span className="px-1.5 py-0.5 bg-[#f5f3ed] text-[#5f5d54] text-[10px] rounded-full">
                              {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
                            </span>
                          )}
                          {job.employment_type && (
                            <span className="px-1.5 py-0.5 bg-[#f5f3ed] text-[#5f5d54] text-[10px] rounded-full">
                              {TYPE_LABELS[job.employment_type] ?? job.employment_type}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(job.required_skills ?? []).slice(0, 5).map((skill: string) => (
                            <span key={skill} className="px-2 py-0.5 bg-[#e8f2eb] text-[#0a2412] text-[10px] rounded-full">
                              {skill}
                            </span>
                          ))}
                          {(job.required_skills ?? []).length > 5 && (
                            <span className="px-2 py-0.5 bg-[#f5f3ed] text-[#8a877b] text-[10px] rounded-full">
                              +{(job.required_skills ?? []).length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {closedJobs.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Closed ({closedJobs.length})</p>
                <div className="flex flex-col gap-3">
                  {closedJobs.map((job: { id: string; title: string; location: string | null }) => (
                    <div key={job.id} className="bg-white/50 rounded-[16px] border border-[#eceae3] p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[10px] bg-[#f0ede8] flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-[#c8c5bc]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#8a877b]">{job.title}</p>
                        {job.location && <p className="text-[12px] text-[#c8c5bc]">{job.location}</p>}
                      </div>
                      <span className="text-[11px] text-[#c8c5bc] px-2 py-0.5 bg-[#f5f3ed] rounded-full">closed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
