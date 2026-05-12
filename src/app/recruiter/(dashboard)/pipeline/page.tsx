import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MapPin, Calendar } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-[#f5f3ed] text-[#5f5d54]",
  reviewing: "bg-[#f7fcca] text-[#3a3a00]",
  shortlisted: "bg-[#e8f2eb] text-[#0a2412]",
  interview: "bg-[#e0f0ff] text-[#0a1f3d]",
  offered: "bg-[#d4edda] text-[#0a2412]",
  rejected: "bg-[#fee] text-[#7a0000]",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: jobs } = await sb
    .from("job_postings")
    .select("id, title")
    .eq("recruiter_id", user.id)
    .eq("is_active", true);

  const jobIds = (jobs ?? []).map((j: { id: string }) => j.id);
  const jobMap: Record<string, string> = {};
  (jobs ?? []).forEach((j: { id: string; title: string }) => { jobMap[j.id] = j.title; });

  let allApplications: Array<{
    id: string;
    job_posting_id: string;
    applicant_id: string;
    status: string;
    fit_score: number | null;
    applied_at: string;
    profile: { full_name: string | null; headline: string | null; location: string | null; avatar_url: string | null } | null;
  }> = [];

  if (jobIds.length > 0) {
    const { data: apps } = await sb
      .from("applications")
      .select("id, job_posting_id, applicant_id, status, fit_score, applied_at")
      .in("job_posting_id", jobIds)
      .order("applied_at", { ascending: false });

    const applicantIds = [...new Set((apps ?? []).map((a: { applicant_id: string }) => a.applicant_id))];

    let profileMap: Record<string, unknown> = {};
    if (applicantIds.length > 0) {
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, full_name, headline, location, avatar_url")
        .in("id", applicantIds);
      (profiles ?? []).forEach((p: { id: string }) => { profileMap[p.id] = p; });
    }

    allApplications = (apps ?? []).map((a: { applicant_id: string }) => ({
      ...a,
      profile: (profileMap[a.applicant_id] ?? null) as { full_name: string | null; headline: string | null; location: string | null; avatar_url: string | null } | null,
    }));
  }

  // group by status
  const stages = ["applied", "reviewing", "shortlisted", "interview", "offered", "rejected"];
  const grouped: Record<string, typeof allApplications> = {};
  stages.forEach((s) => { grouped[s] = []; });
  allApplications.forEach((a) => { if (grouped[a.status]) grouped[a.status].push(a); });

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[1100px] mx-auto px-8 py-8">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">Overview</p>
          <h1 className="text-[28px] font-semibold text-[#0a2412] tracking-[-0.6px]">Candidate Pipeline</h1>
          <p className="text-[13px] text-[#8a877b] mt-1">{allApplications.length} total applicant{allApplications.length !== 1 ? "s" : ""} across {jobIds.length} job{jobIds.length !== 1 ? "s" : ""}</p>
        </div>

        {allApplications.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-dashed border-[#d4d0c8] p-16 text-center">
            <p className="text-[14px] font-medium text-[#3d3c36] mb-2">Pipeline is empty</p>
            <p className="text-[13px] text-[#8a877b] mb-6">Applications will appear here once candidates apply to your jobs.</p>
            <Link href="/recruiter/jobs" className="text-[13px] font-medium text-[#0a2412] hover:underline">
              View your jobs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.filter((s) => s !== "rejected").map((stage) => (
              <div key={stage}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] capitalize">{stage}</p>
                  <span className="text-[10px] font-mono text-[#c8c5bc]">{grouped[stage].length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {grouped[stage].length === 0 ? (
                    <div className="bg-white/60 rounded-[12px] border border-dashed border-[#eceae3] p-4 text-center">
                      <p className="text-[11px] text-[#c8c5bc]">None</p>
                    </div>
                  ) : (
                    grouped[stage].map((app) => {
                      const initials = (app.profile?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                      return (
                        <Link
                          key={app.id}
                          href={`/recruiter/candidates/${app.applicant_id}?job=${app.job_posting_id}`}
                          className="group bg-white rounded-[12px] border border-[#eceae3] p-3 hover:border-[#d4d0c8] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            {app.profile?.avatar_url ? (
                              <img src={app.profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[9px] font-bold shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-[#0a2412] truncate">{app.profile?.full_name ?? "Unknown"}</p>
                              <p className="text-[10px] text-[#8a877b] truncate">{jobMap[app.job_posting_id] ?? "—"}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            {app.profile?.location ? (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#8a877b]">
                                <MapPin className="w-2.5 h-2.5" />
                                {app.profile.location}
                              </span>
                            ) : <span />}
                            {app.fit_score !== null && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${
                                app.fit_score >= 70 ? "bg-[#e8f2eb] text-[#0a2412]" :
                                app.fit_score >= 45 ? "bg-[#f7fcca] text-[#3a3a00]" :
                                "bg-[#f5f3ed] text-[#5f5d54]"
                              }`}>
                                {app.fit_score}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#c8c5bc]">
                            <Calendar className="w-2.5 h-2.5" />
                            {formatDate(app.applied_at)}
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejected section */}
        {grouped.rejected.length > 0 && (
          <div className="mt-8">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#c8c5bc] mb-3">Rejected ({grouped.rejected.length})</p>
            <div className="flex flex-col gap-2">
              {grouped.rejected.map((app) => (
                <div key={app.id} className="bg-white/50 rounded-[12px] border border-[#eceae3] p-3 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#f5f3ed] flex items-center justify-center text-[#c8c5bc] text-[9px] font-bold shrink-0">
                    {(app.profile?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <p className="text-[12px] text-[#8a877b] flex-1 truncate">{app.profile?.full_name ?? "Unknown"}</p>
                  <p className="text-[11px] text-[#c8c5bc] truncate">{jobMap[app.job_posting_id] ?? "—"}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_STYLES.rejected}`}>rejected</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
