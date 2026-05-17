import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, Briefcase, Users } from "lucide-react";
import DeleteJobButton from "@/components/recruiter/DeleteJobButton";
import { companyColor } from "@/lib/job-colors";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

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

type Job = {
  id: string;
  title: string;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  required_skills: string[];
  is_active: boolean;
  posted_at: string;
  created_at: string;
  companies: { name: string } | null;
};

export default async function RecruiterJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id");
  if (!membership) redirect("/recruiter/setup");

  const { data: jobs } = await sb
    .from("job_postings")
    .select("id, title, location, work_mode, employment_type, seniority, required_skills, is_active, posted_at, created_at, companies(name)")
    .eq("company_id", membership.company_id)
    .order("created_at", { ascending: false });

  const jobIds = (jobs ?? []).map((j: { id: string }) => j.id);
  const appCounts: Record<string, number> = {};
  if (jobIds.length > 0) {
    const { data: appRows } = await sb
      .from("applications")
      .select("job_posting_id")
      .in("job_posting_id", jobIds);
    (appRows ?? []).forEach((a: { job_posting_id: string }) => {
      appCounts[a.job_posting_id] = (appCounts[a.job_posting_id] ?? 0) + 1;
    });
  }

  const activeJobs = (jobs ?? []).filter((j: Job) => j.is_active) as Job[];
  const closedJobs = (jobs ?? []).filter((j: Job) => !j.is_active) as Job[];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fafaf8]">

      {/* Page header */}
      <div className="px-8 pt-7 pb-5 flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">
            Recruitment
          </h1>
          <p className="text-[15px] text-[#5f5d54] mt-[8px]">
            {activeJobs.length > 0 ? (
              <><span className="font-bold">{activeJobs.length}</span> active job{activeJobs.length !== 1 ? "s" : ""}</>
            ) : (
              "Post jobs and find the best candidates"
            )}
          </p>
        </div>
        <Link
          href="/recruiter/jobs/new"
          className="h-[34px] px-[14px] bg-white border border-[#dddbd2] rounded-[10px] text-[13px] font-medium text-[#0a2412] hover:bg-[#f5f4f0] transition-colors flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Post a job
        </Link>
      </div>

      {/* Tab bar */}
      <div className="px-8 shrink-0">
        <div className="flex gap-[45px]">
          <div className="text-[13px] font-bold text-[#0a2412] pb-[7px] border-b-2 border-[#0a2412]">
            Active ({activeJobs.length})
          </div>
          {closedJobs.length > 0 && (
            <div className="text-[13px] font-medium text-[#5f5d54] pb-[7px] border-b-2 border-transparent">
              Closed ({closedJobs.length})
            </div>
          )}
        </div>
        <div className="h-px bg-[#eceae3] w-full" />
      </div>

      {/* Jobs content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-6 pt-6">

        {(jobs ?? []).length === 0 ? (
          <div className="bg-white rounded-[20px] p-16 text-center">
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
            {/* Active jobs grid */}
            {activeJobs.length > 0 && (
              <div className="mb-10">
                <div className="grid grid-cols-3 gap-[16px]">
                  {activeJobs.map((job) => {
                    const companyName = job.companies?.name ?? "Organisation";
                    const appCount = appCounts[job.id] ?? 0;
                    return (
                      <div
                        key={job.id}
                        className="bg-white rounded-[14px] flex flex-col ring-1 ring-[#e8f2eb] hover:ring-[#b8dfc4] hover:-translate-y-[2px] hover:shadow-sm transition-all"
                      >
                        <div className="p-[20px] flex flex-col gap-[20px] flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-[12px] overflow-hidden">
                            <div
                              className="w-[41px] h-[41px] rounded-[10px] flex items-center justify-center text-white text-[14px] font-bold shrink-0"
                              style={{ backgroundColor: companyColor(companyName) }}
                            >
                              {companyName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[17px] font-semibold text-[#0a2412] leading-[20px] truncate">{job.title}</p>
                              <p className="text-[12px] text-[#5f5d54] leading-[16px] truncate mt-[4px]">
                                {[companyName, job.location].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-[6px]">
                            {job.work_mode && (
                              <span className="border border-[#d0ebd8] bg-[#f0f9f3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#1a5c30] leading-[16px]">
                                {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
                              </span>
                            )}
                            {job.employment_type && (
                              <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54] leading-[16px]">
                                {TYPE_LABELS[job.employment_type] ?? job.employment_type}
                              </span>
                            )}
                            {(job.required_skills ?? []).slice(0, 2).map((skill: string) => (
                              <span key={skill} className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54] leading-[16px]">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="h-px bg-[#eceae3]" />

                        <div className="p-[20px] flex items-center gap-[8px]">
                          <span className="flex items-center gap-1.5 text-[12px] text-[#8a877b]">
                            <Users className="w-3 h-3" />
                            {appCount} applicant{appCount !== 1 ? "s" : ""}
                          </span>
                          <div className="flex-1" />
                          <DeleteJobButton jobId={job.id} />
                          <Link
                            href={`/recruiter/jobs/${job.id}`}
                            className="h-[33px] w-[54px] rounded-[10px] bg-white border border-[#dddbd2] text-[#0a2412] text-[12px] font-medium flex items-center justify-center hover:bg-[#f5f4f0] transition-colors"
                          >
                            view
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Closed jobs grid */}
            {closedJobs.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Closed</p>
                <div className="grid grid-cols-3 gap-[16px]">
                  {closedJobs.map((job) => (
                    <div key={job.id} className="bg-white/50 rounded-[14px] border border-[#eceae3] p-[20px] flex flex-col gap-[12px]">
                      <div className="flex items-center gap-[12px]">
                        <div className="w-[41px] h-[41px] rounded-[10px] bg-[#f5f3ed] flex items-center justify-center text-[#c8c5bc] text-[14px] font-bold shrink-0">
                          {job.title.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-[#8a877b] truncate">{job.title}</p>
                          {job.location && <p className="text-[12px] text-[#c8c5bc] truncate">{job.location}</p>}
                        </div>
                      </div>
                      <span className="text-[11px] text-[#c8c5bc] px-2 py-0.5 bg-[#f5f3ed] rounded-full self-start">closed</span>
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
