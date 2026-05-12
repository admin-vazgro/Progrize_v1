"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Building2, Plus, ArrowRight, Check, Loader2, ShieldCheck, ShieldAlert, Briefcase } from "lucide-react";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
  size: string | null;
  logo_url: string | null;
  domain: string | null;
}

type RecruiterType = "corporate" | "agency";
type Step = "type_select" | "search" | "create" | "agency_create" | "done";

interface Props {
  onClose: () => void;
  userEmail?: string;
}

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Retail",
  "Manufacturing", "Media", "Consulting", "Real Estate", "Other",
];

const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "icloud.com", "live.com", "msn.com", "aol.com",
]);

function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function websiteDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function domainMatch(userEmail: string, company: Company): boolean {
  const ud = emailDomain(userEmail);
  if (!ud || !company.domain) return false;
  return ud === company.domain;
}

export default function RecruiterOnboardingModal({ onClose, userEmail = "" }: Props) {
  const router = useRouter();
  const [recruiterType, setRecruiterType] = useState<RecruiterType | null>(null);
  const [step, setStep] = useState<Step>("type_select");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [searching, setSearching] = useState(false);
  const [createdCompany, setCreatedCompany] = useState<Company | null>(null);

  // create form
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ud = emailDomain(userEmail);
  const isPersonalEmail = PERSONAL_DOMAINS.has(ud);

  useEffect(() => {
    if (step === "search" && inputRef.current) inputRef.current.focus();
  }, [step]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      const res = await fetch(`/api/recruiter/company/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.companies ?? []);
      setSearching(false);
    }, 280);
  }, [query]);

  async function handleJoin(company: Company) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/recruiter/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", company_id: company.id, user_email: userEmail }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error ?? "Failed to join company");
      setSubmitting(false);
      return;
    }
    setCreatedCompany(company);
    setStep("done");
    setSubmitting(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    const domain = !isPersonalEmail && !website ? ud :
      website ? websiteDomain(website) : ud;

    const res = await fetch("/api/recruiter/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: name.trim(),
        industry: industry || null,
        size: size || null,
        website: website.trim() || null,
        location: location.trim() || null,
        domain: domain || null,
        type: recruiterType === "agency" ? "agency" : "employer",
        user_email: userEmail,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create company");
      setSubmitting(false);
      return;
    }
    setCreatedCompany(data.company);
    setStep("done");
    setSubmitting(false);
  }

  function handleGoToDashboard() {
    if (createdCompany) {
      localStorage.setItem("recruiter_company_id", createdCompany.id);
      localStorage.setItem("recruiter_company_name", createdCompany.name);
    }
    router.push("/recruiter/dashboard");
    router.refresh();
    onClose();
  }

  const inputCls = "w-full h-[44px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border-0";
  const selectCls = inputCls + " appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      <div
        className="relative bg-white rounded-[24px] w-full max-w-[480px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-0">
          <div>
            {step === "type_select" && (
              <>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">Get started</p>
                <h2 className="text-[22px] font-semibold text-[#0a2412] tracking-[-0.5px]">How are you hiring?</h2>
              </>
            )}
            {step === "search" && (
              <>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">Corporate HR</p>
                <h2 className="text-[22px] font-semibold text-[#0a2412] tracking-[-0.5px]">Find your company</h2>
              </>
            )}
            {(step === "create" || step === "agency_create") && (
              <>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">
                  {step === "agency_create" ? "Recruitment agency" : "New company"}
                </p>
                <h2 className="text-[22px] font-semibold text-[#0a2412] tracking-[-0.5px]">
                  {step === "agency_create" ? "Set up your agency" : "Set up your company"}
                </h2>
              </>
            )}
            {step === "done" && (
              <>
                <div className="w-9 h-9 rounded-full bg-[#e8f2eb] flex items-center justify-center mb-3">
                  <Check className="w-4 h-4 text-[#0a2412]" />
                </div>
                <h2 className="text-[22px] font-semibold text-[#0a2412] tracking-[-0.5px]">You&apos;re all set!</h2>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] bg-[#f5f3ed] flex items-center justify-center hover:bg-[#eceae3] transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 text-[#5f5d54]" />
          </button>
        </div>

        <div className="px-7 pt-5 pb-7">

          {/* ── Step 0: Recruiter type ── */}
          {step === "type_select" && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-[#5f5d54] leading-[1.6] mb-1">
                This helps us verify your authority to post jobs on behalf of a company.
              </p>
              <button
                onClick={() => { setRecruiterType("corporate"); setStep("search"); }}
                className="flex items-start gap-4 p-4 rounded-[14px] border border-[#eceae3] hover:border-[#0a2412]/30 hover:bg-[#fafaf8] transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-[10px] bg-[#e8f2eb] flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-5 h-5 text-[#0a2412]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#0a2412] mb-0.5">I work at the company</p>
                  <p className="text-[12px] text-[#8a877b] leading-[1.5]">
                    You&apos;re an internal HR, talent, or hiring manager posting roles for your employer.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#c8c5bc] mt-3 group-hover:text-[#8a877b] transition-colors shrink-0" />
              </button>

              <button
                onClick={() => { setRecruiterType("agency"); setStep("agency_create"); }}
                className="flex items-start gap-4 p-4 rounded-[14px] border border-[#eceae3] hover:border-[#0a2412]/30 hover:bg-[#fafaf8] transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-[10px] bg-[#f5f3ed] flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase className="w-5 h-5 text-[#5f5d54]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#0a2412] mb-0.5">I&apos;m a recruiter / agency</p>
                  <p className="text-[12px] text-[#8a877b] leading-[1.5]">
                    You recruit on behalf of client companies. Jobs will be marked as agency-posted.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#c8c5bc] mt-3 group-hover:text-[#8a877b] transition-colors shrink-0" />
              </button>
            </div>
          )}

          {/* ── Step 1: Search (corporate) ── */}
          {step === "search" && (
            <div className="flex flex-col gap-4">
              {/* Email domain hint */}
              {ud && !isPersonalEmail && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#e8f2eb] rounded-[8px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0a2412] shrink-0" />
                  <p className="text-[11px] text-[#0a2412]">
                    Your work email <span className="font-semibold">@{ud}</span> will auto-verify matching companies.
                  </p>
                </div>
              )}
              {isPersonalEmail && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#fef9ec] rounded-[8px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#92400e] shrink-0" />
                  <p className="text-[11px] text-[#92400e]">
                    You&apos;re using a personal email. Use your work email for automatic domain verification.
                  </p>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a877b]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your company name…"
                  className="w-full h-[48px] bg-[#fafaf8] rounded-[10px] pl-10 pr-4 text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border border-[#eceae3] focus:border-transparent"
                />
                {searching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a877b] animate-spin" />
                )}
              </div>

              {results.length > 0 && (
                <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto">
                  {results.map((company) => {
                    const matched = domainMatch(userEmail, company);
                    return (
                      <button
                        key={company.id}
                        onClick={() => !submitting && handleJoin(company)}
                        disabled={submitting}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-[#f5f3ed] transition-colors text-left disabled:opacity-50"
                      >
                        <div className="w-9 h-9 rounded-[8px] bg-[#f0ede8] flex items-center justify-center shrink-0">
                          {company.logo_url
                            ? <img src={company.logo_url} alt="" className="w-full h-full object-cover rounded-[8px]" />
                            : <Building2 className="w-4 h-4 text-[#5f5d54]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#0a2412] truncate">{company.name}</p>
                          <p className="text-[11px] text-[#8a877b] truncate">
                            {[company.industry, company.location].filter(Boolean).join(" · ") || "Company"}
                          </p>
                        </div>
                        {matched && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#1a5c30] bg-[#e8f2eb] px-2 py-0.5 rounded-full shrink-0">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-[#c8c5bc] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-[12px] text-[#8a877b] text-center py-2">No companies found for &ldquo;{query}&rdquo;</p>
              )}

              {error && (
                <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>
              )}

              <div className="border-t border-[#eceae3] pt-4">
                <button
                  onClick={() => setStep("create")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-[#f5f3ed] transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-[8px] border border-dashed border-[#d4d0c8] flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-[#8a877b]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#0a2412]">Create a new company</p>
                    <p className="text-[11px] text-[#8a877b]">Your company isn&apos;t listed yet</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep("type_select")}
                className="text-[12px] text-[#8a877b] hover:text-[#5f5d54] transition-colors text-center"
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── Step 2: Create company (corporate) ── */}
          {step === "create" && (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {ud && !isPersonalEmail && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#e8f2eb] rounded-[8px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0a2412] shrink-0" />
                  <p className="text-[11px] text-[#0a2412]">
                    Company will be domain-verified with <span className="font-semibold">@{ud}</span>
                  </p>
                </div>
              )}
              {isPersonalEmail && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#fef9ec] rounded-[8px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#92400e] shrink-0" />
                  <p className="text-[11px] text-[#92400e]">
                    Personal email detected. Add your company website so colleagues can be verified by domain.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-[8px]">
                <label className="text-[12px] font-medium text-[#26251f]">Company name <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp" required autoFocus className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-[8px]">
                  <label className="text-[12px] font-medium text-[#26251f]">Industry</label>
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectCls}>
                    <option value="">Select…</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-[8px]">
                  <label className="text-[12px] font-medium text-[#26251f]">Size</label>
                  <select value={size} onChange={(e) => setSize(e.target.value)} className={selectCls}>
                    <option value="">Select…</option>
                    {SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className="text-[12px] font-medium text-[#26251f]">Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA" className={inputCls} />
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className="text-[12px] font-medium text-[#26251f]">Website</label>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourcompany.com" className={inputCls} />
              </div>

              {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => { setStep("search"); setError(null); }}
                  className="h-[44px] px-4 text-[13px] text-[#5f5d54] hover:text-[#26251f] transition-colors">
                  Back
                </button>
                <button type="submit" disabled={submitting || !name.trim()}
                  className="flex-1 h-[44px] bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? "Creating…" : "Create Company"}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2b: Create agency ── */}
          {step === "agency_create" && (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#f5f3ed] rounded-[8px]">
                <Briefcase className="w-3.5 h-3.5 text-[#5f5d54] shrink-0" />
                <p className="text-[11px] text-[#5f5d54]">
                  Jobs posted through your agency will show &ldquo;via [Agency Name]&rdquo; so candidates know.
                </p>
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className="text-[12px] font-medium text-[#26251f]">Agency name <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Talent Bridge Ltd" required autoFocus className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-[8px]">
                  <label className="text-[12px] font-medium text-[#26251f]">Industry focus</label>
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectCls}>
                    <option value="">Select…</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-[8px]">
                  <label className="text-[12px] font-medium text-[#26251f]">Size</label>
                  <select value={size} onChange={(e) => setSize(e.target.value)} className={selectCls}>
                    <option value="">Select…</option>
                    {SIZES.map((s) => <option key={s} value={s}>{s} recruiters</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className="text-[12px] font-medium text-[#26251f]">Website</label>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://youragency.com" className={inputCls} />
              </div>

              {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => { setStep("type_select"); setError(null); }}
                  className="h-[44px] px-4 text-[13px] text-[#5f5d54] hover:text-[#26251f] transition-colors">
                  Back
                </button>
                <button type="submit" disabled={submitting || !name.trim()}
                  className="flex-1 h-[44px] bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? "Creating…" : "Set Up Agency"}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && createdCompany && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 p-4 bg-[#f5f3ed] rounded-[12px]">
                <div className="w-10 h-10 rounded-[10px] bg-[#e8f2eb] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#0a2412]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#0a2412]">{createdCompany.name}</p>
                  <p className="text-[12px] text-[#8a877b]">
                    {[createdCompany.industry, createdCompany.location].filter(Boolean).join(" · ") || "Your company"}
                  </p>
                </div>
                {recruiterType === "corporate" && !isPersonalEmail && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#1a5c30] bg-[#e8f2eb] px-2 py-1 rounded-full shrink-0">
                    <ShieldCheck className="w-3 h-3" /> Domain verified
                  </span>
                )}
              </div>

              {recruiterType === "agency" && (
                <p className="text-[12px] text-[#8a877b] leading-[1.6] bg-[#f5f3ed] px-3 py-2 rounded-[8px]">
                  When posting jobs you can specify the client company. Candidates will see the role is posted via your agency.
                </p>
              )}

              <p className="text-[13px] text-[#5f5d54] leading-[1.6]">
                Your recruiter dashboard is ready. Post jobs, review candidates, and manage your pipeline from one place.
              </p>

              <button
                onClick={handleGoToDashboard}
                className="w-full h-[48px] bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors flex items-center justify-center gap-2"
              >
                Go to Recruiter Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
