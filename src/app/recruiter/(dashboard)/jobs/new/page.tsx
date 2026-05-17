"use client";

import { useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, Plus } from "lucide-react";

function TagInput({
  label,
  placeholder,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const [input, setInput] = useState("");

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      const tag = input.trim().replace(/,$/, "");
      if (tag && !tags.includes(tag)) onAdd(tag);
      setInput("");
    }
  }

  function handleBlur() {
    if (input.trim()) {
      const tag = input.trim();
      if (!tags.includes(tag)) onAdd(tag);
      setInput("");
    }
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <label className="text-[13px] font-medium text-[#26251f]">{label}</label>
      <div className="min-h-[48px] bg-[#fafaf8] rounded-[8px] px-3 py-2 flex flex-wrap gap-1.5 items-center focus-within:ring-1 focus-within:ring-[#26251f]/20 transition-all">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e8f2eb] text-[#0a2412] text-[11px] rounded-full">
            {tag}
            <button type="button" onClick={() => onRemove(tag)} className="hover:text-[#5f5d54] transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : "Add more…"}
          className="flex-1 min-w-[120px] bg-transparent text-[12px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none"
        />
      </div>
      <p className="text-[11px] text-[#8a877b]">Press Enter or comma to add</p>
    </div>
  );
}

export default function NewJobPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<string>("");
  const [employmentType, setEmploymentType] = useState<string>("");
  const [seniority, setSeniority] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceSkills, setNiceSkills] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addRequirement() {
    const req = requirementInput.trim();
    if (req && !requirements.includes(req)) {
      setRequirements([...requirements, req]);
      setRequirementInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/recruiter/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        location: location.trim() || null,
        work_mode: workMode || null,
        employment_type: employmentType || null,
        seniority: seniority.trim() || null,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        salary_max: salaryMax ? parseInt(salaryMax) : null,
        description: description.trim(),
        requirements,
        required_skills: requiredSkills,
        nice_to_have_skills: niceSkills,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create job");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/recruiter/jobs/${data.job.id}`);
  }

  const inputCls = "w-full h-[48px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[12px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border-0";
  const selectCls = inputCls + " appearance-none cursor-pointer";

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[720px] mx-auto px-8 py-8">

        <div className="mb-8">
          <Link href="/recruiter/jobs" className="inline-flex items-center gap-1.5 text-[13px] text-[#8a877b] hover:text-[#3d3c36] transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to jobs
          </Link>
          <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">Post a Job</h1>
          <p className="text-[13px] text-[#8a877b] mt-1">Fill in the details to attract the right candidates.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          {/* Basics */}
          <section className="bg-white rounded-[20px] border border-[#eceae3] p-6 flex flex-col gap-5">
            <h2 className="text-[14px] font-semibold text-[#26251f] tracking-[-0.2px]">Job Details</h2>

            <div className="flex flex-col gap-[10px]">
              <label className="text-[13px] font-medium text-[#26251f]">Job Title <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" required className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-[10px]">
                <label className="text-[13px] font-medium text-[#26251f]">Work Mode</label>
                <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
              <div className="flex flex-col gap-[10px]">
                <label className="text-[13px] font-medium text-[#26251f]">Employment Type</label>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-[10px]">
                <label className="text-[13px] font-medium text-[#26251f]">Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. San Francisco, CA" className={inputCls} />
              </div>
              <div className="flex flex-col gap-[10px]">
                <label className="text-[13px] font-medium text-[#26251f]">Seniority Level</label>
                <select value={seniority} onChange={(e) => setSeniority(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  <option value="Intern">Intern</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid">Mid</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                  <option value="Principal">Principal</option>
                  <option value="Manager">Manager</option>
                  <option value="Director">Director</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-[10px]">
              <label className="text-[13px] font-medium text-[#26251f]">Salary Range (USD / year)</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="Min e.g. 80000" className={inputCls} min={0} />
                <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="Max e.g. 130000" className={inputCls} min={0} />
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="bg-white rounded-[20px] border border-[#eceae3] p-6 flex flex-col gap-5">
            <h2 className="text-[14px] font-semibold text-[#26251f] tracking-[-0.2px]">Description</h2>
            <div className="flex flex-col gap-[10px]">
              <label className="text-[13px] font-medium text-[#26251f]">Job Description <span className="text-red-500">*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role, responsibilities, and what the candidate will be working on…"
                required
                rows={8}
                className="w-full bg-[#fafaf8] rounded-[8px] px-[12px] py-[10px] text-[12px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border-0 resize-none leading-[1.6]"
              />
            </div>

            <div className="flex flex-col gap-[10px]">
              <label className="text-[13px] font-medium text-[#26251f]">Requirements</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRequirement(); } }}
                  placeholder="e.g. 3+ years of React experience"
                  className={inputCls + " flex-1"}
                />
                <button type="button" onClick={addRequirement} className="h-[48px] px-4 bg-[#f5f3ed] text-[#5f5d54] rounded-[8px] hover:bg-[#eceae3] transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {requirements.length > 0 && (
                <ul className="flex flex-col gap-2 mt-1">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-[#3d3c36]">
                      <span className="text-[#8a877b] shrink-0 mt-0.5">•</span>
                      <span className="flex-1">{req}</span>
                      <button type="button" onClick={() => setRequirements(requirements.filter((_, j) => j !== i))} className="text-[#c8c5bc] hover:text-[#5f5d54] transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Skills */}
          <section className="bg-white rounded-[20px] border border-[#eceae3] p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-[14px] font-semibold text-[#26251f] tracking-[-0.2px]">Skills</h2>
              <p className="text-[12px] text-[#8a877b] mt-0.5">These power the AI candidate matching on your dashboard.</p>
            </div>

            <TagInput
              label="Required Skills"
              placeholder="e.g. React, TypeScript, Node.js"
              tags={requiredSkills}
              onAdd={(tag) => setRequiredSkills([...requiredSkills, tag])}
              onRemove={(tag) => setRequiredSkills(requiredSkills.filter((s) => s !== tag))}
            />

            <TagInput
              label="Nice-to-Have Skills"
              placeholder="e.g. GraphQL, AWS, Docker"
              tags={niceSkills}
              onAdd={(tag) => setNiceSkills([...niceSkills, tag])}
              onRemove={(tag) => setNiceSkills(niceSkills.filter((s) => s !== tag))}
            />
          </section>

          {error && (
            <p className="text-[13px] text-red-600 bg-red-50 px-4 py-3 rounded-[10px]">{error}</p>
          )}

          <div className="flex items-center gap-3 pb-8">
            <button
              type="submit"
              disabled={loading}
              className="h-[48px] px-8 bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors disabled:opacity-50"
            >
              {loading ? "Posting…" : "Post Job"}
            </button>
            <Link href="/recruiter/jobs" className="h-[48px] px-6 text-[13px] text-[#5f5d54] hover:text-[#26251f] transition-colors flex items-center">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
