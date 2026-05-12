import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Briefcase, Users, GitBranch, TrendingUp, ChevronRight, Plus } from "lucide-react";
import CandidateSuggestions from "@/components/recruiter/CandidateSuggestions";

export default async function RecruiterDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: memberships }, { count: totalJobs }, { data: allJobIds }] = await Promise.all([
    sb.from("company_members").select("company_id, companies(name)").eq("user_id", user.id).limit(1),
    sb.from("job_postings").select("*", { count: "exact", head: true }).eq("recruiter_id", user.id).eq("is_active", true),
    sb.from("job_postings").select("id").eq("recruiter_id", user.id),
  ]);

  const membership = (memberships ?? [])[0] ?? null;
  const jobIdList = (allJobIds ?? []).map((j: { id: string }) => j.id);

  let totalApplications = 0;
  let shortlisted = 0;
  if (jobIdList.length > 0) {
    const [{ count: appCount }, { count: shortlistCount }] = await Promise.all([
      sb.from("applications").select("*", { count: "exact", head: true }).in("job_posting_id", jobIdList),
      sb.from("applications").select("*", { count: "exact", head: true })
        .in("job_posting_id", jobIdList)
        .in("status", ["shortlisted", "interview", "offered"]),
    ]);
    totalApplications = appCount ?? 0;
    shortlisted = shortlistCount ?? 0;
  }

  const company = membership?.companies as { name: string } | null;

  // recent active jobs with app count
  const { data: recentJobs } = await sb
    .from("job_postings")
    .select("id, title, location, work_mode, created_at")
    .eq("recruiter_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(4);

  // get app counts for recent jobs
  const jobIds = (recentJobs ?? []).map((j: { id: string }) => j.id);
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

  const stats = [
    { label: "Active Jobs", value: totalJobs ?? 0, Icon: Briefcase, href: "/recruiter/jobs", iconBg: "bg-[#e8f2eb]", iconColor: "text-[#0a2412]" },
    { label: "Total Applicants", value: totalApplications ?? 0, Icon: Users, href: "/recruiter/pipeline", iconBg: "bg-[#f2fcda]", iconColor: "text-[#0a2412]" },
    { label: "Shortlisted", value: shortlisted ?? 0, Icon: TrendingUp, href: "/recruiter/pipeline", iconBg: "bg-[#e8eeff]", iconColor: "text-[#1a4fd6]" },
    { label: "In Pipeline", value: (totalApplications ?? 0) - (shortlisted ?? 0), Icon: GitBranch, href: "/recruiter/pipeline", iconBg: "bg-[#fff0e8]", iconColor: "text-[#c05200]" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[1100px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">{company?.name ?? "Your Company"}</p>
            <h1 className="text-[28px] font-semibold text-[#0a2412] tracking-[-0.6px]">Recruiting Dashboard</h1>
          </div>
          <Link
            href="/recruiter/jobs/new"
            className="flex items-center gap-2 h-[40px] px-5 bg-[#0a2412] text-[#dee2df] text-[13px] font-medium rounded-[10px] hover:bg-[#142e1c] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Post a Job
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map(({ label, value, Icon, href, iconBg, iconColor }) => (
            <Link key={label} href={href} className="group bg-white rounded-[20px] p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-[8px] ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#b0ae9f] group-hover:text-[#0a2412] transition-colors" />
              </div>
              <p className="text-[32px] font-normal tracking-[-0.03em] text-[#0a2412] leading-none tabular-nums">{value}</p>
              <p className="text-[11px] text-[#8a877b] mt-1">{label}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* Candidate Suggestions */}
          <CandidateSuggestions />

          {/* Active Jobs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-[#26251f] tracking-[-0.3px]">Active Jobs</h2>
              <Link href="/recruiter/jobs" className="text-[12px] text-[#8a877b] hover:text-[#3d3c36] transition-colors">
                View all
              </Link>
            </div>

            {(recentJobs ?? []).length === 0 ? (
              <div className="bg-white rounded-[20px] border border-dashed border-[#d4d0c8] p-6 text-center">
                <p className="text-[13px] text-[#8a877b] mb-3">No active jobs yet</p>
                <Link href="/recruiter/jobs/new" className="text-[13px] font-medium text-[#0a2412] hover:underline">
                  Post your first job
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(recentJobs ?? []).map((job: { id: string; title: string; location: string | null; work_mode: string | null; created_at: string }) => (
                  <Link
                    key={job.id}
                    href={`/recruiter/jobs/${job.id}`}
                    className="group bg-white rounded-[16px] p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#0a2412] leading-[18px]">{job.title}</p>
                      <span className="text-[11px] font-mono text-[#8a877b] tabular-nums shrink-0">
                        {appCounts[job.id] ?? 0} applicants
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {job.location && <p className="text-[12px] text-[#8a877b]">{job.location}</p>}
                      {job.work_mode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f5f3ed] text-[#5f5d54] capitalize">
                          {job.work_mode}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
