"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bookmark, BookmarkCheck, X, MapPin, ChevronDown, Check,
  Building2, Users,
} from "lucide-react";
import type { ReedJob } from "@/app/api/jobs/search/route";
import type { InternalJob } from "@/app/api/jobs/internal/route";
import { companyColor } from "@/lib/job-colors";
import JobDrawer from "@/components/jobs/JobDrawer";
import InternalJobDrawer from "@/components/jobs/InternalJobDrawer";

type CategoryTab = "jobs" | "people" | "companies" | "community";
type TypeChip = "all" | "remote" | "fulltime" | "parttime";

interface Person {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
  connection_count: number;
  follower_count: number;
}

interface Company {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
  logo_url: string | null;
  website: string | null;
  size: string | null;
  description: string | null;
}

const TYPE_CHIPS: { id: TypeChip; label: string }[] = [
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

function Avatar({ name, avatarUrl, size = 44 }: { name: string | null; avatarUrl: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name ?? ""} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35, backgroundColor: companyColor(name ?? "?") }}
    >
      {initials}
    </div>
  );
}

interface Props { query: string }

export default function SearchClient({ query }: Props) {
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("jobs");
  const [typeChip, setTypeChip] = useState<TypeChip>("all");
  const [filterSalaryMin, setFilterSalaryMin] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  const [jobs, setJobs] = useState<ReedJob[]>([]);
  const [internalJobs, setInternalJobs] = useState<InternalJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ReedJob | null>(null);
  const [selectedInternalJob, setSelectedInternalJob] = useState<InternalJob | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  // Fetch jobs on query change
  useEffect(() => {
    if (!query.trim()) return;
    setJobsLoading(true);
    setJobs([]);
    setInternalJobs([]);
    const params = new URLSearchParams({ keywords: query });
    Promise.all([
      fetch(`/api/jobs/search?${params}`).then((r) => r.json()),
      fetch(`/api/jobs/internal?${params}`).then((r) => r.json()),
      fetch("/api/jobs/apply").then((r) => r.ok ? r.json() : { applied: [] }),
    ])
      .then(([external, internal, applied]) => {
        setJobs(external.jobs ?? []);
        setInternalJobs(internal.jobs ?? []);
        setAppliedIds(new Set(applied.applied ?? []));
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, [query]);

  // Fetch people when tab is active
  useEffect(() => {
    if (categoryTab !== "people" || !query.trim()) return;
    setPeopleLoading(true);
    fetch(`/api/people?q=${encodeURIComponent(query)}&limit=30`)
      .then((r) => r.json())
      .then((d) => setPeople(d.people ?? []))
      .catch(() => {})
      .finally(() => setPeopleLoading(false));
  }, [categoryTab, query]);

  // Fetch companies when tab is active
  useEffect(() => {
    if (categoryTab !== "companies" || !query.trim()) return;
    setCompaniesLoading(true);
    fetch(`/api/companies?q=${encodeURIComponent(query)}&limit=30`)
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []))
      .catch(() => {})
      .finally(() => setCompaniesLoading(false));
  }, [categoryTab, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setSelectedJob(null); setSelectedInternalJob(null); setLocationOpen(false); }
    }
    function onMouseDown(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setLocationOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouseDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onMouseDown); };
  }, []);

  async function handleSave(job: ReedJob) {
    if (savedIds.has(job.jobId)) return;
    await fetch("/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_title: job.jobTitle, company_name: job.employerName, source_url: job.jobUrl, location: job.locationName, status: "saved" }),
    });
    setSavedIds((prev) => new Set([...prev, job.jobId]));
  }

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

  const uniqueLocations = [...new Set([
    ...jobs.map((j) => j.locationName),
    ...internalJobs.map((j) => j.location),
  ].filter(Boolean))].sort() as string[];
  const filteredLocations = uniqueLocations.filter((l) => l.toLowerCase().includes(locationSearch.toLowerCase()));

  const filteredJobs = jobs.filter((job) => {
    if (typeChip === "remote" && !job.locationName?.toLowerCase().includes("remote")) return false;
    if (typeChip === "fulltime" && job.partTime) return false;
    if (typeChip === "parttime" && !job.partTime) return false;
    if (filterSalaryMin > 0 && job.maximumSalary !== null && job.maximumSalary < filterSalaryMin) return false;
    if (selectedLocation && job.locationName !== selectedLocation) return false;
    return true;
  });

  const filteredInternalJobs = internalJobs.filter((job) => {
    const mode = job.work_mode?.toLowerCase() ?? "";
    const type = job.employment_type?.toLowerCase() ?? "";
    const loc = job.location?.toLowerCase() ?? "";
    if (typeChip === "remote" && !mode.includes("remote") && !loc.includes("remote")) return false;
    if (typeChip === "fulltime" && type.includes("part")) return false;
    if (typeChip === "parttime" && !type.includes("part")) return false;
    if (filterSalaryMin > 0 && (job.salary_max ?? 0) < filterSalaryMin) return false;
    if (selectedLocation && !loc.includes(selectedLocation.toLowerCase())) return false;
    return true;
  });

  const TABS: { id: CategoryTab; label: string; count?: number }[] = [
    { id: "jobs", label: "Jobs", count: jobs.length + internalJobs.length || undefined },
    { id: "people", label: "People", count: people.length || undefined },
    { id: "companies", label: "Companies", count: companies.length || undefined },
    { id: "community", label: "Community" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fafaf8]">

      {/* Header */}
      <div className="px-8 pt-7 pb-5 shrink-0">
        <h1 className="text-[48px] font-normal tracking-[-0.04em] text-[#0a2412] leading-[52px]">
          {query ? <><span className="text-[#8a877b]">results for </span>{query}</> : "Search"}
        </h1>
      </div>

      {/* Category tabs */}
      <div className="px-8 shrink-0 border-b border-[#eceae3]">
        <div className="flex gap-[40px]">
          {TABS.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setCategoryTab(id)}
              className={`text-[13px] pb-[10px] transition-colors border-b-2 -mb-px ${
                categoryTab === id
                  ? "font-bold text-[#0a2412] border-[#0a2412]"
                  : "font-medium text-[#5f5d54] border-transparent hover:text-[#3d3c36]"
              }`}
            >
              {label}
              {count != null && count > 0 && (
                <span className="ml-2 font-mono text-[10px] text-[#8a877b]">{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Jobs ── */}
      {categoryTab === "jobs" && (
        <>
          <div className="px-8 pt-[16px] pb-[10px] flex items-center gap-[8px] flex-wrap shrink-0">
            {TYPE_CHIPS.map(({ id, label }) => (
              <button key={id} onClick={() => setTypeChip(id)}
                className={`h-[32px] px-[12px] rounded-full text-[11px] font-medium border transition-colors ${
                  typeChip === id ? "bg-[#0a2412] text-white border-[#0a2412]" : "bg-white text-[#5f5d54] border-[#eceae3] hover:border-[#c0bdb4]"
                }`}>{label}</button>
            ))}
            <div className="w-px h-[20px] bg-[#eceae3] mx-[2px]" />
            {SALARY_CHIPS.map(({ label, value }) => (
              <button key={value} onClick={() => setFilterSalaryMin(filterSalaryMin === value ? 0 : value)}
                className={`h-[32px] px-[12px] rounded-full text-[11px] font-medium border transition-colors ${
                  filterSalaryMin === value ? "bg-[#0a2412] text-white border-[#0a2412]" : "bg-white text-[#5f5d54] border-[#eceae3] hover:border-[#c0bdb4]"
                }`}>{label}</button>
            ))}
            <div ref={locationRef} className="relative">
              <button onClick={() => setLocationOpen((o) => !o)}
                className={`h-[32px] px-[12px] rounded-full text-[11px] font-medium border flex items-center gap-[5px] transition-colors ${
                  selectedLocation ? "bg-[#0a2412] text-white border-[#0a2412]" : "bg-white text-[#5f5d54] border-[#eceae3] hover:border-[#c0bdb4]"
                }`}>
                <MapPin className="w-[10px] h-[10px] shrink-0" />
                <span>{selectedLocation || "Location"}</span>
                {selectedLocation
                  ? <X className="w-[10px] h-[10px] shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedLocation(""); }} />
                  : <ChevronDown className="w-[10px] h-[10px] shrink-0" />}
              </button>
              {locationOpen && (
                <div className="absolute top-[38px] left-0 w-[220px] bg-white border border-[#eceae3] rounded-[12px] shadow-xl overflow-hidden z-20">
                  <div className="px-[10px] py-[8px] border-b border-[#eceae3]">
                    <input autoFocus type="text" value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Search city or country..."
                      className="w-full text-[12px] text-[#1a1a16] placeholder:text-[#b0ae9f] outline-none bg-transparent" />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredLocations.length === 0 && <p className="px-[12px] py-[10px] text-[12px] text-[#8a877b]">No locations found</p>}
                    {filteredLocations.map((loc) => (
                      <button key={loc} onClick={() => { setSelectedLocation(loc); setLocationOpen(false); setLocationSearch(""); }}
                        className={`w-full text-left px-[12px] py-[9px] text-[12px] transition-colors ${
                          selectedLocation === loc ? "bg-[#e8f2eb] text-[#0a2412] font-medium" : "text-[#3d3c36] hover:bg-[#f5f4f0]"
                        }`}>{loc}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(filterSalaryMin > 0 || selectedLocation || typeChip !== "all") && (
              <button onClick={() => { setFilterSalaryMin(0); setSelectedLocation(""); setTypeChip("all"); }}
                className="h-[32px] w-[32px] rounded-full border border-[#eceae3] flex items-center justify-center text-[#b0ae9f] hover:text-[#5f5d54] hover:border-[#c0bdb4] transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="flex-1" />
            {jobs.length + internalJobs.length > 0 && (
              <p className="text-[13px] text-[#5f5d54] shrink-0">
                <span className="font-bold">{filteredJobs.length + filteredInternalJobs.length} </span>job match
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-6">
            {jobsLoading && (
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
                      <div className="h-[33px] bg-[#eceae3] rounded-[10px] w-16 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!jobsLoading && filteredInternalJobs.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-end gap-px">
                    <div className="w-[3px] h-[4px] bg-[#0a2412] rounded-tl-[4px] rounded-bl-[2px]" />
                    <div className="w-[3px] h-[7px] bg-[#0a2412] rounded-tl-[4px] rounded-bl-[2px]" />
                    <div className="w-[5px] h-[10px] bg-[#0a2412] rounded-tl-[4px] rounded-bl-[2px]" />
                  </div>
                  <p className="text-[12px] font-semibold text-[#0a2412] tracking-[0.04em] uppercase">Posted on Progrize</p>
                  <span className="text-[11px] text-[#8a877b] font-mono">{filteredInternalJobs.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-[16px]">
                  {filteredInternalJobs.map((job) => {
                    const applied = appliedIds.has(job.id);
                    const applying = applyingId === job.id;
                    const salary = salaryLabel(job.salary_min, job.salary_max, job.salary_currency);
                    return (
                      <div key={job.id} onClick={() => setSelectedInternalJob(job)}
                        className="bg-white rounded-[14px] flex flex-col ring-1 ring-[#e8f2eb] hover:ring-[#b8dfc4] hover:-translate-y-[2px] hover:shadow-sm transition-all cursor-pointer">
                        <div className="p-[20px] flex flex-col gap-[16px] flex-1">
                          <div className="flex items-center gap-[12px] overflow-hidden">
                            <div className="w-[41px] h-[41px] rounded-[10px] flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                              style={{ backgroundColor: companyColor(job.company_name) }}>
                              {job.company_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[17px] font-semibold text-[#0a2412] leading-[20px] truncate">{job.title}</p>
                              <p className="text-[12px] text-[#5f5d54] leading-[16px] truncate mt-[4px]">
                                {[job.company_name, job.location].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-[6px]">
                            {job.work_mode && <span className="border border-[#d0ebd8] bg-[#f0f9f3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#1a5c30] capitalize">{job.work_mode}</span>}
                            {job.employment_type && <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">{job.employment_type}</span>}
                            {salary && <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">{salary}</span>}
                            {job.required_skills.slice(0, 2).map((s) => (
                              <span key={s} className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div className="h-px bg-[#eceae3]" />
                        <div className="p-[20px] flex items-center gap-[8px]">
                          <span className="font-mono text-[11px] text-[#8a877b] shrink-0">· {timeAgo(job.posted_at)}</span>
                          <div className="flex-1" />
                          <button onClick={(e) => { e.stopPropagation(); handleApply(job); }} disabled={applied || applying}
                            className={`h-[33px] px-4 rounded-[10px] text-[12px] font-medium transition shrink-0 flex items-center gap-1.5 ${
                              applied ? "bg-[#e8f2eb] text-[#0a2412] cursor-default" : "bg-[#0a2412] text-[#dee2df] hover:bg-[#142e1c]"
                            }`}>
                            {applied ? <><Check className="w-3 h-3" /> Applied</> : applying ? "Applying..." : "Apply"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!jobsLoading && filteredJobs.length === 0 && filteredInternalJobs.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-[14px] font-semibold text-[#1a1a16] mb-1">
                  {jobs.length + internalJobs.length === 0 ? "No jobs found" : "No matches for this filter"}
                </p>
                <p className="text-[13px] text-[#8a877b]">
                  {jobs.length + internalJobs.length === 0 ? "Try different keywords." : "Try adjusting your filters."}
                </p>
              </div>
            )}

            {!jobsLoading && filteredJobs.length > 0 && (
              <div className="grid grid-cols-3 gap-[16px]">
                {filteredJobs.map((job) => {
                  const isSelected = selectedJob?.jobId === job.jobId;
                  const salary = salaryLabel(job.minimumSalary, job.maximumSalary, job.currency);
                  return (
                    <div key={job.jobId} onClick={() => setSelectedJob(isSelected ? null : job)}
                      className={`bg-white rounded-[14px] flex flex-col cursor-pointer transition-all ${
                        isSelected ? "ring-2 ring-[#0a2412]" : "hover:ring-1 hover:ring-[#eceae3] hover:-translate-y-[2px] hover:shadow-sm"
                      }`}>
                      <div className="p-[20px] flex flex-col gap-[16px] flex-1">
                        <div className="flex items-center gap-[12px] overflow-hidden">
                          <div className="w-[41px] h-[41px] rounded-[10px] flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                            style={{ backgroundColor: companyColor(job.employerName) }}>
                            {job.employerName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[17px] font-semibold text-[#0a2412] leading-[20px] truncate">{job.jobTitle}</p>
                            <p className="text-[12px] text-[#5f5d54] leading-[16px] truncate mt-[4px]">
                              {[job.employerName, job.locationName, job.partTime ? "part-time" : "full-time"].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleSave(job); }}
                            className={`w-[30px] h-[30px] rounded-[10px] border shrink-0 flex items-center justify-center transition-colors ${
                              savedIds.has(job.jobId) ? "border-[#0a2412] bg-[#0a2412] text-white" : "border-[#eceae3] text-[#b0ae9f] hover:border-[#c0bdb4]"
                            }`}>
                            {savedIds.has(job.jobId) ? <BookmarkCheck className="w-[15px] h-[15px]" /> : <Bookmark className="w-[15px] h-[15px]" />}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-[6px]">
                          {job.locationName && <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">{job.locationName}</span>}
                          <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">
                            {job.partTime ? "part-time" : "full-time"}
                          </span>
                          {salary && <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">{salary}</span>}
                        </div>
                      </div>
                      <div className="h-px bg-[#eceae3]" />
                      <div className="p-[20px] flex items-center gap-[8px]">
                        <div className="h-[33px] px-[9px] rounded-[10px] bg-[#c6f46b] text-[#0a2412] text-[11px] font-mono flex items-center shrink-0">analyze fit</div>
                        {timeAgo(job.date) && <span className="font-mono text-[11px] text-[#8a877b] shrink-0">· {timeAgo(job.date)}</span>}
                        <div className="flex-1" />
                        <button onClick={(e) => { e.stopPropagation(); setSelectedJob(isSelected ? null : job); }}
                          className="h-[33px] w-[62px] rounded-[10px] bg-white border border-[#dddbd2] text-[#0a2412] text-[12px] font-medium hover:border-[#c0bdb4] transition shrink-0">
                          view
                        </button>
                        <a href={job.jobUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                          className="h-[33px] w-[66px] rounded-[10px] bg-[#0a2412] text-[#fafaf8] text-[12px] font-medium hover:bg-[#0a2412]/90 transition flex items-center justify-center shrink-0">
                          apply
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── People ── */}
      {categoryTab === "people" && (
        <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-6">
          {peopleLoading && (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-[14px] p-5 animate-pulse flex gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#eceae3] shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-[#eceae3] rounded-full w-3/4" />
                    <div className="h-3 bg-[#eceae3] rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!peopleLoading && people.length === 0 && (
            <div className="py-20 text-center">
              <Users className="w-8 h-8 text-[#c0bdb4] mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-[#1a1a16] mb-1">No people found</p>
              <p className="text-[13px] text-[#8a877b]">Try a different name or keyword.</p>
            </div>
          )}
          {!peopleLoading && people.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {people.map((person) => (
                <Link key={person.id} href={`/u/${person.id}`}
                  className="bg-white rounded-[14px] p-5 flex items-start gap-3 hover:-translate-y-[2px] hover:shadow-sm transition-all">
                  <Avatar name={person.full_name} avatarUrl={person.avatar_url} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#0a2412] leading-[19px] truncate">
                      {person.full_name ?? "Unknown"}
                    </p>
                    {person.headline && (
                      <p className="text-[12px] text-[#5f5d54] leading-[16px] mt-[3px] line-clamp-2">{person.headline}</p>
                    )}
                    {person.location && (
                      <p className="text-[11px] text-[#8a877b] mt-[5px] flex items-center gap-1">
                        <MapPin className="w-[9px] h-[9px] shrink-0" />{person.location}
                      </p>
                    )}
                    <div className="flex gap-3 mt-[6px]">
                      <span className="text-[10px] text-[#8a877b]">{person.follower_count} followers</span>
                      <span className="text-[10px] text-[#8a877b]">{person.connection_count} connections</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Companies ── */}
      {categoryTab === "companies" && (
        <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-6">
          {companiesLoading && (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-[14px] p-5 animate-pulse flex gap-3">
                  <div className="w-11 h-11 rounded-[10px] bg-[#eceae3] shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-[#eceae3] rounded-full w-3/4" />
                    <div className="h-3 bg-[#eceae3] rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!companiesLoading && companies.length === 0 && (
            <div className="py-20 text-center">
              <Building2 className="w-8 h-8 text-[#c0bdb4] mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-[#1a1a16] mb-1">No companies found</p>
              <p className="text-[13px] text-[#8a877b]">Try a different name or industry.</p>
            </div>
          )}
          {!companiesLoading && companies.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {companies.map((co) => (
                <Link key={co.id} href={`/company/${co.id}`}
                  className="bg-white rounded-[14px] p-5 flex items-start gap-3 hover:-translate-y-[2px] hover:shadow-sm transition-all">
                  {co.logo_url ? (
                    <img src={co.logo_url} alt={co.name} className="w-11 h-11 rounded-[10px] object-contain border border-[#eceae3] shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-white text-[14px] font-bold shrink-0"
                      style={{ backgroundColor: companyColor(co.name) }}>
                      {co.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#0a2412] leading-[19px] truncate">{co.name}</p>
                    {co.industry && <p className="text-[12px] text-[#5f5d54] mt-[3px] truncate">{co.industry}</p>}
                    <div className="flex flex-wrap gap-2 mt-[6px]">
                      {co.location && (
                        <span className="text-[10px] text-[#8a877b] flex items-center gap-1">
                          <MapPin className="w-[9px] h-[9px] shrink-0" />{co.location}
                        </span>
                      )}
                      {co.size && (
                        <span className="text-[10px] text-[#8a877b] flex items-center gap-1">
                          <Users className="w-[9px] h-[9px] shrink-0" />{co.size} employees
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Community ── */}
      {categoryTab === "community" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#1a1a16] mb-2">Community search coming soon</p>
            <p className="text-[13px] text-[#8a877b]">Discover rooms, discussions, and groups.</p>
          </div>
        </div>
      )}

      {/* Drawers */}
      {selectedJob && (
        <JobDrawer job={selectedJob} isSaved={savedIds.has(selectedJob.jobId)}
          onSave={() => handleSave(selectedJob)} onClose={() => setSelectedJob(null)} />
      )}
      {selectedInternalJob && (
        <InternalJobDrawer job={selectedInternalJob} isApplied={appliedIds.has(selectedInternalJob.id)}
          applying={applyingId === selectedInternalJob.id}
          onApply={(cvId, cvName) => handleApply(selectedInternalJob, cvId, cvName)}
          onClose={() => setSelectedInternalJob(null)} />
      )}
    </div>
  );
}
