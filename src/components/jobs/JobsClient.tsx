"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, Zap,
  Bookmark, BookmarkCheck, X, ExternalLink, Check,
  BriefcaseBusiness, ScanSearch, BookOpen, LayoutList,
  MapPin, ChevronDown,
} from "lucide-react";
import type { ReedJob } from "@/app/api/jobs/search/route";
import type { InternalJob } from "@/app/api/jobs/internal/route";
import { companyColor } from "@/lib/job-colors";
import JobDrawer from "@/components/jobs/JobDrawer";
import InternalJobDrawer from "@/components/jobs/InternalJobDrawer";
import CompanyLogo from "@/components/ui/CompanyLogo";

const INTRO_FEATURES = [
  { text: "Jobs matched to your skills and uploaded CV", ok: true },
  { text: "AI fit score analysis for every role", ok: true },
  { text: "One-click apply using your profile CV", ok: true },
  { text: "Save roles and track all applications in one place", ok: true },
];

interface Props {
  skills: string[];
  defaultKeywords: string;
  defaultLocation: string;
  hasProfile: boolean;
}

function salaryLabel(min: number | null, max: number | null, currency: string | null) {
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  if (min && max) return `${sym}${(min / 1000).toFixed(0)}k–${sym}${(max / 1000).toFixed(0)}k`;
  if (min) return `from ${sym}${(min / 1000).toFixed(0)}k`;
  if (max) return `up to ${sym}${(max / 1000).toFixed(0)}k`;
  return null;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function decodeHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent ?? el.innerText ?? "";
}


type TabId = "all" | "remote" | "fulltime" | "parttime";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "all" },
  { id: "remote", label: "remote" },
  { id: "fulltime", label: "full-time" },
  { id: "parttime", label: "part-time" },
];

const SALARY_CHIPS = [
  { label: "£50k+", value: 50000 },
  { label: "£70k+", value: 70000 },
  { label: "£100k+", value: 100000 },
];

export default function JobsClient({ skills, defaultKeywords, defaultLocation, hasProfile }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keywords] = useState(defaultKeywords);
  const [location] = useState(defaultLocation);
  const [jobs, setJobs] = useState<ReedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [selectedJob, setSelectedJob] = useState<ReedJob | null>(null);
  const [internalJobs, setInternalJobs] = useState<InternalJob[]>([]);
  const [selectedInternalJob, setSelectedInternalJob] = useState<InternalJob | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [filterSalaryMin, setFilterSalaryMin] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationLabel, setLocationLabel] = useState(defaultLocation);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const locationRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(() => {
    if (!hasProfile && typeof window !== "undefined") {
      return localStorage.getItem("jobs-intro-dismissed") !== "true";
    }
    return false;
  });

  function dismissIntro() {
    if (typeof window !== "undefined") {
      localStorage.setItem("jobs-intro-dismissed", "true");
    }
    setShowIntro(false);
  }

  function tabCount(id: TabId) {
    return jobs.filter((j) => {
      if (id === "remote") return j.locationName?.toLowerCase().includes("remote");
      if (id === "fulltime") return !j.partTime;
      if (id === "parttime") return j.partTime;
      return true;
    }).length;
  }

  const filteredJobs = jobs.filter((job) => {
    if (activeTab === "remote" && !job.locationName?.toLowerCase().includes("remote")) return false;
    if (activeTab === "fulltime" && job.partTime) return false;
    if (activeTab === "parttime" && !job.partTime) return false;
    if (filterSalaryMin > 0 && job.maximumSalary !== null && job.maximumSalary < filterSalaryMin) return false;
    if (selectedLocation && !job.locationName?.toLowerCase().includes(selectedLocation.toLowerCase())) return false;
    return true;
  });

  const filteredInternalJobs = internalJobs.filter((job) => {
    const mode = job.work_mode?.toLowerCase() ?? "";
    const type = job.employment_type?.toLowerCase() ?? "";
    const loc = job.location?.toLowerCase() ?? "";
    if (activeTab === "remote" && !mode.includes("remote") && !loc.includes("remote")) return false;
    if (activeTab === "fulltime" && type.includes("part")) return false;
    if (activeTab === "parttime" && !type.includes("part")) return false;
    if (filterSalaryMin > 0 && (job.salary_max ?? 0) < filterSalaryMin) return false;
    if (selectedLocation && !loc.includes(selectedLocation.toLowerCase())) return false;
    return true;
  });

  const uniqueLocations = [...new Set(jobs.map((j) => j.locationName).filter(Boolean))].sort() as string[];

  const search = useCallback(async (kw: string, loc: string) => {
    if (!kw.trim()) return;
    setLoading(true);
    setError(null);
    setSelectedJob(null);
    setSelectedInternalJob(null);
    try {
      const params = new URLSearchParams({ keywords: kw, location: loc });
      const [externalRes, internalRes] = await Promise.all([
        fetch(`/api/jobs/search?${params}`),
        fetch(`/api/jobs/internal?${params}`),
      ]);
      const externalData = await externalRes.json();
      const internalData = await internalRes.json();
      if (!externalRes.ok) throw new Error(externalData.error ?? "Search failed");
      setJobs(externalData.jobs ?? []);
      setInternalJobs(internalRes.ok ? (internalData.jobs ?? []) : []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (defaultKeywords) search(defaultKeywords, defaultLocation);
    // Fetch internal jobs and applied IDs in parallel
    fetch("/api/jobs/internal")
      .then((r) => r.ok ? r.json() : { jobs: [] })
      .then((d) => setInternalJobs(d.jobs ?? []));
    fetch("/api/jobs/apply")
      .then((r) => r.ok ? r.json() : { applied: [] })
      .then((d) => setAppliedIds(new Set(d.applied ?? [])));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open a job pre-selected from the Topbar search dropdown
  useEffect(() => {
    const selectId = searchParams.get("select");
    if (!selectId) return;
    const stored = sessionStorage.getItem(`progrize-select-job-${selectId}`);
    if (stored) {
      try {
        setSelectedJob(JSON.parse(stored));
      } catch { /* ignore */ }
      sessionStorage.removeItem(`progrize-select-job-${selectId}`);
    }
    router.replace("/jobs");
  }, [searchParams, router]);

  // Close drawer on Escape, close location dropdown on outside click
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setSelectedJob(null); setSelectedInternalJob(null); setLocationOpen(false); }
    }
    function onMouseDown(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  async function handleApply(job: InternalJob, cvId?: string, cvName?: string) {
    if (appliedIds.has(job.id) || applyingId) return;
    setApplyingId(job.id);
    const res = await fetch("/api/jobs/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_posting_id: job.id, cv_id: cvId ?? null, cv_name: cvName ?? null }),
    });
    if (res.ok) setAppliedIds((prev) => new Set([...prev, job.id]));
    setApplyingId(null);
  }

  async function handleAnalyze(job: ReedJob) {
    setAnalyzingId(job.jobId);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: `${job.jobTitle} at ${job.employerName}\n\nLocation: ${job.locationName}\n\n${job.jobDescription}`,
          job_url: job.jobUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      router.push(`/analyze/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setAnalyzingId(null);
    }
  }

  async function handleSaveToTracker(job: ReedJob) {
    const res = await fetch("/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_title: job.jobTitle,
        company_name: job.employerName,
        source_url: job.jobUrl,
        location: job.locationName,
        status: "saved",
      }),
    });
    if (res.ok) setSavedIds((prev) => new Set([...prev, job.jobId]));
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fafaf8]">

      {/* Page header */}
      <div className="px-8 pt-7 pb-5 flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">
            Jobs for you
          </h1>
          <p className="text-[15px] text-[#5f5d54] mt-[8px]">
            {searched ? (
              <><span className="font-bold">{filteredJobs.length}</span>{" new jobs matching your profile today"}</>
            ) : (
              "Find roles matched to your skills and network"
            )}
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8a877b]" />
            <span className="text-[13px] text-[#8a877b]">Loading...</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-8 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-[45px]">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-[13px] leading-[1.35] pb-[7px] border-b-2 transition-colors ${
                    isActive
                      ? "font-bold text-[#0a2412] border-[#0a2412]"
                      : "font-medium text-[#5f5d54] border-transparent hover:text-[#3d3c36]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          {searched && (
            <p className="text-[13px] text-[#5f5d54]">
              <span className="font-bold">{filteredJobs.length} </span>
              <span className="font-normal">job match</span>
            </p>
          )}
        </div>
        <div className="h-px bg-[#eceae3] w-full" />
      </div>

      {/* Filter chips */}
      <div className="px-8 pt-[19px] pb-[8px] flex gap-[12px] flex-wrap shrink-0">
        {SALARY_CHIPS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilterSalaryMin(filterSalaryMin === value ? 0 : value)}
            className={`h-[32px] px-[8px] rounded-[10px] text-[11px] font-medium border transition-colors ${
              filterSalaryMin === value
                ? "bg-[#0a2412] text-white border-[#0a2412]"
                : "bg-white text-[#5f5d54] border-[#eceae3] hover:border-[#c0bdb4]"
            }`}
          >
            {label}
          </button>
        ))}
        {hasProfile && skills.slice(0, 6).map((skill) => (
          <button
            key={skill}
            onClick={() => search(skill, location)}
            className={`h-[32px] px-[8px] rounded-[10px] text-[11px] font-medium border transition-colors ${
              keywords.toLowerCase() === skill.toLowerCase()
                ? "bg-[#c6f46b] text-[#0a2412] border-[#c6f46b]"
                : "bg-white text-[#5f5d54] border-[#eceae3] hover:border-[#c0bdb4]"
            }`}
          >
            {skill}
          </button>
        ))}
        {/* Location dropdown */}
        <div ref={locationRef} className="relative">
          <button
            onClick={() => setLocationOpen((o) => !o)}
            className={`h-[32px] px-[10px] rounded-[10px] text-[11px] font-medium border flex items-center gap-[5px] transition-colors ${
              locationLabel
                ? "bg-[#0a2412] text-white border-[#0a2412]"
                : "bg-white text-[#5f5d54] border-[#eceae3] hover:border-[#c0bdb4]"
            }`}
          >
            <MapPin className="w-[10px] h-[10px] shrink-0" />
            <span>{locationLabel || "Location"}</span>
            {locationLabel
              ? <X className="w-[10px] h-[10px] shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedLocation(""); setLocationLabel(""); search(keywords, ""); }} />
              : <ChevronDown className="w-[10px] h-[10px] shrink-0" />}
          </button>
          {locationOpen && (
            <div className="absolute top-[38px] left-0 w-[220px] bg-white border border-[#eceae3] rounded-[12px] shadow-xl overflow-hidden z-20">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const loc = locationSearch.trim();
                  if (!loc) return;
                  setSelectedLocation(loc);
                  setLocationLabel(loc);
                  setLocationOpen(false);
                  setLocationSearch("");
                  search(keywords, loc);
                }}
                className="px-[10px] py-[8px] border-b border-[#eceae3] flex items-center gap-1.5"
              >
                <input
                  autoFocus
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="City or country..."
                  className="flex-1 text-[12px] text-[#1a1a16] placeholder:text-[#b0ae9f] outline-none bg-transparent"
                />
                {locationSearch && (
                  <button type="submit" className="text-[10px] font-medium text-[#0a2412] shrink-0">Go</button>
                )}
              </form>
              <div className="max-h-[200px] overflow-y-auto">
                {uniqueLocations.length === 0 ? (
                  <p className="px-[12px] py-[10px] text-[12px] text-[#8a877b]">Type a location above</p>
                ) : (
                  <>
                    <p className="px-[12px] pt-[8px] pb-[4px] text-[10px] font-semibold text-[#b0ae9f] uppercase tracking-[0.04em]">From results</p>
                    {uniqueLocations.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => { setSelectedLocation(loc); setLocationLabel(loc); setLocationOpen(false); setLocationSearch(""); }}
                        className={`w-full text-left px-[12px] py-[9px] text-[12px] transition-colors ${
                          selectedLocation === loc
                            ? "bg-[#e8f2eb] text-[#0a2412] font-medium"
                            : "text-[#3d3c36] hover:bg-[#f5f4f0]"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {(filterSalaryMin > 0 || locationLabel) && (
          <button
            onClick={() => { setFilterSalaryMin(0); setSelectedLocation(""); setLocationLabel(""); }}
            className="h-[32px] w-[32px] rounded-[10px] border border-[#eceae3] flex items-center justify-center text-[#b0ae9f] hover:text-[#5f5d54] hover:border-[#c0bdb4] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {error && <p className="text-[12px] text-red-500 self-center">{error}</p>}
      </div>

      {/* 3-column job grid — always fills full width */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-6">

        {/* ── Progrize internal jobs ── */}
        {filteredInternalJobs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              {/* Progrize brand mark */}
              <div className="flex items-end gap-px">
                <div className="w-[3px] h-[4px] bg-[#0a2412] rounded-tl-[4px] rounded-bl-[2px]" />
                <div className="w-[3px] h-[7px] bg-[#0a2412] rounded-tl-[4px] rounded-bl-[2px]" />
                <div className="w-[5px] h-[10px] bg-[#0a2412] rounded-tl-[4px] rounded-bl-[2px]" />
              </div>
              <p className="text-[12px] font-semibold text-[#0a2412] tracking-[0.04em] uppercase">
                Posted on Progrize
              </p>
              <span className="text-[11px] text-[#8a877b] font-mono">{filteredInternalJobs.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-[16px]">
              {filteredInternalJobs.map((job) => {
                const applied = appliedIds.has(job.id);
                const applying = applyingId === job.id;
                const sym = job.salary_currency === "GBP" ? "£" : job.salary_currency === "EUR" ? "€" : "$";
                const salary = job.salary_min && job.salary_max
                  ? `${sym}${(job.salary_min / 1000).toFixed(0)}k–${sym}${(job.salary_max / 1000).toFixed(0)}k`
                  : job.salary_min ? `from ${sym}${(job.salary_min / 1000).toFixed(0)}k` : null;
                const postedDays = Math.floor((Date.now() - new Date(job.posted_at).getTime()) / 86_400_000);
                const postedLabel = postedDays === 0 ? "today" : postedDays < 7 ? `${postedDays}d ago` : `${Math.floor(postedDays / 7)}w ago`;

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedInternalJob(job)}
                    className="bg-white rounded-[14px] flex flex-col ring-1 ring-[#e8f2eb] hover:ring-[#b8dfc4] hover:-translate-y-[2px] hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="p-[20px] flex flex-col gap-[20px] flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-[12px] overflow-hidden">
                        {/* Company avatar with Progrize badge */}
                        <div className="relative shrink-0">
                          <div
                            className="w-[41px] h-[41px] rounded-[10px] flex items-center justify-center text-white text-[14px] font-bold"
                            style={{ backgroundColor: companyColor(job.company_name) }}
                          >
                            {job.company_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-[4px] -right-[4px] w-[16px] h-[16px] rounded-[5px] bg-[#0a2412] flex items-center justify-center border-[1.5px] border-white">
                            <div className="flex items-end gap-[1px]">
                              <div className="w-[2px] h-[3px] bg-[#dee2df] rounded-tl-[1px]" />
                              <div className="w-[2px] h-[5px] bg-[#dee2df] rounded-tl-[1px]" />
                              <div className="w-[2px] h-[7px] bg-[#dee2df] rounded-tl-[1px]" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[17px] font-semibold text-[#0a2412] leading-[20px] truncate">{job.title}</p>
                          <p className="text-[12px] text-[#5f5d54] leading-[16px] truncate mt-[4px]">
                            {[job.company_name, job.location].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-[6px]">
                        {job.work_mode && (
                          <span className="border border-[#d0ebd8] bg-[#f0f9f3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#1a5c30] leading-[16px] capitalize">
                            {job.work_mode}
                          </span>
                        )}
                        {job.employment_type && (
                          <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54] leading-[16px]">
                            {job.employment_type}
                          </span>
                        )}
                        {salary && (
                          <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54] leading-[16px]">
                            {salary}
                          </span>
                        )}
                        {job.required_skills.slice(0, 2).map((sk) => (
                          <span key={sk} className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54] leading-[16px]">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-[#eceae3]" />

                    <div className="p-[20px] flex items-center gap-[8px]">
                      <span className="font-mono text-[11px] text-[#8a877b] leading-[16px] shrink-0">{postedLabel}</span>
                      <div className="flex-1" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApply(job); }}
                        disabled={applied || applying}
                        className={`h-[33px] px-4 rounded-[10px] text-[12px] font-medium transition shrink-0 flex items-center gap-1.5 ${
                          applied
                            ? "bg-[#e8f2eb] text-[#0a2412] cursor-default"
                            : "bg-[#0a2412] text-[#dee2df] hover:bg-[#142e1c]"
                        }`}
                      >
                        {applied ? <><Check className="w-3 h-3" /> Applied</> : applying ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-3 gap-[16px]">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white rounded-[14px] animate-pulse flex flex-col p-[20px] gap-[24px]">
                <div className="flex gap-[12px] items-center">
                  <div className="w-[41px] h-[41px] rounded-[10px] bg-[#eceae3] shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-[#eceae3] rounded-full w-3/4 mb-2" />
                    <div className="h-3 bg-[#eceae3] rounded-full w-1/2" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-[22px] bg-[#eceae3] rounded-full w-14" />
                  <div className="h-[22px] bg-[#eceae3] rounded-full w-20" />
                </div>
                <div className="h-px bg-[#eceae3]" />
                <div className="flex gap-2">
                  <div className="h-[33px] bg-[#eceae3] rounded-[10px] w-20" />
                  <div className="h-[33px] bg-[#eceae3] rounded-[10px] w-14 ml-auto" />
                  <div className="h-[33px] bg-[#eceae3] rounded-[10px] w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !searched && (
          <div className="bg-white rounded-[14px] p-14 text-center">
            <p className="text-[14px] font-semibold text-[#1a1a16] mb-1">Search for roles</p>
            <p className="text-[13px] text-[#8a877b]">Use the search bar above to find live jobs.</p>
          </div>
        )}

        {!loading && searched && filteredJobs.length === 0 && filteredInternalJobs.length === 0 && (
          <div className="bg-white rounded-[14px] p-14 text-center">
            <p className="text-[14px] font-semibold text-[#1a1a16] mb-1">No roles found</p>
            <p className="text-[13px] text-[#8a877b]">Try different keywords or clear your filters.</p>
          </div>
        )}

        {!loading && filteredJobs.length > 0 && (
          <div className="grid grid-cols-3 gap-[16px] pb-4">
            {filteredJobs.map((job) => {
              const salary = salaryLabel(job.minimumSalary, job.maximumSalary, job.currency);
              const isSelected = selectedJob?.jobId === job.jobId;
              const meta = [job.employerName, job.locationName, job.partTime ? "part-time" : "full-time"]
                .filter(Boolean).join(" · ");

              return (
                <div
                  key={job.jobId}
                  onClick={() => setSelectedJob(isSelected ? null : job)}
                  className={`bg-white rounded-[14px] flex flex-col transition-all cursor-pointer ${
                    isSelected ? "ring-2 ring-[#0a2412]" : "hover:ring-1 hover:ring-[#eceae3] hover:-translate-y-[2px] hover:shadow-sm"
                  }`}
                >
                  <div className="p-[20px] flex flex-col gap-[24px] flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-[12px] overflow-hidden">
                      <CompanyLogo name={job.employerName} size={41} rounded={10} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[17px] font-semibold text-[#0a2412] leading-[20px] truncate">
                          {job.jobTitle}
                        </p>
                        <p className="text-[12px] text-[#5f5d54] leading-[16px] truncate mt-[4px]">
                          {meta}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveToTracker(job); }}
                        disabled={savedIds.has(job.jobId)}
                        aria-label={savedIds.has(job.jobId) ? "Saved" : "Save"}
                        className={`w-[30px] h-[30px] rounded-[10px] border shrink-0 flex items-center justify-center transition-colors ${
                          savedIds.has(job.jobId)
                            ? "border-[#0a2412] bg-[#0a2412] text-white"
                            : "border-[#eceae3] text-[#b0ae9f] hover:border-[#c0bdb4] hover:text-[#5f5d54]"
                        }`}
                      >
                        {savedIds.has(job.jobId)
                          ? <BookmarkCheck className="w-[15px] h-[15px]" />
                          : <Bookmark className="w-[15px] h-[15px]" />}
                      </button>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-[6px]">
                      {job.locationName && (
                        <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54] leading-[16px]">
                          {job.locationName}
                        </span>
                      )}
                      <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54] leading-[16px]">
                        {job.partTime ? "part-time" : "full-time"}
                      </span>
                      {salary && (
                        <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54] leading-[16px]">
                          {salary}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#eceae3]" />

                  {/* Footer */}
                  <div className="p-[20px] flex items-center gap-[8px]">
                    <div className="h-[33px] px-[9px] rounded-[10px] bg-[#c6f46b] text-[#0a2412] text-[11px] font-mono flex items-center shrink-0">
                      analyze fit
                    </div>
                    <span className="font-mono text-[11px] text-[#8a877b] leading-[16px] shrink-0">
                      · {timeAgo(job.date)}
                    </span>
                    <div className="flex-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedJob(isSelected ? null : job); }}
                      className="h-[33px] w-[62px] rounded-[10px] bg-white border border-[#dddbd2] text-[#0a2412] text-[12px] font-medium hover:border-[#c0bdb4] transition shrink-0"
                    >
                      view
                    </button>
                    <a
                      href={job.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="h-[33px] w-[66px] rounded-[10px] bg-[#0a2412] text-[#fafaf8] text-[12px] font-medium hover:bg-[#0a2412]/90 transition flex items-center justify-center shrink-0"
                    >
                      apply
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Job detail drawer ── */}
      {selectedJob && (
        <JobDrawer
          job={selectedJob}
          isSaved={savedIds.has(selectedJob.jobId)}
          onSave={() => handleSaveToTracker(selectedJob)}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {/* ── Internal job drawer ── */}
      {selectedInternalJob && (
        <InternalJobDrawer
          job={selectedInternalJob}
          isApplied={appliedIds.has(selectedInternalJob.id)}
          applying={applyingId === selectedInternalJob.id}
          onApply={(cvId, cvName) => handleApply(selectedInternalJob, cvId, cvName)}
          onClose={() => setSelectedInternalJob(null)}
        />
      )}

      {/* ── New-user intro overlay ── */}
      {showIntro && (
        <div className="fixed top-0 left-[240px] right-0 bottom-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-[#f4f9f5] border border-[#f1ffd7] rounded-[20px] w-[760px] max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col gap-[19px] p-[16px]">

            {/* Hero */}
            <div className="h-[240px] rounded-[20px] relative overflow-hidden shrink-0 flex items-center justify-center">
              {/* Banner image */}
              <img
                src="/modalbanner.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark overlay for text legibility */}
              <div className="absolute inset-0 bg-[#0a2412]/55" />
              <div className="relative z-10 text-center px-8">
                <p className="text-[#c6f46b] text-[12px] font-mono mb-4 tracking-[0.04em] opacity-90">progrize jobs</p>
                <p className="text-white text-[30px] font-normal tracking-[-0.04em] leading-[1.2]">
                  Find roles matched to you.<br />Apply smarter, not harder.
                </p>
              </div>
            </div>

            {/* Title */}
            <div className="flex items-end gap-3 px-2">
              <p className="text-[52px] text-[#061810] tracking-[-0.095em] leading-none font-normal">Jobs for you</p>
              <p className="text-[32px] text-[#565656] tracking-[-0.04em] leading-none font-normal pb-1">Features</p>
            </div>

            {/* Description */}
            <p className="text-[13px] text-[#5f5d54] leading-[20px] px-2">
              Upload your CV and let Progrize match you to live roles. Get an AI fit score on every job, apply in one click, and track everything from a single dashboard.
            </p>

            {/* Feature list */}
            <div className="flex flex-col gap-[10px] px-2">
              {[
                { Icon: ScanSearch, text: "AI fit score — see how well each role matches your profile before you apply" },
                { Icon: BriefcaseBusiness, text: "Live job search — roles pulled from Reed and matched to your skills" },
                { Icon: BookOpen, text: "One-click apply — apply to any role using your uploaded CV instantly" },
                { Icon: LayoutList, text: "Application tracker — save roles and track every stage in your pipeline" },
              ].map(({ Icon, text }) => (
                <div key={text} className="flex items-start gap-[10px]">
                  <div className="w-[28px] h-[28px] rounded-[8px] bg-[#e8f2eb] flex items-center justify-center shrink-0 mt-[1px]">
                    <Icon className="w-[14px] h-[14px] text-[#0a2412]" />
                  </div>
                  <p className="text-[13px] text-[#061810] leading-[20px]">{text}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-2 pb-2">
              <button
                onClick={dismissIntro}
                className="h-[39px] w-[146px] bg-[#0a2412] text-[#fafaf8] text-[14px] rounded-[10px] hover:bg-[#0a2412]/90 transition-colors"
              >
                Explore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
