"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, Check, ChevronDown, Loader2, FileText, AlertCircle,
  Download, Sparkles, Award, Zap, ListChecks, Wrench,
} from "lucide-react";
import type { InternalJob } from "@/app/api/jobs/internal/route";
import { companyColor } from "@/lib/job-colors";

interface CvFile { id: string; file_name: string; parse_status: string; }

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
  job: InternalJob;
  isApplied: boolean;
  applying: boolean;
  onApply: (cvId: string, cvName: string) => void;
  onClose: () => void;
}

export default function InternalJobDrawer({ job, isApplied, applying, onApply, onClose }: Props) {
  const [cvList, setCvList] = useState<CvFile[]>([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [cvOpen, setCvOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [tailored, setTailored] = useState<TailoredCV | null>(null);
  const [tailoredResumeId, setTailoredResumeId] = useState<string | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"docx" | "pdf" | null>(null);
  const [scoreAnimated, setScoreAnimated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const cvRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!result) { setScoreAnimated(false); return; }
    const id = requestAnimationFrame(() => setScoreAnimated(true));
    return () => cancelAnimationFrame(id);
  }, [result]);

  useEffect(() => {
    fetch("/api/cv/list")
      .then((r) => r.json())
      .then((d) => {
        const all: CvFile[] = d.files ?? [];
        setCvList(all);
        if (all.length > 0) setSelectedCvId(all[0].id);
      })
      .catch(() => {});
  }, []);

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
    setAnalyzing(true);
    setAnalyzeError(null);
    setResult(null);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: job.description,
          job_url: null,
          cv_id: selectedCvId || undefined,
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

  async function handleTailor() {
    if (!result) return;
    setTailoring(true);
    setTailorError(null);
    try {
      const res = await fetch("/api/jobs/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: result.jobId }),
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
          body: JSON.stringify({ tailored, jobTitle: job.title, company: job.company_name, format }),
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
        a.download = `CV — ${job.title} at ${job.company_name}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // silent
    } finally {
      setDownloading(null);
    }
  }

  const selectedCv = cvList.find((c) => c.id === selectedCvId);
  const sym = job.salary_currency === "GBP" ? "£" : job.salary_currency === "EUR" ? "€" : "$";
  const salary = job.salary_min && job.salary_max
    ? `${sym}${(job.salary_min / 1000).toFixed(0)}k–${sym}${(job.salary_max / 1000).toFixed(0)}k`
    : job.salary_min ? `from ${sym}${(job.salary_min / 1000).toFixed(0)}k` : null;

  return (
    <>
      <div className="fixed top-0 left-[240px] right-0 bottom-0 z-40 bg-black/10" onClick={onClose} />

      <div className="fixed top-0 right-0 h-screen w-[500px] z-50 bg-white border-l border-[#eceae3] overflow-y-auto no-scrollbar shadow-2xl animate-slide-in-right">
        <div className="p-[20px] flex flex-col gap-[20px]">

          {/* Header */}
          <div className="flex items-start gap-[12px] pt-[8px]">
            <div className="relative shrink-0">
              <div
                className="w-[56px] h-[56px] rounded-[12px] flex items-center justify-center text-white text-[18px] font-bold"
                style={{ backgroundColor: companyColor(job.company_name) }}
              >
                {job.company_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-[5px] -right-[5px] w-[20px] h-[20px] rounded-[6px] bg-[#0a2412] flex items-center justify-center border-2 border-white">
                <div className="flex items-end gap-[1.5px]">
                  <div className="w-[2px] h-[4px] bg-[#dee2df] rounded-tl-[1px]" />
                  <div className="w-[2px] h-[6px] bg-[#dee2df] rounded-tl-[1px]" />
                  <div className="w-[2px] h-[8px] bg-[#dee2df] rounded-tl-[1px]" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-[4px]">
                <span className="text-[9px] font-semibold tracking-[0.08em] uppercase text-[#1a5c30] bg-[#e8f2eb] px-2 py-0.5 rounded-full">
                  Posted on Progrize
                </span>
              </div>
              <p className="text-[20px] font-semibold text-[#0a2412] leading-[24px] tracking-[-0.03em]">{job.title}</p>
              <p className="text-[12px] text-[#5f5d54] leading-[16px] mt-[4px]">
                {[job.company_name, job.location, job.work_mode, job.employment_type].filter(Boolean).join(" · ")}
              </p>
              {salary && <p className="text-[12px] text-[#5f5d54] leading-[16px]">{salary}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-[29px] h-[29px] rounded-[10px] border border-[#eceae3] flex items-center justify-center text-[#b0ae9f] hover:text-[#5f5d54] transition-colors shrink-0"
            >
              <X className="w-[17px] h-[17px]" />
            </button>
          </div>

          {/* Apply action */}
          <button
            onClick={() => onApply(selectedCvId, selectedCv?.file_name ?? "")}
            disabled={isApplied || applying}
            className={`h-[38px] px-[16px] text-[13px] font-medium rounded-[10px] transition flex items-center gap-2 w-fit ${
              isApplied
                ? "bg-[#e8f2eb] text-[#0a2412] cursor-default"
                : "bg-[#0a2412] text-[#dee2df] hover:bg-[#142e1c]"
            }`}
          >
            {isApplied
              ? <><Check className="w-3.5 h-3.5" /> Applied</>
              : applying
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying…</>
              : "Apply Now"}
          </button>

          <div className="h-px bg-[#eceae3]" />

          {/* Fit score card */}
          <div className="bg-[#0a2412] rounded-[20px] p-[16px] flex flex-col gap-[12px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-mono text-[#c6f46b] opacity-70">your fit score</p>
              <p className="text-[11px] text-[#8a877b] text-right leading-[15px] max-w-[130px]">Based on your cv and skills</p>
            </div>

            {/* CV selector */}
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
                    <span className="flex-1 text-left truncate">{selectedCv?.file_name ?? "Select CV"}</span>
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

            {!result && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center gap-[8px] text-[#c6f46b] hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {analyzing ? <Loader2 className="w-[20px] h-[20px] animate-spin" /> : <Zap className="w-[20px] h-[20px]" />}
                <span className="text-[28px] font-semibold tracking-[-0.04em] leading-none">
                  {analyzing ? "Analyzing…" : "Analyze"}
                </span>
              </button>
            )}

            {analyzeError && (
              <div className="flex items-center gap-[6px] text-[#ff8a8a] text-[12px]">
                <AlertCircle className="w-[13px] h-[13px] shrink-0" />{analyzeError}
              </div>
            )}

            {result && (
              <>
                {/* Score ring */}
                <div className="flex items-center gap-[12px]">
                  <div className="relative w-[56px] h-[56px] shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#c6f46b" strokeWidth="3"
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
                  <button onClick={() => { setResult(null); setAnalyzeError(null); }} className="ml-auto text-[#8a877b] hover:text-[#b0ae9f] transition-colors">
                    <X className="w-[14px] h-[14px]" />
                  </button>
                </div>

                {/* Breakdown bars */}
                <div className="flex flex-col gap-[6px]">
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
                        <div className="h-full rounded-full" style={{
                          width: scoreAnimated ? `${value}%` : "0%",
                          backgroundColor: value >= 70 ? "#c6f46b" : value >= 45 ? "#f9a825" : "#ff8a8a",
                          transition: "width 700ms cubic-bezier(0.22,1,0.36,1)",
                        }} />
                      </div>
                      <span className="text-[9px] font-mono text-[#8a877b] w-[24px] text-right shrink-0">{value}%</span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-white/10" />

                {result.matchingSkills.length > 0 && (
                  <div>
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

                {result.missingSkills.length > 0 && (
                  <div>
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

                {result.recommendations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono text-[#8a877b] mb-[6px]">to improve</p>
                    <div className="flex flex-col gap-[5px]">
                      {result.recommendations.map((r, i) => (
                        <p key={i} className="text-[11px] text-[#8a877b] leading-[16px]">• {r}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-white/10" />

                {!tailored && (
                  <div className="flex flex-col gap-[8px]">
                    <button
                      onClick={handleTailor}
                      disabled={tailoring}
                      className="flex items-center gap-[8px] text-[#c6f46b] hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      {tailoring ? <Loader2 className="w-[16px] h-[16px] animate-spin" /> : <Sparkles className="w-[16px] h-[16px]" />}
                      <span className="text-[14px] font-semibold tracking-[-0.02em]">
                        {tailoring ? "Tailoring CV…" : "Tailor CV for this job"}
                      </span>
                    </button>
                    <p className="text-[10px] text-[#8a877b] leading-[14px]">
                      Rewrites your existing CV bullets using keywords from this job description
                    </p>
                    {tailorError && (
                      <div className="flex items-center gap-[6px] text-[#ff8a8a] text-[11px]">
                        <AlertCircle className="w-[12px] h-[12px] shrink-0" />{tailorError}
                      </div>
                    )}
                  </div>
                )}

                {tailored && (
                  <div className="flex flex-col gap-[10px]">
                    <p className="text-[10px] font-mono text-[#c6f46b] opacity-70">tailored cv ready</p>
                    {tailored.headline && (
                      <div className="bg-white/5 rounded-[10px] px-[10px] py-[8px]">
                        <p className="text-[10px] font-mono text-[#8a877b] mb-[3px]">new headline</p>
                        <p className="text-[12px] text-[#dee2df] leading-[16px] font-medium">{tailored.headline}</p>
                      </div>
                    )}
                    {tailored.summary && (
                      <div className="bg-white/5 rounded-[10px] px-[10px] py-[8px]">
                        <p className="text-[10px] font-mono text-[#8a877b] mb-[3px]">new summary</p>
                        <p className="text-[11px] text-[#b0ae9f] leading-[16px] line-clamp-3">{tailored.summary}</p>
                      </div>
                    )}
                    {tailored.key_changes.length > 0 && (
                      <div className="flex flex-col gap-[4px]">
                        {tailored.key_changes.slice(0, 4).map((c, i) => (
                          <p key={i} className="text-[11px] text-[#8a877b] leading-[15px]">• {c}</p>
                        ))}
                      </div>
                    )}
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
                            {downloading === fmt ? <Loader2 className="w-[11px] h-[11px] animate-spin" /> : <Download className="w-[11px] h-[11px]" />}
                            {fmt === "docx" ? "Word (.docx)" : "PDF"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-px bg-white/10" />
                    <button onClick={() => window.open("/cv-optimiser", "_blank")} className="flex items-center gap-[8px] group">
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

            {!result && !analyzing && (
              <>
                <div className="h-px bg-white/10" />
                {["Jobs matched to your skills and uploaded CV", "AI fit score analysis for every role", "Tailor your CV to this specific role", "Apply directly on Progrize"].map((text) => (
                  <div key={text} className="flex items-center gap-[8px]">
                    <Check className="w-[13px] h-[13px] text-[#c6f46b] shrink-0" />
                    <p className="text-[12px] text-[#dee2df] leading-[18px]">{text}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-[11px] font-mono text-[#8a877b] mb-[8px]">job description</p>
            <p className="text-[13px] text-[#3d3c36] leading-[21px] whitespace-pre-line">{job.description}</p>
          </div>

          {/* Required skills */}
          {job.required_skills.length > 0 && (
            <div>
              <div className="flex items-center gap-[6px] mb-[8px]">
                <Wrench className="w-[11px] h-[11px] text-[#0a2412]" />
                <p className="text-[10px] font-mono text-[#3d3c36] font-semibold">required skills</p>
              </div>
              <div className="flex flex-wrap gap-[6px]">
                {job.required_skills.map((s) => (
                  <span key={s} className="px-[9px] py-[3px] rounded-full border border-[#eceae3] bg-white text-[11px] text-[#3d3c36] font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Seniority / type badges */}
          {(job.seniority || job.employment_type || job.work_mode) && (
            <div className="flex gap-[6px] flex-wrap">
              {job.seniority && (
                <span className="px-[10px] py-[4px] rounded-full bg-[#f0fad8] text-[#3a6b10] text-[11px] font-medium">{job.seniority}</span>
              )}
              {job.employment_type && (
                <span className="px-[10px] py-[4px] rounded-full bg-[#f5f4f0] text-[#5f5d54] text-[11px] font-medium">{job.employment_type}</span>
              )}
              {job.work_mode && (
                <span className="px-[10px] py-[4px] rounded-full bg-[#e8f2eb] text-[#1a5c30] text-[11px] font-medium capitalize">{job.work_mode}</span>
              )}
            </div>
          )}

          {/* "Posted on Progrize" footer note */}
          <div className="flex items-center gap-2 pb-4">
            <div className="flex items-end gap-px">
              <div className="w-[3px] h-[4px] bg-[#8a877b] rounded-tl-[3px] rounded-bl-[1px]" />
              <div className="w-[3px] h-[6px] bg-[#8a877b] rounded-tl-[3px] rounded-bl-[1px]" />
              <div className="w-[4px] h-[9px] bg-[#8a877b] rounded-tl-[3px] rounded-bl-[1px]" />
            </div>
            <p className="text-[11px] text-[#8a877b]">Posted directly on Progrize</p>
          </div>

        </div>
      </div>
    </>
  );
}
