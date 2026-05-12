"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronRight, Loader2, Upload, Check, ArrowLeft, FileText, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";

type Stage = "intro" | "manual" | "cv-upload" | "cv-review" | "done";

interface StepDef {
  key: string;
  title: string;
  description: string;
  done: boolean;
}

interface ParsedSkill {
  name: string;
  category: string;
}

interface ParsedExp {
  job_title: string;
  company_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  location: string;
  description: string;
  achievements: string[];
}

interface ParsedEdu {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
}

interface ParsedCV {
  full_name: string;
  headline: string;
  location: string;
  skills: ParsedSkill[];
  experience: ParsedExp[];
  education: ParsedEdu[];
}

interface Props {
  steps: StepDef[];
  onClose: () => void;
  initialStage?: "intro" | "manual";
}

const inputCls =
  "h-[44px] px-4 border border-[#dddbd2] rounded-[12px] text-[14px] text-[#0a2412] placeholder:text-[#b0ae9f] focus:border-[#0a2412] focus:outline-none transition-colors w-full bg-white";

const reviewInputCls =
  "h-[40px] px-3 border border-[#dddbd2] rounded-[10px] text-[13px] text-[#0a2412] placeholder:text-[#b0ae9f] focus:border-[#0a2412] focus:outline-none transition-colors w-full bg-white";

export default function ProfileSetupModal({ steps, onClose, initialStage = "intro" }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>(initialStage);
  const [manualIdx, setManualIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Manual step form values
  const [headline, setHeadline] = useState("");
  const [locationVal, setLocationVal] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [expJobTitle, setExpJobTitle] = useState("");
  const [expCompany, setExpCompany] = useState("");
  const [expStartDate, setExpStartDate] = useState("");
  const [expIsCurrent, setExpIsCurrent] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");

  // CV import state
  const [parsedData, setParsedData] = useState<ParsedCV | null>(null);
  const [originalCvFile, setOriginalCvFile] = useState<File | null>(null);
  const [importHeadline, setImportHeadline] = useState("");
  const [importLocation, setImportLocation] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Set<number>>(new Set());
  const [selectedExp, setSelectedExp] = useState<Set<number>>(new Set());
  const [selectedEdu, setSelectedEdu] = useState<Set<number>>(new Set());
  // true when cv is the only remaining step — skip review, just upload
  const [cvOnlyMode, setCvOnlyMode] = useState(false);

  const manualSteps = steps.filter((s) => !s.done && s.key !== "cv");
  const currentStep = manualSteps[manualIdx];
  const isLastStep = manualIdx === manualSteps.length - 1;
  const allDone = steps.every((s) => s.done);

  // If opened in manual mode but nothing to fill, redirect appropriately
  useEffect(() => {
    if (stage !== "manual") return;
    if (allDone) { setStage("done"); return; }
    if (manualSteps.length === 0) {
      // Only the cv step is left — go straight to upload, skip review
      setCvOnlyMode(true);
      setStage("cv-upload");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addTag(
    val: string,
    list: string[],
    setList: (f: (p: string[]) => string[]) => void,
    setInput: (s: string) => void,
  ) {
    const t = val.trim();
    if (t && !list.includes(t)) setList((p) => [...p, t]);
    setInput("");
  }

  function canAdvance(): boolean {
    if (!currentStep) return false;
    switch (currentStep.key) {
      case "headline":   return headline.trim().length > 0;
      case "location":   return locationVal.trim().length > 0;
      case "skills":     return skills.length > 0;
      case "experience": return expJobTitle.trim().length > 0 && expCompany.trim().length > 0;
      case "roles":      return roles.length > 0;
      default:           return false;
    }
  }

  async function saveStep(skip = false) {
    if (!skip) {
      setSaving(true);
      setError(null);
      try {
        switch (currentStep.key) {
          case "headline":
            await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ headline: headline.trim() }),
            });
            break;
          case "location":
            await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ location: locationVal.trim() }),
            });
            break;
          case "skills":
            for (const skill of skills) {
              await fetch("/api/profile/skills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skill }),
              });
            }
            break;
          case "experience":
            await fetch("/api/experience", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                job_title: expJobTitle.trim(),
                company_name: expCompany.trim(),
                start_date: expStartDate || undefined,
                is_current: expIsCurrent,
              }),
            });
            break;
          case "roles":
            await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ target_roles: roles }),
            });
            break;
        }
      } catch {
        setError("Failed to save. Please try again.");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    setError(null);
    if (isLastStep) {
      setStage("done");
    } else {
      setManualIdx((i) => i + 1);
    }
  }

  async function handleCvFile(file: File) {
    setOriginalCvFile(file);
    setError(null);

    if (cvOnlyMode) {
      // Just upload the file — no review needed, cv step will be marked done
      setSaving(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        setStage("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Normal import flow — parse then review
    setParsing(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/profile/import-cv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      setParsedData(data.parsed);
      setImportHeadline(data.parsed.headline ?? "");
      setImportLocation(data.parsed.location ?? "");
      setSelectedSkills(new Set((data.parsed.skills ?? []).map((_: unknown, i: number) => i)));
      setSelectedExp(new Set((data.parsed.experience ?? []).map((_: unknown, i: number) => i)));
      setSelectedEdu(new Set((data.parsed.education ?? []).map((_: unknown, i: number) => i)));
      setStage("cv-review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse CV");
    } finally {
      setParsing(false);
    }
  }

  async function saveParsedData() {
    if (!parsedData) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/apply-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            full_name: parsedData.full_name || undefined,
            headline: importHeadline || undefined,
            location: importLocation || undefined,
          },
          skills: (parsedData.skills ?? [])
            .filter((_, i) => selectedSkills.has(i))
            .map((s) => s.name),
          experience: (parsedData.experience ?? [])
            .filter((_, i) => selectedExp.has(i)),
          education: (parsedData.education ?? [])
            .filter((_, i) => selectedEdu.has(i)),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
      // Also upload the file to resume_files so the cv step is marked complete
      if (originalCvFile) {
        const fd = new FormData();
        fd.append("file", originalCvFile);
        await fetch("/api/cv/upload", { method: "POST", body: fd }).catch(() => {});
      }
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem("setup_dismissed", "1");
    onClose();
  }

  function handleDone() {
    sessionStorage.setItem("setup_dismissed", "1");
    onClose();
    router.refresh();
  }

  const primaryBtn =
    "h-[40px] px-5 rounded-[10px] bg-[#0a2412] text-white text-[13px] font-medium hover:bg-[#0a2412]/90 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed";

  const secondaryBtn =
    "h-[40px] px-4 rounded-[10px] border border-[#dddbd2] text-[#5f5d54] text-[13px] hover:bg-[#f5f4f0] transition-colors flex items-center gap-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={dismiss} />
      <div className="relative bg-white rounded-[24px] w-full max-w-[480px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Close */}
        <div className="flex items-center justify-end px-5 pt-4 pb-0 shrink-0">
          <button
            onClick={dismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f0ede8] text-[#8a877b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-6">

          {/* ── INTRO ── */}
          {stage === "intro" && (
            <div>
              <h2 className="text-[24px] font-normal text-[#0a2412] tracking-[-0.04em] mb-1.5">
                Set up your profile
              </h2>
              <p className="text-[14px] text-[#5f5d54] leading-snug mb-6">
                A complete profile improves your job matches and makes you visible to recruiters.
              </p>

              <div className="flex flex-col gap-2.5">
                {manualSteps.length > 0 && (
                  <button
                    onClick={() => { setStage("manual"); setManualIdx(0); }}
                    className="group w-full text-left p-4 rounded-[16px] border-2 border-[#eceae3] hover:border-[#0a2412] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-[8px] bg-[#f5f4f0] group-hover:bg-[#e8f2eb] flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                        <ChevronRight className="w-4 h-4 text-[#0a2412]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#0a2412]">Step by step</p>
                        <p className="text-[12px] text-[#8a877b] mt-0.5">
                          {manualSteps.length} step{manualSteps.length !== 1 ? "s" : ""} remaining
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => setStage("cv-upload")}
                  className="group w-full text-left p-4 rounded-[16px] bg-[#0a2412] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-medium text-white">Import from CV</p>
                        <span className="text-[10px] font-semibold text-[#0a2412] bg-[#c6f46b] px-1.5 py-0.5 rounded-[4px]">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[12px] text-white/60 mt-0.5">
                        Auto-fill your profile from your resume
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── MANUAL STEPS ── */}
          {stage === "manual" && currentStep && (
            <div>
              <div className="flex items-center gap-1 mb-5">
                {manualSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === manualIdx
                        ? "w-5 bg-[#0a2412]"
                        : i < manualIdx
                        ? "w-2 bg-[#0a2412]/40"
                        : "w-2 bg-[#e0ded6]"
                    }`}
                  />
                ))}
              </div>

              <p className="text-[11px] font-semibold text-[#8a877b] tracking-[0.5px] uppercase mb-1">
                Step {manualIdx + 1} of {manualSteps.length}
              </p>
              <h2 className="text-[22px] font-normal text-[#0a2412] tracking-[-0.035em] mb-1">
                {currentStep.title}
              </h2>
              <p className="text-[13px] text-[#5f5d54] mb-5 leading-snug">{currentStep.description}</p>

              {currentStep.key === "headline" && (
                <input
                  autoFocus
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && canAdvance()) saveStep(); }}
                  placeholder="e.g. Senior Product Designer"
                  className={inputCls}
                />
              )}

              {currentStep.key === "location" && (
                <input
                  autoFocus
                  value={locationVal}
                  onChange={(e) => setLocationVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && canAdvance()) saveStep(); }}
                  placeholder="e.g. San Francisco, CA"
                  className={inputCls}
                />
              )}

              {currentStep.key === "skills" && (
                <div className="border border-[#dddbd2] rounded-[12px] p-3 focus-within:border-[#0a2412] transition-colors min-h-[88px]">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {skills.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 h-6 px-2.5 bg-[#e8f2eb] text-[#0a2412] text-[11px] font-medium rounded-[6px]">
                        {s}
                        <button onClick={() => setSkills((p) => p.filter((_, j) => j !== i))} className="text-[#0a2412]/40 hover:text-[#0a2412] transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    autoFocus={skills.length === 0}
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(skillInput, skills, setSkills, setSkillInput); }
                      if (e.key === "Backspace" && !skillInput && skills.length > 0) setSkills((p) => p.slice(0, -1));
                    }}
                    placeholder={skills.length === 0 ? "Type a skill and press Enter..." : "Add more..."}
                    className="text-[13px] text-[#0a2412] bg-transparent outline-none placeholder:text-[#b0ae9f] w-full"
                  />
                </div>
              )}

              {currentStep.key === "experience" && (
                <div className="flex flex-col gap-2.5">
                  <input autoFocus value={expJobTitle} onChange={(e) => setExpJobTitle(e.target.value)} placeholder="Job title" className={inputCls} />
                  <input value={expCompany} onChange={(e) => setExpCompany(e.target.value)} placeholder="Company name" className={inputCls} />
                  <input type="month" value={expStartDate} onChange={(e) => setExpStartDate(e.target.value)} className={inputCls} />
                  <label className="flex items-center gap-2.5 cursor-pointer pt-0.5" onClick={() => setExpIsCurrent(!expIsCurrent)}>
                    <div className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-colors ${expIsCurrent ? "border-[#0a2412] bg-[#0a2412]" : "border-[#d4d0c8]"}`}>
                      {expIsCurrent && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-[13px] text-[#5f5d54]">I currently work here</span>
                  </label>
                </div>
              )}

              {currentStep.key === "roles" && (
                <div className="border border-[#dddbd2] rounded-[12px] p-3 focus-within:border-[#0a2412] transition-colors min-h-[88px]">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {roles.map((r, i) => (
                      <span key={i} className="inline-flex items-center gap-1 h-6 px-2.5 bg-[#e8f2eb] text-[#0a2412] text-[11px] font-medium rounded-[6px]">
                        {r}
                        <button onClick={() => setRoles((p) => p.filter((_, j) => j !== i))} className="text-[#0a2412]/40 hover:text-[#0a2412] transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    autoFocus={roles.length === 0}
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(roleInput, roles, setRoles, setRoleInput); }
                      if (e.key === "Backspace" && !roleInput && roles.length > 0) setRoles((p) => p.slice(0, -1));
                    }}
                    placeholder={roles.length === 0 ? "e.g. Frontend Engineer..." : "Add more..."}
                    className="text-[13px] text-[#0a2412] bg-transparent outline-none placeholder:text-[#b0ae9f] w-full"
                  />
                </div>
              )}

              {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}

              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={() => { setError(null); if (manualIdx === 0) setStage("intro"); else setManualIdx((i) => i - 1); }}
                  className={secondaryBtn}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />Back
                </button>
                <div className="flex items-center gap-2">
                  {currentStep.key !== "headline" && currentStep.key !== "experience" && (
                    <button onClick={() => saveStep(true)} className="text-[12px] text-[#8a877b] hover:text-[#5f5d54] transition-colors px-2">
                      Skip
                    </button>
                  )}
                  <button onClick={() => saveStep()} disabled={saving || !canAdvance()} className={primaryBtn}>
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isLastStep ? "Finish" : "Next"}
                    {!saving && !isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CV UPLOAD ── */}
          {stage === "cv-upload" && (
            <div>
              {!cvOnlyMode && (
                <button onClick={() => { setError(null); setStage("intro"); }} className="flex items-center gap-1 text-[12px] text-[#8a877b] hover:text-[#5f5d54] transition-colors mb-4">
                  <ArrowLeft className="w-3 h-3" />Back
                </button>
              )}
              <h2 className="text-[24px] font-normal text-[#0a2412] tracking-[-0.04em] mb-1.5">
                {cvOnlyMode ? "Upload your CV" : "Import from CV"}
              </h2>
              <p className="text-[13px] text-[#5f5d54] mb-5 leading-snug">
                {cvOnlyMode
                  ? "Add your CV so you can apply to jobs directly from Progrize."
                  : "Upload your resume and we will auto-fill your headline, location, skills, experience, and education."}
              </p>

              <div
                className={`border-2 border-dashed rounded-[16px] p-10 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-[#0a2412] bg-[#f0f7f1]" : "border-[#dddbd2] hover:border-[#0a2412]/40"
                } ${parsing || saving ? "pointer-events-none" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleCvFile(f); }}
                onClick={() => !(parsing || saving) && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCvFile(f); }}
                />
                {parsing || saving ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-[#0a2412] animate-spin" />
                    <p className="text-[14px] font-medium text-[#0a2412] mt-1">
                      {saving ? "Uploading..." : "Parsing your CV..."}
                    </p>
                    {!saving && <p className="text-[12px] text-[#8a877b]">This takes about 10 seconds</p>}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-[14px] bg-[#e8f2eb] flex items-center justify-center mb-2">
                      <FileText className="w-6 h-6 text-[#0a2412]" />
                    </div>
                    <p className="text-[14px] font-medium text-[#0a2412]">Drop your CV here</p>
                    <p className="text-[13px] text-[#8a877b]">or click to browse</p>
                    <p className="text-[11px] text-[#b0ae9f] mt-2">PDF, DOC, DOCX supported</p>
                  </div>
                )}
              </div>
              {error && <p className="text-[12px] text-red-500 mt-3">{error}</p>}
            </div>
          )}

          {/* ── CV REVIEW ── */}
          {stage === "cv-review" && parsedData && (
            <div>
              <h2 className="text-[22px] font-normal text-[#0a2412] tracking-[-0.04em] mb-1">Review your details</h2>
              <p className="text-[13px] text-[#5f5d54] mb-5">
                Select what you would like to import. This will replace any existing data.
              </p>

              {/* Profile */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-[#8a877b] tracking-[0.5px] uppercase mb-2.5">Profile</p>
                {parsedData.full_name && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-[#f5f4f0] rounded-[10px] mb-2">
                    <span className="text-[11px] text-[#8a877b] w-12 shrink-0">Name</span>
                    <span className="text-[13px] text-[#0a2412] font-medium">{parsedData.full_name}</span>
                  </div>
                )}
                <input value={importHeadline} onChange={(e) => setImportHeadline(e.target.value)} placeholder="Headline" className={`${reviewInputCls} mb-2`} />
                <input value={importLocation} onChange={(e) => setImportLocation(e.target.value)} placeholder="Location" className={reviewInputCls} />
              </div>

              {/* Skills */}
              {(parsedData.skills?.length ?? 0) > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] font-semibold text-[#8a877b] tracking-[0.5px] uppercase">
                      Skills ({parsedData.skills.length} found)
                    </p>
                    <button
                      onClick={() => {
                        if (selectedSkills.size === parsedData.skills.length) setSelectedSkills(new Set());
                        else setSelectedSkills(new Set(parsedData.skills.map((_, i) => i)));
                      }}
                      className="text-[11px] text-[#5f5d54] hover:text-[#0a2412] transition-colors"
                    >
                      {selectedSkills.size === parsedData.skills.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedData.skills.map((skill, i) => {
                      const sel = selectedSkills.has(i);
                      return (
                        <button
                          key={i}
                          onClick={() => { const n = new Set(selectedSkills); if (sel) n.delete(i); else n.add(i); setSelectedSkills(n); }}
                          className={`h-7 px-3 rounded-[8px] text-[12px] font-medium transition-colors ${sel ? "bg-[#0a2412] text-white" : "bg-[#f5f4f0] text-[#5f5d54]"}`}
                        >
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Experience */}
              {(parsedData.experience?.length ?? 0) > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-semibold text-[#8a877b] tracking-[0.5px] uppercase mb-2.5">
                    Experience ({parsedData.experience.length} found)
                  </p>
                  <div className="flex flex-col gap-2">
                    {parsedData.experience.map((exp, i) => {
                      const sel = selectedExp.has(i);
                      return (
                        <div
                          key={i}
                          onClick={() => { const n = new Set(selectedExp); if (sel) n.delete(i); else n.add(i); setSelectedExp(n); }}
                          className={`flex items-start gap-3 p-3 rounded-[12px] cursor-pointer transition-colors ${sel ? "bg-[#e8f2eb]" : "bg-[#f5f4f0] hover:bg-[#eceae3]"}`}
                        >
                          <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${sel ? "border-[#0a2412] bg-[#0a2412]" : "border-[#d4d0c8]"}`}>
                            {sel && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#0a2412]">{exp.job_title}</p>
                            <p className="text-[12px] text-[#5f5d54]">{exp.company_name}</p>
                            {exp.start_date && (
                              <p className="text-[11px] text-[#8a877b] mt-0.5">
                                {exp.start_date} — {exp.is_current ? "Present" : (exp.end_date || "")}
                              </p>
                            )}
                            {exp.description && (
                              <p className="text-[11px] text-[#8a877b] mt-1 line-clamp-2 leading-snug">{exp.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Education */}
              {(parsedData.education?.length ?? 0) > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-semibold text-[#8a877b] tracking-[0.5px] uppercase mb-2.5">
                    Education ({parsedData.education.length} found)
                  </p>
                  <div className="flex flex-col gap-2">
                    {parsedData.education.map((edu, i) => {
                      const sel = selectedEdu.has(i);
                      return (
                        <div
                          key={i}
                          onClick={() => { const n = new Set(selectedEdu); if (sel) n.delete(i); else n.add(i); setSelectedEdu(n); }}
                          className={`flex items-start gap-3 p-3 rounded-[12px] cursor-pointer transition-colors ${sel ? "bg-[#e8f2eb]" : "bg-[#f5f4f0] hover:bg-[#eceae3]"}`}
                        >
                          <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${sel ? "border-[#0a2412] bg-[#0a2412]" : "border-[#d4d0c8]"}`}>
                            {sel && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#0a2412]">{edu.institution}</p>
                            {(edu.degree || edu.field_of_study) && (
                              <p className="text-[12px] text-[#5f5d54]">
                                {[edu.degree, edu.field_of_study].filter(Boolean).join(" · ")}
                              </p>
                            )}
                            {edu.start_date && (
                              <p className="text-[11px] text-[#8a877b] mt-0.5">
                                {edu.start_date}{edu.end_date ? ` — ${edu.end_date}` : ""}
                              </p>
                            )}
                          </div>
                          <GraduationCap className="w-3.5 h-3.5 text-[#b0ae9f] shrink-0 mt-0.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}

              <button onClick={saveParsedData} disabled={saving} className={`${primaryBtn} w-full justify-center`}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving..." : "Import selected"}
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {stage === "done" && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#e8f2eb] flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-[#0a2412]" />
              </div>
              <h2 className="text-[24px] font-normal text-[#0a2412] tracking-[-0.04em] mb-2">
                {allDone ? "You're all good to go!" : "Looking good!"}
              </h2>
              <p className="text-[14px] text-[#5f5d54] leading-snug mb-6 max-w-[300px] mx-auto">
                {allDone
                  ? "Your profile is complete. We'll start finding the best job matches for you."
                  : "Your profile is taking shape. The more you add, the better your job matches."}
              </p>
              <button onClick={handleDone} className={`${primaryBtn} mx-auto`}>
                Go to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
