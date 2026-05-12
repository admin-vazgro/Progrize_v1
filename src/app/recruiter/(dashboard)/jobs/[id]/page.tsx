"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Briefcase, Users, ChevronDown,
  ExternalLink, SlidersHorizontal
} from "lucide-react";
import type { JobPosting, Application } from "@/types/recruiter";

const STATUS_OPTIONS = ["applied", "reviewing", "shortlisted", "interview", "offered", "rejected"] as const;
type Status = typeof STATUS_OPTIONS[number];

const STATUS_STYLES: Record<Status, string> = {
  applied: "bg-[#f5f3ed] text-[#5f5d54]",
  reviewing: "bg-[#f7fcca] text-[#3a3a00]",
  shortlisted: "bg-[#e8f2eb] text-[#0a2412]",
  interview: "bg-[#e0f0ff] text-[#0a1f3d]",
  offered: "bg-[#d4edda] text-[#0a2412]",
  rejected: "bg-[#fee] text-[#7a0000]",
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#eceae3] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-[#3d3c36] w-8 text-right">{score}%</span>
    </div>
  );
}

function StatusPill({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${STATUS_STYLES[status]} hover:opacity-80 transition-opacity`}
      >
        {status}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-[#eceae3] rounded-[10px] shadow-lg py-1 min-w-[120px]">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#f5f3ed] transition-colors ${s === status ? "font-semibold" : ""}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface EnrichedApplication extends Omit<Application, "applicant"> {
  matching_skills: string[];
  missing_skills: string[];
  applicant: {
    id: string;
    full_name: string | null;
    headline: string | null;
    location: string | null;
    email: string | null;
    avatar_url: string | null;
    years_experience: number | null;
    skills: string[];
  } | null;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "details">("pipeline");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [jobRes, pipelineRes] = await Promise.all([
      fetch(`/api/recruiter/jobs/${id}`),
      fetch(`/api/recruiter/jobs/${id}/pipeline`),
    ]);
    if (jobRes.ok) {
      const data = await jobRes.json();
      setJob(data.job);
    }
    if (pipelineRes.ok) {
      const data = await pipelineRes.json();
      setApplications(data.applications ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(applicationId: string, status: Status) {
    setUpdatingId(applicationId);
    await fetch(`/api/recruiter/jobs/${id}/pipeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: applicationId, status }),
    });
    setApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
    );
    setUpdatingId(null);
  }

  async function toggleJobStatus() {
    if (!job) return;
    const res = await fetch(`/api/recruiter/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !job.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      setJob(data.job);
    }
  }

  const filtered = filterStatus === "all"
    ? applications
    : applications.filter((a) => a.status === filterStatus);

  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#fafaf8]">
        <p className="text-[13px] text-[#8a877b]">Loading…</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="h-full flex items-center justify-center bg-[#fafaf8]">
        <p className="text-[13px] text-[#8a877b]">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[960px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <Link href="/recruiter/jobs" className="inline-flex items-center gap-1.5 text-[13px] text-[#8a877b] hover:text-[#3d3c36] transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to jobs
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-[24px] font-semibold text-[#0a2412] tracking-[-0.5px]">{job.title}</h1>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${job.is_active ? "bg-[#e8f2eb] text-[#0a2412]" : "bg-[#f5f3ed] text-[#8a877b]"}`}>
                  {job.is_active ? "Active" : "Closed"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-[#8a877b]">
                {job.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                )}
                {job.work_mode && <span className="capitalize">{job.work_mode}</span>}
                {job.employment_type && <span className="capitalize">{job.employment_type}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleJobStatus}
                className="h-[36px] px-4 text-[12px] font-medium rounded-[8px] border border-[#eceae3] text-[#5f5d54] hover:bg-[#f5f3ed] transition-colors"
              >
                {job.is_active ? "Close Job" : "Reopen"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: applications.length, color: "text-[#0a2412]" },
            { label: "Shortlisted", value: statusCounts.shortlisted ?? 0, color: "text-[#0a7a3d]" },
            { label: "Interview", value: statusCounts.interview ?? 0, color: "text-[#1565c0]" },
            { label: "Offered", value: statusCounts.offered ?? 0, color: "text-[#0a2412]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-[12px] border border-[#eceae3] px-4 py-3 text-center">
              <p className={`text-[22px] font-semibold tabular-nums ${color}`}>{value}</p>
              <p className="text-[11px] text-[#8a877b]">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#eceae3]">
          {(["pipeline", "details"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[13px] capitalize border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-[#0a2412] text-[#0a2412] font-medium"
                  : "border-transparent text-[#8a877b] hover:text-[#3d3c36]"
              }`}
            >
              {tab}
              {tab === "pipeline" && applications.length > 0 && (
                <span className="ml-1.5 text-[10px] font-mono text-[#8a877b]">{applications.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "pipeline" && (
          <div>
            {/* Filter bar */}
            {applications.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#8a877b]" />
                <div className="flex gap-1.5">
                  {["all", ...STATUS_OPTIONS].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 text-[11px] rounded-full transition-colors capitalize ${
                        filterStatus === s
                          ? "bg-[#0a2412] text-[#dee2df]"
                          : "bg-[#f5f3ed] text-[#5f5d54] hover:bg-[#eceae3]"
                      }`}
                    >
                      {s}
                      {s !== "all" && statusCounts[s] ? ` (${statusCounts[s]})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {applications.length === 0 ? (
              <div className="bg-white rounded-[16px] border border-dashed border-[#d4d0c8] p-12 text-center">
                <Users className="w-8 h-8 text-[#c8c5bc] mx-auto mb-3" />
                <p className="text-[14px] font-medium text-[#3d3c36] mb-1">No applicants yet</p>
                <p className="text-[13px] text-[#8a877b]">Share this job to start receiving applications.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((app) => {
                  const profile = app.applicant;
                  const initials = (profile?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                  const fitScore = app.fit_score ?? 0;
                  const atsScore = app.ats_score ?? 0;

                  return (
                    <div key={app.id} className={`bg-white rounded-[20px] p-5 shadow-sm transition-opacity ${updatingId === app.id ? "opacity-60" : ""}`}>
                      <div className="flex items-start gap-4">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[11px] font-bold shrink-0">
                            {initials}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div>
                              <p className="text-[14px] font-semibold text-[#0a2412]">{profile?.full_name ?? "Unknown"}</p>
                              <p className="text-[12px] text-[#5f5d54]">{profile?.headline ?? "—"}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <StatusPill
                                status={app.status as Status}
                                onChange={(s) => updateStatus(app.id, s)}
                              />
                              <Link
                                href={`/recruiter/candidates/${app.applicant_id}?job=${job.id}`}
                                className="p-1.5 rounded-[6px] text-[#c8c5bc] hover:text-[#5f5d54] hover:bg-[#f5f3ed] transition-colors"
                                title="View profile"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>

                          {profile?.location && (
                            <p className="flex items-center gap-1 text-[11px] text-[#8a877b] mb-3">
                              <MapPin className="w-3 h-3" />{profile.location}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-[10px] text-[#8a877b] mb-1">Fit Score</p>
                              <ScoreBar score={fitScore} color={fitScore >= 70 ? "bg-[#4caf6e]" : fitScore >= 45 ? "bg-[#c1cc5a]" : "bg-[#e0c070]"} />
                            </div>
                            {atsScore > 0 && (
                              <div>
                                <p className="text-[10px] text-[#8a877b] mb-1">ATS Score</p>
                                <ScoreBar score={atsScore} color={atsScore >= 70 ? "bg-[#4caf6e]" : atsScore >= 45 ? "bg-[#c1cc5a]" : "bg-[#e0c070]"} />
                              </div>
                            )}
                          </div>

                          {(app.matching_skills.length > 0 || app.missing_skills.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {app.matching_skills.slice(0, 5).map((sk) => (
                                <span key={sk} className="px-2 py-0.5 bg-[#e8f2eb] text-[#0a2412] text-[10px] rounded-full">{sk}</span>
                              ))}
                              {app.missing_skills.slice(0, 3).map((sk) => (
                                <span key={sk} className="px-2 py-0.5 bg-[#f5f3ed] text-[#8a877b] text-[10px] rounded-full line-through">{sk}</span>
                              ))}
                            </div>
                          )}

                          {app.cover_note && (
                            <p className="mt-3 text-[12px] text-[#5f5d54] italic border-l-2 border-[#eceae3] pl-3 leading-[1.5]">
                              &ldquo;{app.cover_note}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "details" && (
          <div className="bg-white rounded-[20px] border border-[#eceae3] p-6 flex flex-col gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-2">Description</p>
              <p className="text-[13px] text-[#3d3c36] leading-[1.7] whitespace-pre-wrap">{job.description}</p>
            </div>

            {(job.requirements ?? []).length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-2">Requirements</p>
                <ul className="flex flex-col gap-1.5">
                  {(job.requirements as string[]).map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#3d3c36]">
                      <span className="text-[#8a877b] shrink-0">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(job.required_skills ?? []).length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {(job.required_skills as string[]).map((s) => (
                    <span key={s} className="px-2.5 py-1 bg-[#e8f2eb] text-[#0a2412] text-[12px] rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {(job.nice_to_have_skills ?? []).length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-2">Nice to Have</p>
                <div className="flex flex-wrap gap-1.5">
                  {(job.nice_to_have_skills as string[]).map((s) => (
                    <span key={s} className="px-2.5 py-1 bg-[#f5f3ed] text-[#5f5d54] text-[12px] rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {(job.salary_min || job.salary_max) && (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-2">Compensation</p>
                <p className="text-[14px] font-semibold text-[#0a2412]">
                  {job.salary_min ? `$${job.salary_min.toLocaleString()}` : ""}
                  {job.salary_min && job.salary_max ? " — " : ""}
                  {job.salary_max ? `$${job.salary_max.toLocaleString()}` : ""}
                  {" "}
                  <span className="text-[12px] font-normal text-[#8a877b]">{job.salary_currency ?? "USD"} / year</span>
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-[#eceae3]">
              <Link href={`/recruiter/jobs/new`} className="inline-flex items-center gap-1.5 text-[13px] text-[#8a877b] hover:text-[#3d3c36] transition-colors">
                <Briefcase className="w-3.5 h-3.5" />
                Post another job
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
