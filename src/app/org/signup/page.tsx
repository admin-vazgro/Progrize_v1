"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { permissionsForRole } from "@/lib/company-permissions";
import {
  ArrowRight, ArrowLeft, Check, Loader2, Upload, X,
  Building2, Users2, MapPin, Globe, FileText, ImageIcon,
} from "lucide-react";

const COMPANY_TYPES = [
  { value: "startup",     label: "Startup",          desc: "Early-stage, high-growth" },
  { value: "sme",         label: "SME",               desc: "Small or medium enterprise" },
  { value: "enterprise",  label: "Enterprise",        desc: "Large established company" },
  { value: "agency",      label: "Recruitment agency",desc: "Hiring on behalf of clients" },
  { value: "ngo",         label: "NGO / Non-profit",  desc: "Mission-driven organisation" },
  { value: "government",  label: "Government",        desc: "Public sector body" },
];

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Retail",
  "Manufacturing", "Media & Entertainment", "Consulting", "Real Estate",
  "Legal", "Logistics", "Energy", "Agriculture", "Other",
];

const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

type Step = "account" | "details" | "branding" | "done";

const STEPS: Step[] = ["account", "details", "branding", "done"];
const STEP_LABELS = ["Account", "Company", "Branding", "Done"];

const inputCls = "w-full h-[48px] bg-[#fafaf8] rounded-[10px] px-[14px] text-[13px] text-[#26251f] placeholder:text-[#b0ae9f] focus:outline-none focus:ring-2 focus:ring-[#0a2412]/20 border border-[#eceae3] focus:border-[#0a2412]/30 transition-all";
const selectCls = inputCls + " appearance-none cursor-pointer";

export default function OrgSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1 — account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 — company details
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [website, setWebsite] = useState("");

  // Step 3 — branding
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.indexOf(step);

  async function uploadImage(file: File, type: "logo" | "banner") {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    const res = await fetch("/api/recruiter/company/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setLogoPreview(URL.createObjectURL(file));
    try {
      const url = await uploadImage(file, "logo");
      setLogoUrl(url);
    } catch { setLogoPreview(null); }
    setUploadingLogo(false);
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setBannerPreview(URL.createObjectURL(file));
    try {
      const url = await uploadImage(file, "banner");
      setBannerUrl(url);
    } catch { setBannerPreview(null); }
    setUploadingBanner(false);
  }

  async function handleFinish() {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // 1. Create auth user
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, user_type: "recruiter" } },
    });
    if (signupError) { setError(signupError.message); setLoading(false); return; }
    if (!data.user) { setError("Signup failed"); setLoading(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // 2. Upsert profile
    await sb.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      email,
      headline: "Organisation admin",
      user_type: "recruiter",
      updated_at: new Date().toISOString(),
    });

    // 3. Create company
    const emailDomain = email.split("@")[1]?.toLowerCase() ?? null;
    const personalDomains = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "live.com"]);
    const domain = emailDomain && !personalDomains.has(emailDomain) ? emailDomain : null;

    const { data: company, error: companyError } = await sb
      .from("companies")
      .insert({
        name: companyName.trim(),
        type: companyType === "agency" ? "agency" : "employer",
        industry: industry || null,
        size: size || null,
        location: headquarters || null,
        website: website || null,
        description: description || null,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        domain,
        created_by: data.user.id,
      })
      .select("id")
      .single();

    if (companyError || !company) { setError(companyError?.message ?? "Failed to create company"); setLoading(false); return; }

    // 4. Add as owner
    await sb.from("company_members").insert({
      company_id: company.id,
      user_id: data.user.id,
      role: "owner",
      permissions: permissionsForRole("owner"),
      verified_by: domain ? "domain" : "manual",
    });

    setStep("done");
    setLoading(false);

    // If session is available (email confirmation off), redirect
    if (data.session) {
      setTimeout(() => router.push("/recruiter/dashboard"), 1800);
    }
  }

  function canProceedStep1() { return fullName.trim() && email.trim() && password.length >= 8; }
  function canProceedStep2() { return companyName.trim() && companyType && industry && size && headquarters.trim(); }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex" style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}>

      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] shrink-0 bg-[#0a2412] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #c6f46b 0%, transparent 60%), radial-gradient(circle at 80% 80%, #4ade80 0%, transparent 50%)" }} />

        {/* Logo */}
        <Link href="/" className="flex items-end gap-[3px] relative z-10">
          <div className="bg-white rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 9, height: 13 }} />
          <div className="bg-white rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 12, height: 22 }} />
          <div className="bg-white rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 17, height: 33 }} />
        </Link>

        <div className="relative z-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#c6f46b] mb-4">For organisations</p>
          <h2 className="text-[36px] font-light text-white leading-[1.15] tracking-[-1px] mb-6">
            One workspace.<br />Every team.
          </h2>
          <p className="text-[14px] text-white/60 leading-[1.8] mb-10">
            Give your HR team hiring tools, your social team a content hub, and job seekers a real look at who you are.
          </p>

          <div className="flex flex-col gap-4">
            {[
              { icon: Users2, text: "HR team posts jobs & manages the pipeline" },
              { icon: ImageIcon, text: "Social team publishes company updates" },
              { icon: Building2, text: "Public profile seen by every job seeker" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#c6f46b]" />
                </div>
                <p className="text-[13px] text-white/70 leading-[1.6] pt-1">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-white/30 relative z-10">
          Already have an account?{" "}
          <Link href="/recruiter/login" className="text-white/60 hover:text-white transition-colors underline">Sign in</Link>
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Step indicator */}
        <div className="w-full max-w-[480px] mb-8">
          <div className="flex items-center gap-0">
            {STEP_LABELS.slice(0, 3).map((label, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                      done ? "bg-[#0a2412] text-[#c6f46b]" :
                      active ? "bg-[#0a2412] text-white" :
                      "bg-[#eceae3] text-[#b0ae9f]"
                    }`}>
                      {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium ${active ? "text-[#0a2412]" : "text-[#b0ae9f]"}`}>{label}</span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-[1px] mb-5 mx-2 transition-colors ${done ? "bg-[#0a2412]" : "bg-[#eceae3]"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-[480px]">

          {/* ── Step 1: Account ── */}
          {step === "account" && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-[28px] font-semibold text-[#0a2412] tracking-[-0.6px]">Create your account</h1>
                <p className="text-[13px] text-[#8a877b] mt-1">You'll be the organisation owner.</p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-[#26251f]">Full name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className={inputCls} autoFocus />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-[#26251f]">Work email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={inputCls} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-[#26251f]">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className={inputCls} />
                </div>
              </div>
              {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}
              <button
                onClick={() => { setError(null); setStep("details"); }}
                disabled={!canProceedStep1()}
                className="w-full h-[52px] bg-[#0a2412] text-white text-[14px] font-semibold rounded-[12px] hover:bg-[#142e1c] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[12px] text-[#8a877b] text-center">
                Already have an account?{" "}
                <Link href="/recruiter/login" className="text-[#0a2412] font-semibold hover:underline">Sign in</Link>
              </p>
            </div>
          )}

          {/* ── Step 2: Company details ── */}
          {step === "details" && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-[28px] font-semibold text-[#0a2412] tracking-[-0.6px]">About your organisation</h1>
                <p className="text-[13px] text-[#8a877b] mt-1">This appears on your public company profile.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-[#26251f]">Organisation name <span className="text-red-500">*</span></label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp" className={inputCls} autoFocus />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-[#26251f]">Type of organisation <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPANY_TYPES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setCompanyType(t.value)}
                        className={`flex flex-col gap-0.5 p-3 rounded-[10px] border text-left transition-all ${
                          companyType === t.value ? "border-[#0a2412] bg-[#f0f7f1]" : "border-[#eceae3] hover:border-[#0a2412]/30"
                        }`}
                      >
                        <span className="text-[12px] font-semibold text-[#0a2412]">{t.label}</span>
                        <span className="text-[10px] text-[#8a877b]">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-medium text-[#26251f]">Industry <span className="text-red-500">*</span></label>
                    <select value={industry} onChange={e => setIndustry(e.target.value)} className={selectCls}>
                      <option value="">Select…</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-medium text-[#26251f]">Employees <span className="text-red-500">*</span></label>
                    <select value={size} onChange={e => setSize(e.target.value)} className={selectCls}>
                      <option value="">Select…</option>
                      {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8a877b]" /> Headquarters <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={headquarters} onChange={e => setHeadquarters(e.target.value)} placeholder="e.g. London, UK" className={inputCls} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#8a877b]" /> Website
                  </label>
                  <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourcompany.com" className={inputCls} />
                </div>
              </div>

              {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep("account")} className="h-[52px] px-5 border border-[#eceae3] rounded-[12px] text-[13px] text-[#5f5d54] hover:bg-[#f5f3ed] transition-colors flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => { setError(null); setStep("branding"); }}
                  disabled={!canProceedStep2()}
                  className="flex-1 h-[52px] bg-[#0a2412] text-white text-[14px] font-semibold rounded-[12px] hover:bg-[#142e1c] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Branding ── */}
          {step === "branding" && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-[28px] font-semibold text-[#0a2412] tracking-[-0.6px]">Add your branding</h1>
                <p className="text-[13px] text-[#8a877b] mt-1">Help candidates recognise your organisation. You can update these later.</p>
              </div>

              {/* Banner upload */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#8a877b]" /> Cover banner
                  <span className="text-[#8a877b] font-normal">(optional)</span>
                </label>
                <div
                  onClick={() => bannerRef.current?.click()}
                  className="relative w-full h-[120px] rounded-[12px] border-2 border-dashed border-[#d4d0c8] hover:border-[#0a2412]/40 transition-colors cursor-pointer overflow-hidden bg-[#fafaf8]"
                >
                  {bannerPreview ? (
                    <>
                      <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setBannerPreview(null); setBannerUrl(null); }}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      {uploadingBanner ? <Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" /> : <Upload className="w-5 h-5 text-[#b0ae9f]" />}
                      <p className="text-[12px] text-[#8a877b]">{uploadingBanner ? "Uploading…" : "Click to upload banner (16:9)"}</p>
                    </div>
                  )}
                </div>
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
              </div>

              {/* Logo upload */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#8a877b]" /> Company logo
                  <span className="text-[#8a877b] font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => logoRef.current?.click()}
                    className="relative w-20 h-20 rounded-[14px] border-2 border-dashed border-[#d4d0c8] hover:border-[#0a2412]/40 transition-colors cursor-pointer overflow-hidden bg-[#fafaf8] flex items-center justify-center shrink-0"
                  >
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setLogoPreview(null); setLogoUrl(null); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </>
                    ) : uploadingLogo ? (
                      <Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-[#b0ae9f]" />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] text-[#3d3c36] font-medium">{companyName || "Your company"}</p>
                    <p className="text-[12px] text-[#8a877b]">Square PNG or JPG, min 200×200px</p>
                    <button type="button" onClick={() => logoRef.current?.click()} className="text-[12px] text-[#0a2412] font-semibold hover:underline mt-1">
                      {logoPreview ? "Change logo" : "Upload logo"}
                    </button>
                  </div>
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#8a877b]" /> About your organisation
                  <span className="text-[#8a877b] font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="What does your organisation do? What's your culture, mission, and what makes you a great place to work?"
                  className="w-full bg-[#fafaf8] rounded-[10px] px-[14px] py-[12px] text-[13px] text-[#26251f] placeholder:text-[#b0ae9f] focus:outline-none focus:ring-2 focus:ring-[#0a2412]/20 border border-[#eceae3] focus:border-[#0a2412]/30 transition-all resize-none"
                />
              </div>

              {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep("details")} className="h-[52px] px-5 border border-[#eceae3] rounded-[12px] text-[13px] text-[#5f5d54] hover:bg-[#f5f3ed] transition-colors flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading || uploadingLogo || uploadingBanner}
                  className="flex-1 h-[52px] bg-[#0a2412] text-white text-[14px] font-semibold rounded-[12px] hover:bg-[#142e1c] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Creating account…" : "Create Organisation"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center text-center gap-6 py-8">
              <div className="w-16 h-16 rounded-full bg-[#e8f2eb] flex items-center justify-center">
                <Check className="w-8 h-8 text-[#0a2412]" />
              </div>
              <div>
                <h1 className="text-[28px] font-semibold text-[#0a2412] tracking-[-0.6px] mb-2">
                  {companyName} is live!
                </h1>
                <p className="text-[14px] text-[#5f5d54] leading-[1.8] max-w-[340px]">
                  Your organisation account is created. Head to your dashboard to post jobs, publish updates, and set up your teams.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-[320px]">
                <Link
                  href="/recruiter/dashboard"
                  className="w-full h-[52px] bg-[#0a2412] text-white text-[14px] font-semibold rounded-[12px] hover:bg-[#142e1c] transition-colors flex items-center justify-center gap-2"
                >
                  Go to dashboard <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[12px] text-[#8a877b]">
                  Check your email to verify your account.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
