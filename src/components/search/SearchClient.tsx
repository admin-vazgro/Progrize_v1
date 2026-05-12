"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bookmark, BookmarkCheck, X, MapPin, ChevronDown,
} from "lucide-react";
import type { ReedJob } from "@/app/api/jobs/search/route";
import { companyColor } from "@/lib/job-colors";
import JobDrawer from "@/components/jobs/JobDrawer";

type CategoryTab = "jobs" | "people" | "community";
type TypeChip = "all" | "remote" | "fulltime" | "parttime";

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
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ReedJob | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!query.trim()) return;
    setLoading(true);
    setJobs([]);
    fetch(`/api/jobs/search?keywords=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setSelectedJob(null); setLocationOpen(false); }
    }
    function onMouseDown(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  async function handleSave(job: ReedJob) {
    if (savedIds.has(job.jobId)) return;
    try {
      await fetch("/api/tracker/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: String(job.jobId), title: job.jobTitle, company: job.employerName, location: job.locationName, url: job.jobUrl }),
      });
      setSavedIds((prev) => new Set([...prev, job.jobId]));
    } catch { /* ignore */ }
  }

  const uniqueLocations = [...new Set(jobs.map((j) => j.locationName).filter(Boolean))].sort() as string[];
  const filteredLocations = uniqueLocations.filter((l) =>
    l.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const filteredJobs = jobs.filter((job) => {
    if (typeChip === "remote" && !job.locationName?.toLowerCase().includes("remote")) return false;
    if (typeChip === "fulltime" && job.partTime) return false;
    if (typeChip === "parttime" && !job.partTime) return false;
    if (filterSalaryMin > 0 && job.maximumSalary !== null && job.maximumSalary < filterSalaryMin) return false;
    if (selectedLocation && job.locationName !== selectedLocation) return false;
    return true;
  });

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
          {(["jobs", "people", "community"] as CategoryTab[]).map((tab) => {
            const isActive = categoryTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setCategoryTab(tab)}
                className={`text-[13px] pb-[10px] capitalize transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "font-bold text-[#0a2412] border-[#0a2412]"
                    : "font-medium text-[#5f5d54] border-transparent hover:text-[#3d3c36]"
                }`}
              >
                {tab}
                {tab === "jobs" && jobs.length > 0 && (
                  <span className="ml-2 font-mono text-[10px] text-[#8a877b]">{jobs.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Jobs tab content */}
      {categoryTab === "jobs" && (
        <>
          {/* Filter row */}
          <div className="px-8 pt-[16px] pb-[10px] flex items-center gap-[8px] flex-wrap shrink-0">

            {/* Type chips */}
            {TYPE_CHIPS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTypeChip(id)}
                className={`h-[32px] px-[12px] rounded-full text-[11px] font-medium border transition-colors ${
                  typeChip === id
                    ? "bg-[#0a2412] text-white border-[#0a2412]"
                    : "bg-white text-[#5f5d54] border-[#eceae3] hover:border-[#c0bdb4]"
                }`}
              >
                {label}
              </button>
            ))}

            <div className="w-px h-[20px] bg-[#eceae3] mx-[2px]" />

            {/* Salary chips */}
            {SALARY_CHIPS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilterSalaryMin(filterSalaryMin === value ? 0 : value)}
                className={`h-[32px] px-[12px] rounded-full text-[11px] font-medium border transition-colors ${
                  filterSalaryMin === value
                    ? "bg-[#0a2412] text-white border-[#0a2412]"
                    : "bg-white text-[#5f5d54] border-[#eceae3] hover:border-[#c0bdb4]"
                }`}
              >
                {label}
              </button>
            ))}

            {/* Location dropdown */}
            <div ref={locationRef} className="relative">
              <button
                onClick={() => setLocationOpen((o) => !o)}
                className={`h-[32px] px-[12px] rounded-full text-[11px] font-medium border flex items-center gap-[5px] transition-colors ${
                  selectedLocation
                    ? "bg-[#0a2412] text-white border-[#0a2412]"
                    : "bg-white text-[#5f5d54] border-[#eceae3] hover:border-[#c0bdb4]"
                }`}
              >
                <MapPin className="w-[10px] h-[10px] shrink-0" />
                <span>{selectedLocation || "Location"}</span>
                {selectedLocation
                  ? <X
                      className="w-[10px] h-[10px] shrink-0"
                      onClick={(e) => { e.stopPropagation(); setSelectedLocation(""); }}
                    />
                  : <ChevronDown className="w-[10px] h-[10px] shrink-0" />
                }
              </button>
              {locationOpen && (
                <div className="absolute top-[38px] left-0 w-[220px] bg-white border border-[#eceae3] rounded-[12px] shadow-xl overflow-hidden z-20">
                  <div className="px-[10px] py-[8px] border-b border-[#eceae3]">
                    <input
                      autoFocus
                      type="text"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Search city or country..."
                      className="w-full text-[12px] text-[#1a1a16] placeholder:text-[#b0ae9f] outline-none bg-transparent"
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredLocations.length === 0 && (
                      <p className="px-[12px] py-[10px] text-[12px] text-[#8a877b]">No locations found</p>
                    )}
                    {filteredLocations.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => { setSelectedLocation(loc); setLocationOpen(false); setLocationSearch(""); }}
                        className={`w-full text-left px-[12px] py-[9px] text-[12px] transition-colors ${
                          selectedLocation === loc
                            ? "bg-[#e8f2eb] text-[#0a2412] font-medium"
                            : "text-[#3d3c36] hover:bg-[#f5f4f0]"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clear all */}
            {(filterSalaryMin > 0 || selectedLocation || typeChip !== "all") && (
              <button
                onClick={() => { setFilterSalaryMin(0); setSelectedLocation(""); setTypeChip("all"); }}
                className="h-[32px] w-[32px] rounded-full border border-[#eceae3] flex items-center justify-center text-[#b0ae9f] hover:text-[#5f5d54] hover:border-[#c0bdb4] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            <div className="flex-1" />
            {jobs.length > 0 && (
              <p className="text-[13px] text-[#5f5d54] shrink-0">
                <span className="font-bold">{filteredJobs.length} </span>job match
              </p>
            )}
          </div>

          {/* Job grid */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-6">
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
                      <div className="h-[33px] bg-[#eceae3] rounded-[10px] w-16 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredJobs.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-[14px] font-semibold text-[#1a1a16] mb-1">
                  {jobs.length === 0 ? "No jobs found" : "No matches for this filter"}
                </p>
                <p className="text-[13px] text-[#8a877b]">
                  {jobs.length === 0 ? "Try different keywords." : "Try adjusting your filters."}
                </p>
              </div>
            )}

            {!loading && filteredJobs.length > 0 && (
              <div className="grid grid-cols-3 gap-[16px]">
                {filteredJobs.map((job) => {
                  const isSelected = selectedJob?.jobId === job.jobId;
                  const color = companyColor(job.employerName);
                  const salary = salaryLabel(job.minimumSalary, job.maximumSalary, job.currency);
                  return (
                    <div
                      key={job.jobId}
                      onClick={() => setSelectedJob(isSelected ? null : job)}
                      className={`bg-white rounded-[14px] flex flex-col cursor-pointer transition-all ${
                        isSelected ? "ring-2 ring-[#0a2412]" : "hover:ring-1 hover:ring-[#eceae3] hover:-translate-y-[2px] hover:shadow-sm"
                      }`}
                    >
                      <div className="p-[20px] flex flex-col gap-[16px] flex-1">
                        <div className="flex items-center gap-[12px] overflow-hidden">
                          <div
                            className="w-[41px] h-[41px] rounded-[10px] flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {job.employerName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[17px] font-semibold text-[#0a2412] leading-[20px] truncate">{job.jobTitle}</p>
                            <p className="text-[12px] text-[#5f5d54] leading-[16px] truncate mt-[4px]">
                              {[job.employerName, job.locationName, job.partTime ? "part-time" : "full-time"].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSave(job); }}
                            className={`w-[30px] h-[30px] rounded-[10px] border shrink-0 flex items-center justify-center transition-colors ${
                              savedIds.has(job.jobId)
                                ? "border-[#0a2412] bg-[#0a2412] text-white"
                                : "border-[#eceae3] text-[#b0ae9f] hover:border-[#c0bdb4]"
                            }`}
                          >
                            {savedIds.has(job.jobId)
                              ? <BookmarkCheck className="w-[15px] h-[15px]" />
                              : <Bookmark className="w-[15px] h-[15px]" />}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-[6px]">
                          {job.locationName && (
                            <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">{job.locationName}</span>
                          )}
                          <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">
                            {job.partTime ? "part-time" : "full-time"}
                          </span>
                          {salary && (
                            <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">{salary}</span>
                          )}
                        </div>
                      </div>
                      <div className="h-px bg-[#eceae3]" />
                      <div className="p-[20px] flex items-center gap-[8px]">
                        <div className="h-[33px] px-[9px] rounded-[10px] bg-[#c6f46b] text-[#0a2412] text-[11px] font-mono flex items-center shrink-0">
                          analyze fit
                        </div>
                        {timeAgo(job.date) && (
                          <span className="font-mono text-[11px] text-[#8a877b] shrink-0">· {timeAgo(job.date)}</span>
                        )}
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
        </>
      )}

      {categoryTab === "people" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#1a1a16] mb-2">People search coming soon</p>
            <p className="text-[13px] text-[#8a877b]">Find and connect with professionals in your field.</p>
          </div>
        </div>
      )}

      {categoryTab === "community" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#1a1a16] mb-2">Community search coming soon</p>
            <p className="text-[13px] text-[#8a877b]">Discover rooms, discussions, and groups.</p>
          </div>
        </div>
      )}

      {/* Job detail drawer */}
      {selectedJob && (
        <JobDrawer
          job={selectedJob}
          isSaved={savedIds.has(selectedJob.jobId)}
          onSave={() => handleSave(selectedJob)}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
