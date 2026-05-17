"use client";

import { useState } from "react";
import { Loader2, Check, Building2, Globe, MapPin, Users2, FileText, ExternalLink } from "lucide-react";
import type { Company, CompanyRole } from "@/types/recruiter";

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Retail",
  "Manufacturing", "Media", "Consulting", "Real Estate", "Other",
];

const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

interface Props {
  company: Company;
  myRole: CompanyRole;
}

export default function CompanySettingsClient({ company, myRole }: Props) {
  const isAdmin = ["owner", "admin"].includes(myRole);

  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry ?? "");
  const [size, setSize] = useState(company.size ?? "");
  const [location, setLocation] = useState(company.location ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [description, setDescription] = useState(company.description ?? "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/recruiter/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, industry: industry || null, size: size || null, location: location || null, website: website || null, description: description || null }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); setSaving(false); return; }
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  }

  const inputCls = "w-full h-[44px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all";
  const selectCls = inputCls + " appearance-none cursor-pointer";
  const disabledCls = "w-full h-[44px] bg-[#f5f3ed] rounded-[8px] px-[12px] text-[13px] text-[#8a877b] border border-[#eceae3] cursor-not-allowed";

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[680px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">{company.name}</p>
          <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">Company Settings</h1>
          <p className="text-[13px] text-[#8a877b] mt-1">
            {isAdmin ? "Edit your company profile visible to job seekers." : "View your company profile."}
          </p>
        </div>

        {/* Company identity card */}
        <div className="bg-white rounded-[20px] p-6 mb-6 flex items-start gap-5">
          <div className="w-16 h-16 rounded-[14px] bg-[#e8f2eb] flex items-center justify-center shrink-0">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover rounded-[14px]" />
            ) : (
              <Building2 className="w-7 h-7 text-[#0a2412]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-semibold text-[#0a2412] tracking-[-0.4px]">{company.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              {company.industry && <span className="text-[12px] text-[#8a877b]">{company.industry}</span>}
              {company.location && (
                <span className="flex items-center gap-1 text-[12px] text-[#8a877b]">
                  <MapPin className="w-3 h-3" /> {company.location}
                </span>
              )}
              {company.size && (
                <span className="flex items-center gap-1 text-[12px] text-[#8a877b]">
                  <Users2 className="w-3 h-3" /> {company.size} employees
                </span>
              )}
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] text-[#0a2412] hover:underline">
                  <Globe className="w-3 h-3" /> Website <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            {company.domain && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#1a5c30] bg-[#e8f2eb] px-2 py-0.5 rounded-full mt-2">
                <Check className="w-3 h-3" /> Domain verified: @{company.domain}
              </span>
            )}
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="bg-white rounded-[20px] p-6 flex flex-col gap-5">
          <h3 className="text-[14px] font-semibold text-[#26251f] tracking-[-0.2px]">Company Profile</h3>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[#26251f]">Company name <span className="text-red-500">*</span></label>
            {isAdmin ? (
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            ) : (
              <div className={disabledCls}>{name}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-[#26251f]">Industry</label>
              {isAdmin ? (
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              ) : (
                <div className={disabledCls}>{industry || "—"}</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-[#26251f]">Company size</label>
              {isAdmin ? (
                <select value={size} onChange={(e) => setSize(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
                </select>
              ) : (
                <div className={disabledCls}>{size ? `${size} employees` : "—"}</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[#26251f]">Location</label>
            {isAdmin ? (
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. San Francisco, CA" className={inputCls} />
            ) : (
              <div className={disabledCls}>{location || "—"}</div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#8a877b]" /> Website
            </label>
            {isAdmin ? (
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" className={inputCls} />
            ) : (
              <div className={disabledCls}>{website || "—"}</div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#8a877b]" /> About the company
            </label>
            {isAdmin ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What does your company do? What's your culture like?"
                className="w-full bg-[#fafaf8] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all resize-none"
              />
            ) : (
              <div className="w-full min-h-[80px] bg-[#f5f3ed] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[#8a877b] border border-[#eceae3]">
                {description || "—"}
              </div>
            )}
          </div>

          {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}

          {isAdmin && (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 h-[44px] px-6 bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saved && <Check className="w-4 h-4 text-[#c6f46b]" />}
                {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
