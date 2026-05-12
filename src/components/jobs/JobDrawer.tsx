"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bookmark, BookmarkCheck, X, ExternalLink, Zap,
  Check, ChevronDown, Loader2, FileText, AlertCircle, Download, Sparkles, Award,
  ListChecks, Wrench, Star, GraduationCap, Gift, Building2,
} from "lucide-react";
import type { ReedJob } from "@/app/api/jobs/search/route";
import type { JobDetails } from "@/app/api/jobs/details/route";
import { companyColor } from "@/lib/job-colors";
import CompanyLogo from "@/components/ui/CompanyLogo";

interface CvFile {
  id: string;
  file_name: string;
  parse_status: string;
}

interface ATSBreakdown {
  overall: number;
  keyword_coverage: number;
  required_skill_coverage: number;
  section_completeness: number;
  measurable_impact: number;
  role_title_alignment: number;
}

interface AnalysisResult {
  jobId: string;
  atsScore: ATSBreakdown;
  matchingSkills: string[];
  missingSkills: string[];
  missingKeywords: string[];
  recommendations: string[];
}

interface TailoredCV {
  headline: string;
  summary: string;
  experience: Array<{
    company_name: string;
    job_title: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    rewritten_bullets: string[];
  }>;
  skills_to_highlight: string[];
  skills_to_add: string[];
  missing_skills_gap: string[];
  key_changes: string[];
}


interface Props {
  job: ReedJob;
  isSaved: boolean;
  onSave: () => void;
  onClose: () => void;
}

function salaryLabel(min: number | null, max: number | null, currency: string | null) {
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  if (min && max) return `${sym}${(min / 1000).toFixed(0)}k–${sym}${(max / 1000).toFixed(0)}k`;
  if (min) return `from ${sym}${(min / 1000).toFixed(0)}k`;
  if (max) return `up to ${sym}${(max / 1000).toFixed(0)}k`;
  return null;
}

function decodeHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent ?? el.innerText ?? "";
}

export default function JobDrawer({ job, isSaved, onSave, onClose }: Props) {
  const [cvList, setCvList] = useState<CvFile[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [cvOpen, setCvOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [tailored, setTailored] = useState<TailoredCV | null>(null);
  const [tailoredResumeId, setTailoredResumeId] = useState<string | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"docx" | "pdf" | null>(null);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [scoreAnimated, setScoreAnimated] = useState(false);
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const cvRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!result) { setScoreAnimated(false); return; }
    const id = requestAnimationFrame(() => setScoreAnimated(true));
    return () => cancelAnimationFrame(id);
  }, [result]);

  // Fetch structured job details
  useEffect(() => {
    setJobDetails(null);
    setDetailsLoading(true);
    const params = new URLSearchParams({
      jobId: String(job.jobId),
      description: job.jobDescription ?? "",
    });
    fetch(`/api/jobs/details?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.details) setJobDetails(d.details); })
      .catch(() => {})
      .finally(() => setDetailsLoading(false));
  }, [job.jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch user's CV list
  useEffect(() => {
    fetch("/api/cv/list")
      .then((r) => r.json())
      .then((d) => {
        const all: CvFile[] = d.files ?? [];
        const parsed = all.filter((f) =>
          f.parse_status === "completed" || f.parse_status === "done" || f.parse_status === "processing"
        );
        setCvList(parsed.length > 0 ? parsed : all);
        if (all.length > 0) setSelectedCvId(all[0].id);
      })
      .catch(() => {});
  }, []);

  // Close CV dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (cvRef.current && !cvRef.current.contains(e.target as Node)) setCvOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const newCv: CvFile = { id: data.resumeFileId, file_name: file.name, parse_status: "processing" };
      setCvList((prev) => [newCv, ...prev]);
      setSelectedCvId(newCv.id);
      setCvOpen(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAnalyze() {
    if (!job.jobDescription?.trim()) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setResult(null);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: decodeHtml(job.jobDescription),
          job_url: job.jobUrl,
          cv_id: selectedCvId || undefined,
          jobDetails: jobDetails ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult({
        jobId: data.jobId,
        atsScore: {
          overall: data.atsScore?.overall ?? 0,
          keyword_coverage: data.atsScore?.keyword_coverage ?? 0,
          required_skill_coverage: data.atsScore?.required_skill_coverage ?? 0,
          section_completeness: data.atsScore?.section_completeness ?? 0,
          measurable_impact: data.atsScore?.measurable_impact ?? 0,
          role_title_alignment: data.atsScore?.role_title_alignment ?? 0,
        },
        matchingSkills: data.matchingSkills ?? [],
        missingSkills: data.missingSkills ?? [],
        missingKeywords: data.missingKeywords ?? [],
        recommendations: data.recommendations ?? [],
      });
      setTailored(null);
      setTailorError(null);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function downloadTailored(format: "docx" | "pdf") {
    if (!tailored) return;
    setDownloading(format);
    try {
      let res: Response;
      if (tailoredResumeId) {
        res = await fetch(`/api/cv/export?tailoredResumeId=${tailoredResumeId}&format=${format}`);
      } else {
        res = await fetch("/api/cv/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tailored, jobTitle: job.jobTitle, company: job.employerName, format }),
        });
      }
      if (!res.ok) throw new Error("Export failed");
      if (format === "pdf") {
        const html = await res.text();
        const win = window.open("", "_blank");
        win?.document.write(html);
        win?.document.close();
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CV — ${job.jobTitle} at ${job.employerName}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // silent — user will see nothing downloaded
    } finally {
      setDownloading(null);
    }
  }

  const salary = salaryLabel(job.minimumSalary, job.maximumSalary, job.currency);
  const selectedCv = cvList.find((c) => c.id === selectedCvId);
  const color = companyColor(job.employerName);
  const description = decodeHtml(job.jobDescription ?? "").trim();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed top-0 left-[240px] right-0 bottom-0 z-40 bg-black/10" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-screen w-[500px] z-50 bg-white border-l border-[#eceae3] overflow-y-auto no-scrollbar shadow-2xl animate-slide-in-right">
        <div className="p-[20px] flex flex-col gap-[20px]">

          {/* Header */}
          <div className="flex items-start gap-[12px] pt-[8px]">
            <CompanyLogo name={job.employerName} size={64} rounded={10} fontSize={18} />
            <div className="flex-1 min-w-0">
              <p className="text-[20px] font-semibold text-[#0a2412] leading-[24px] tracking-[-0.03em]">{job.jobTitle}</p>
              <p className="text-[12px] text-[#5f5d54] leading-[16px] mt-[4px]">
                {[job.employerName, job.locationName, job.partTime ? "part-time" : "full-time"].filter(Boolean).join(" · ")}
              </p>
              {salary && <p className="text-[12px] text-[#5f5d54] leading-[16px]">{salary}</p>}
            </div>
            <div className="flex items-center gap-[8px] shrink-0">
              <button
                onClick={onSave}
                disabled={isSaved}
                className={`w-[30px] h-[30px] rounded-[10px] border flex items-center justify-center transition-colors ${
                  isSaved ? "border-[#0a2412] bg-[#0a2412] text-white" : "border-[#eceae3] text-[#b0ae9f] hover:border-[#c0bdb4]"
                }`}
              >
                {isSaved ? <BookmarkCheck className="w-[15px] h-[15px]" /> : <Bookmark className="w-[15px] h-[15px]" />}
              </button>
              <button
                onClick={onClose}
                className="w-[29px] h-[29px] rounded-[10px] border border-[#eceae3] flex items-center justify-center text-[#b0ae9f] hover:text-[#5f5d54] transition-colors"
              >
                <X className="w-[17px] h-[17px]" />
              </button>
            </div>
          </div>

          {/* Action row */}
          <div className="flex flex-col gap-[10px]">
            <div className="flex gap-[8px]">
              <button
                onClick={() => { setShowApplyPrompt(true); setTracked(false); }}
                className="h-[38px] px-[16px] bg-[#0a2412] text-[#fafaf8] text-[13px] font-medium rounded-[10px] hover:bg-[#0a2412]/90 transition flex items-center"
              >
                Apply with my CV
              </button>
              <a href={job.jobUrl} target="_blank" rel="noreferrer"
                className="h-[38px] px-[14px] border border-[#eceae3] text-[#3d3c36] text-[13px] font-medium rounded-[10px] hover:border-[#c0bdb4] transition flex items-center">
                Share
              </a>
              <a href={job.jobUrl} target="_blank" rel="noreferrer"
                className="w-[38px] h-[38px] border border-[#eceae3] rounded-[10px] hover:border-[#c0bdb4] transition flex items-center justify-center text-[#5f5d54]">
                <ExternalLink className="w-[14px] h-[14px]" />
              </a>
            </div>

            {/* Tracker prompt */}
            {showApplyPrompt && !tracked && (
              <div className="flex items-center justify-between bg-[#f5f4f0] rounded-[12px] px-[14px] py-[10px]">
                <p className="text-[12px] text-[#3d3c36]">Add to your tracker?</p>
                <div className="flex items-center gap-[6px]">
                  <button
                    disabled={tracking}
                    onClick={async () => {
                      setTracking(true);
                      try {
                        await fetch("/api/tracker", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            job_title: job.jobTitle,
                            company_name: job.employerName,
                            source_url: job.jobUrl,
                            location: job.locationName ?? null,
                            salary_range: salary ?? null,
                            status: "applied",
                          }),
                        });
                        setTracked(true);
                      } finally {
                        setTracking(false);
                        window.open(job.jobUrl, "_blank", "noreferrer");
                        setShowApplyPrompt(false);
                      }
                    }}
                    className="h-[28px] px-[12px] bg-[#0a2412] text-[#fafaf8] text-[11px] font-medium rounded-[8px] hover:bg-[#0a2412]/90 transition disabled:opacity-50 flex items-center gap-[5px]"
                  >
                    {tracking ? <Loader2 className="w-[11px] h-[11px] animate-spin" /> : <Check className="w-[11px] h-[11px]" />}
                    Yes, track it
                  </button>
                  <button
                    onClick={() => {
                      setShowApplyPrompt(false);
                      window.open(job.jobUrl, "_blank", "noreferrer");
                    }}
                    className="h-[28px] px-[12px] border border-[#eceae3] text-[#5f5d54] text-[11px] font-medium rounded-[8px] hover:border-[#c0bdb4] transition"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {tracked && (
              <div className="flex items-center gap-[6px] px-[14px] py-[10px] bg-[#f0fad8] rounded-[12px] animate-scale-in">
                <Check className="w-[13px] h-[13px] text-[#0a2412] shrink-0" />
                <p className="text-[12px] text-[#0a2412]">Added to tracker</p>
              </div>
            )}
          </div>

          <div className="h-px bg-[#eceae3]" />

          {/* ATS / Fit score card */}
          <div className="bg-[#0a2412] rounded-[20px] p-[16px] flex flex-col gap-[12px]">

            {/* Card header */}
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-mono text-[#c6f46b] opacity-70">your fit score</p>
              <p className="text-[11px] text-[#8a877b] text-right leading-[15px] max-w-[130px]">
                Based on your cv and skills
              </p>
            </div>

            {/* CV selector — always visible */}
            <div ref={cvRef} className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleUpload}
              />
              {cvList.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-[36px] px-[12px] bg-white/10 border border-white/20 rounded-[10px] flex items-center gap-[8px] text-[12px] text-[#8a877b] hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  {uploading
                    ? <Loader2 className="w-[13px] h-[13px] shrink-0 animate-spin" />
                    : <FileText className="w-[13px] h-[13px] shrink-0" />}
                  <span>{uploading ? "Uploading…" : "Upload a CV to analyze fit"}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setCvOpen((o) => !o)}
                    className="w-full h-[36px] px-[12px] bg-white/10 border border-white/20 rounded-[10px] flex items-center gap-[8px] text-[12px] text-[#dee2df] hover:bg-white/15 transition-colors"
                  >
                    <FileText className="w-[13px] h-[13px] text-[#c6f46b] shrink-0" />
                    <span className="flex-1 text-left truncate">
                      {selectedCv?.file_name ?? "Select CV"}
                    </span>
                    <ChevronDown className="w-[12px] h-[12px] text-[#8a877b] shrink-0" />
                  </button>
                  {cvOpen && (
                    <div className="absolute top-[40px] left-0 right-0 bg-white border border-[#eceae3] rounded-[12px] shadow-xl overflow-hidden z-10">
                      {cvList.map((cv) => (
                        <button
                          key={cv.id}
                          onClick={() => { setSelectedCvId(cv.id); setCvOpen(false); setResult(null); }}
                          className={`w-full text-left px-[12px] py-[10px] text-[12px] flex items-center gap-[8px] transition-colors ${
                            selectedCvId === cv.id ? "bg-[#e8f2eb] text-[#0a2412] font-medium" : "text-[#3d3c36] hover:bg-[#f5f4f0]"
                          }`}
                        >
                          <FileText className="w-[12px] h-[12px] shrink-0 text-[#8a877b]" />
                          <span className="truncate">{cv.file_name}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => { setCvOpen(false); fileInputRef.current?.click(); }}
                        disabled={uploading}
                        className="w-full text-left px-[12px] py-[10px] text-[12px] flex items-center gap-[8px] text-[#0a2412] border-t border-[#f0ede8] hover:bg-[#f5f4f0] transition-colors font-medium disabled:opacity-50"
                      >
                        {uploading
                          ? <Loader2 className="w-[12px] h-[12px] shrink-0 animate-spin" />
                          : <span className="w-[12px] h-[12px] shrink-0 flex items-center justify-center text-[14px] leading-none">+</span>}
                        <span>{uploading ? "Uploading…" : "Upload new CV"}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
              {uploadError && <p className="text-[10px] text-red-400 mt-[6px]">{uploadError}</p>}
            </div>

            {/* Analyze button */}
            {!result && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center gap-[8px] text-[#c6f46b] hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {analyzing
                  ? <Loader2 className="w-[20px] h-[20px] animate-spin" />
                  : <Zap className="w-[20px] h-[20px]" />}
                <span className="text-[28px] font-semibold tracking-[-0.04em] leading-none">
                  {analyzing ? "Analyzing…" : "Analyze"}
                </span>
              </button>
            )}

            {analyzeError && (
              <div className="flex items-center gap-[6px] text-[#ff8a8a] text-[12px]">
                <AlertCircle className="w-[13px] h-[13px] shrink-0" />
                {analyzeError}
              </div>
            )}

            {/* Results */}
            {result && (
              <>
                {/* Score */}
                <div className="flex items-center gap-[12px]">
                  <div className="relative w-[56px] h-[56px] shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke="#c6f46b" strokeWidth="3"
                        strokeDasharray={scoreAnimated ? `${result.atsScore.overall} ${100 - result.atsScore.overall}` : "0 100"}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)" }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-[#c6f46b]">
                      {result.atsScore.overall}
                    </span>
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-[#dee2df]">ATS Score</p>
                    <p className="text-[11px] text-[#8a877b] mt-[2px]">
                      {result.atsScore.overall >= 70 ? "Strong match" : result.atsScore.overall >= 50 ? "Partial match" : "Low match"}
                    </p>
                  </div>
                  <button
                    onClick={() => { setResult(null); setAnalyzeError(null); }}
                    className="ml-auto text-[#8a877b] hover:text-[#b0ae9f] transition-colors"
                  >
                    <X className="w-[14px] h-[14px]" />
                  </button>
                </div>

                {/* ATS breakdown bars */}
                <div className="flex flex-col gap-[6px] animate-fade-up" style={{ animationDelay: "20ms" }}>
                  {([
                    { label: "keyword match",   value: result.atsScore.keyword_coverage },
                    { label: "required skills", value: result.atsScore.required_skill_coverage },
                    { label: "impact metrics",  value: result.atsScore.measurable_impact },
                    { label: "cv sections",     value: result.atsScore.section_completeness },
                    { label: "title fit",       value: result.atsScore.role_title_alignment },
                  ] as const).map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-[8px]">
                      <span className="text-[9px] font-mono text-[#8a877b] w-[82px] shrink-0">{label}</span>
                      <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: scoreAnimated ? `${value}%` : "0%",
                            backgroundColor: value >= 70 ? "#c6f46b" : value >= 45 ? "#f9a825" : "#ff8a8a",
                            transition: "width 700ms cubic-bezier(0.22,1,0.36,1)",
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-[#8a877b] w-[24px] text-right shrink-0">{value}%</span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-white/10" />

                {/* Matching skills */}
                {result.matchingSkills.length > 0 && (
                  <div className="animate-fade-up" style={{ animationDelay: "40ms" }}>
                    <p className="text-[10px] font-mono text-[#c6f46b] opacity-70 mb-[6px]">matching</p>
                    <div className="flex flex-col gap-[5px]">
                      {result.matchingSkills.slice(0, 6).map((s) => (
                        <div key={s} className="flex items-center gap-[8px]">
                          <Check className="w-[12px] h-[12px] text-[#c6f46b] shrink-0" />
                          <span className="text-[12px] text-[#dee2df]">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing skills */}
                {result.missingSkills.length > 0 && (
                  <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
                    <p className="text-[10px] font-mono text-[#ff8a8a] opacity-70 mb-[6px]">missing</p>
                    <div className="flex flex-col gap-[5px]">
                      {result.missingSkills.slice(0, 6).map((s) => (
                        <div key={s} className="flex items-center gap-[8px]">
                          <X className="w-[12px] h-[12px] text-[#ff8a8a] shrink-0" />
                          <span className="text-[12px] text-[#dee2df]">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing keywords */}
                {result.missingKeywords.length > 0 && (
                  <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
                    <p className="text-[10px] font-mono text-[#f9a825] opacity-80 mb-[6px]">missing keywords</p>
                    <div className="flex flex-wrap gap-[6px]">
                      {result.missingKeywords.slice(0, 10).map((k) => (
                        <span key={k} className="px-[8px] py-[3px] rounded-full bg-white/10 border border-white/15 text-[11px] text-[#dee2df]">{k}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
                    <p className="text-[10px] font-mono text-[#8a877b] mb-[6px]">to improve</p>
                    <div className="flex flex-col gap-[5px]">
                      {result.recommendations.map((r, i) => (
                        <p key={i} className="text-[11px] text-[#8a877b] leading-[16px]">• {r}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-white/10" />

                {/* Tailor CV */}
                {!tailored && (
                  <div className="flex flex-col gap-[8px] animate-fade-up" style={{ animationDelay: "200ms" }}>
                    <button
                      onClick={async () => {
                        setTailoring(true);
                        setTailorError(null);
                        try {
                          const res = await fetch("/api/jobs/tailor", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ jobId: result.jobId, jobDetails: jobDetails ?? undefined }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error ?? "Tailoring failed");
                          setTailored(data.tailored);
                          setTailoredResumeId(data.tailoredResumeId ?? null);
                        } catch (err) {
                          setTailorError(err instanceof Error ? err.message : "Tailoring failed");
                        } finally {
                          setTailoring(false);
                        }
                      }}
                      disabled={tailoring}
                      className="flex items-center gap-[8px] text-[#c6f46b] hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      {tailoring
                        ? <Loader2 className="w-[16px] h-[16px] animate-spin" />
                        : <Sparkles className="w-[16px] h-[16px]" />}
                      <span className="text-[14px] font-semibold tracking-[-0.02em]">
                        {tailoring ? "Tailoring CV…" : "Tailor CV for this job"}
                      </span>
                    </button>
                    <p className="text-[10px] text-[#8a877b] leading-[14px]">
                      Rewrites your existing CV bullets using keywords from this job description
                    </p>
                    {tailorError && (
                      <div className="flex items-center gap-[6px] text-[#ff8a8a] text-[11px]">
                        <AlertCircle className="w-[12px] h-[12px] shrink-0" />
                        {tailorError}
                      </div>
                    )}
                  </div>
                )}

                {/* Tailored result */}
                {tailored && (
                  <div className="flex flex-col gap-[10px] animate-fade-up">
                    <p className="text-[10px] font-mono text-[#c6f46b] opacity-70">tailored cv ready</p>

                    {/* Headline preview */}
                    {tailored.headline && (
                      <div className="bg-white/5 rounded-[10px] px-[10px] py-[8px]">
                        <p className="text-[10px] font-mono text-[#8a877b] mb-[3px]">new headline</p>
                        <p className="text-[12px] text-[#dee2df] leading-[16px] font-medium">{tailored.headline}</p>
                      </div>
                    )}

                    {/* Summary preview */}
                    {tailored.summary && (
                      <div className="bg-white/5 rounded-[10px] px-[10px] py-[8px]">
                        <p className="text-[10px] font-mono text-[#8a877b] mb-[3px]">new summary</p>
                        <p className="text-[11px] text-[#b0ae9f] leading-[16px] line-clamp-3">{tailored.summary}</p>
                      </div>
                    )}

                    {/* Key changes */}
                    {tailored.key_changes.length > 0 && (
                      <div className="flex flex-col gap-[4px]">
                        {tailored.key_changes.slice(0, 4).map((c, i) => (
                          <p key={i} className="text-[11px] text-[#8a877b] leading-[15px]">• {c}</p>
                        ))}
                      </div>
                    )}

                    {/* Skills added */}
                    {tailored.skills_to_add.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono text-[#c6f46b] opacity-50 mb-[5px]">skills added</p>
                        <div className="flex flex-wrap gap-[5px]">
                          {tailored.skills_to_add.slice(0, 8).map((s) => (
                            <span key={s} className="px-[7px] py-[2px] rounded-full bg-white/10 border border-white/15 text-[10px] text-[#dee2df]">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Download format picker — always shown, no tailoredResumeId gate */}
                    <div className="flex flex-col gap-[6px]">
                      <p className="text-[10px] text-[#8a877b]">Download as:</p>
                      <div className="flex gap-[8px]">
                        {(["docx", "pdf"] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => downloadTailored(fmt)}
                            disabled={downloading !== null}
                            className="flex items-center gap-[6px] px-[12px] h-[30px] rounded-full bg-white/10 border border-white/20 text-[11px] text-[#dee2df] hover:bg-white/20 transition-colors disabled:opacity-50"
                          >
                            {downloading === fmt
                              ? <Loader2 className="w-[11px] h-[11px] animate-spin" />
                              : <Download className="w-[11px] h-[11px]" />}
                            {fmt === "docx" ? "Word (.docx)" : "PDF"}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#5f5d54] leading-[14px]">PDF opens print dialog — use "Save as PDF"</p>
                    </div>

                    {/* Expert CV Optimiser */}
                    <div className="h-px bg-white/10" />
                    <button
                      onClick={() => window.open("/cv-optimiser", "_blank")}
                      className="flex items-center gap-[8px] group"
                    >
                      <div className="w-[28px] h-[28px] rounded-[8px] bg-[#f9a825]/15 flex items-center justify-center shrink-0">
                        <Award className="w-[13px] h-[13px] text-[#f9a825]" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[12px] font-medium text-[#dee2df] group-hover:text-white transition-colors">Expert CV Optimiser</p>
                        <p className="text-[10px] text-[#5f5d54] leading-[13px]">Deep section-by-section rewrite by AI specialist</p>
                      </div>
                      <span className="text-[9px] font-semibold px-[6px] py-[2px] rounded-full bg-[#f9a825]/20 text-[#f9a825] shrink-0">PRO</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Default feature list when no analysis yet */}
            {!result && !analyzing && (
              <>
                <div className="h-px bg-white/10" />
                {[
                  "Jobs matched to your skills and uploaded CV",
                  "AI fit score analysis for every role",
                  "One-click apply using your profile CV",
                  "Save roles and track all applications in one place",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-[8px]">
                    <Check className="w-[13px] h-[13px] text-[#c6f46b] shrink-0" />
                    <p className="text-[12px] text-[#dee2df] leading-[18px]">{text}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Structured job details */}
          {detailsLoading && (
            <div className="flex flex-col gap-[14px]">
              {[120, 90, 100, 80].map((w, i) => (
                <div key={i} className="flex flex-col gap-[8px]">
                  <div className="h-[10px] bg-[#eceae3] rounded animate-pulse" style={{ width: w }} />
                  <div className="h-[12px] bg-[#eceae3] rounded animate-pulse w-full" />
                  <div className="h-[12px] bg-[#eceae3] rounded animate-pulse w-4/5" />
                  <div className="h-[12px] bg-[#eceae3] rounded animate-pulse w-3/5" />
                </div>
              ))}
            </div>
          )}

          {jobDetails && !detailsLoading && (
            <div className="flex flex-col gap-[20px]">

              {/* Seniority + type badges */}
              {(jobDetails.seniority || jobDetails.employment_type) && (
                <div className="flex gap-[6px] flex-wrap animate-fade-up">
                  {jobDetails.seniority && (
                    <span className="px-[10px] py-[4px] rounded-full bg-[#f0fad8] text-[#3a6b10] text-[11px] font-medium">
                      {jobDetails.seniority}
                    </span>
                  )}
                  {jobDetails.employment_type && (
                    <span className="px-[10px] py-[4px] rounded-full bg-[#f5f4f0] text-[#5f5d54] text-[11px] font-medium">
                      {jobDetails.employment_type}
                    </span>
                  )}
                </div>
              )}

              {/* About company */}
              {jobDetails.about_company && (
                <div className="animate-fade-up" style={{ animationDelay: "30ms" }}>
                  <div className="flex items-center gap-[6px] mb-[6px]">
                    <Building2 className="w-[11px] h-[11px] text-[#8a877b]" />
                    <p className="text-[10px] font-mono text-[#8a877b]">about the company</p>
                  </div>
                  <p className="text-[12px] text-[#5f5d54] leading-[19px]">{jobDetails.about_company}</p>
                </div>
              )}

              {/* Responsibilities */}
              {jobDetails.responsibilities.length > 0 && (
                <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
                  <div className="flex items-center gap-[6px] mb-[8px]">
                    <ListChecks className="w-[11px] h-[11px] text-[#0a2412]" />
                    <p className="text-[10px] font-mono text-[#3d3c36] font-semibold">key responsibilities</p>
                  </div>
                  <ul className="flex flex-col gap-[5px]">
                    {jobDetails.responsibilities.map((r, i) => (
                      <li key={i} className="flex items-start gap-[8px]">
                        <span className="w-[4px] h-[4px] rounded-full bg-[#c6f46b] mt-[7px] shrink-0" />
                        <span className="text-[12px] text-[#3d3c36] leading-[18px]">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required skills */}
              {jobDetails.required_skills.length > 0 && (
                <div className="animate-fade-up" style={{ animationDelay: "90ms" }}>
                  <div className="flex items-center gap-[6px] mb-[8px]">
                    <Wrench className="w-[11px] h-[11px] text-[#0a2412]" />
                    <p className="text-[10px] font-mono text-[#3d3c36] font-semibold">required skills</p>
                  </div>
                  <div className="flex flex-wrap gap-[6px]">
                    {jobDetails.required_skills.map((s) => (
                      <span key={s} className="px-[9px] py-[3px] rounded-full border border-[#eceae3] bg-white text-[11px] text-[#3d3c36] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Nice to have */}
              {jobDetails.nice_to_have.length > 0 && (
                <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
                  <div className="flex items-center gap-[6px] mb-[8px]">
                    <Star className="w-[11px] h-[11px] text-[#f9a825]" />
                    <p className="text-[10px] font-mono text-[#8a877b]">nice to have</p>
                  </div>
                  <div className="flex flex-wrap gap-[6px]">
                    {jobDetails.nice_to_have.map((s) => (
                      <span key={s} className="px-[9px] py-[3px] rounded-full border border-[#eceae3] text-[11px] text-[#8a877b]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Qualifications */}
              {jobDetails.qualifications.length > 0 && (
                <div className="animate-fade-up" style={{ animationDelay: "150ms" }}>
                  <div className="flex items-center gap-[6px] mb-[8px]">
                    <GraduationCap className="w-[11px] h-[11px] text-[#0a2412]" />
                    <p className="text-[10px] font-mono text-[#3d3c36] font-semibold">qualifications</p>
                  </div>
                  <ul className="flex flex-col gap-[5px]">
                    {jobDetails.qualifications.map((q, i) => (
                      <li key={i} className="flex items-start gap-[8px]">
                        <span className="w-[4px] h-[4px] rounded-full bg-[#8a877b] mt-[7px] shrink-0" />
                        <span className="text-[12px] text-[#3d3c36] leading-[18px]">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Benefits */}
              {jobDetails.benefits.length > 0 && (
                <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
                  <div className="flex items-center gap-[6px] mb-[8px]">
                    <Gift className="w-[11px] h-[11px] text-[#7c6af7]" />
                    <p className="text-[10px] font-mono text-[#8a877b]">benefits</p>
                  </div>
                  <ul className="flex flex-col gap-[5px]">
                    {jobDetails.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-[8px]">
                        <Check className="w-[10px] h-[10px] text-[#7c6af7] mt-[4px] shrink-0" />
                        <span className="text-[12px] text-[#5f5d54] leading-[18px]">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Fallback: raw description if details failed */}
          {!detailsLoading && !jobDetails && description && (
            <div>
              <p className="text-[11px] font-mono text-[#8a877b] mb-[8px]">job description</p>
              <p className="text-[13px] text-[#3d3c36] leading-[21px] whitespace-pre-line">
                {description}
              </p>
            </div>
          )}

          <a href={job.jobUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-[6px] text-[12px] text-[#5f5d54] hover:text-[#0a2412] transition-colors pb-4">
            <ExternalLink className="w-[12px] h-[12px]" />
            View full listing on Reed
          </a>
        </div>
      </div>
    </>
  );
}
