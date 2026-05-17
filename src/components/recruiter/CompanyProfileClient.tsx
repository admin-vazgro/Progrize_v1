"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Building2, Globe, MapPin, Users2, Briefcase, Share2,
  Heart, Bell, Megaphone, ArrowRight, ExternalLink, Crown,
  ShieldCheck, UserCircle2, Loader2, Upload, X, FileText, Check, ImageIcon,
} from "lucide-react";
import type { CompanyRole } from "@/types/recruiter";
import { hasCompanyPermission } from "@/lib/company-permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Company = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  logo_url: string | null;
  banner_url: string | null;
};

type Post = {
  id: string;
  title: string | null;
  content: string;
  post_type: string;
  image_urls: string[];
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null } | null;
};

type Job = {
  id: string;
  title: string;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  is_active: boolean;
  posted_at: string;
};

type Member = {
  id: string;
  user_id: string;
  role: CompanyRole;
  profile: { full_name: string | null; headline: string | null; avatar_url: string | null; email?: string | null };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const POST_TYPE_META: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  update:       { label: "Update",       Icon: Globe,      color: "text-[#0369a1]", bg: "bg-[#e0f2fe]" },
  hiring:       { label: "Hiring",       Icon: Briefcase,  color: "text-[#b45309]", bg: "bg-[#fef3c7]" },
  culture:      { label: "Culture",      Icon: Heart,      color: "text-[#be185d]", bg: "bg-[#fce7f3]" },
  announcement: { label: "Announcement", Icon: Bell,       color: "text-[#7c3aed]", bg: "bg-[#f3ecff]" },
};

const WORK_MODE_LABELS: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const TYPE_LABELS: Record<string, string> = { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract", freelance: "Freelance" };
const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Retail",
  "Manufacturing", "Media & Entertainment", "Consulting", "Real Estate",
  "Legal", "Logistics", "Energy", "Agriculture", "Other",
];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

const ROLE_META: Record<CompanyRole, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  owner:     { label: "Owner",     color: "text-[#7c3aed]", bg: "bg-[#f3ecff]", Icon: Crown },
  admin:     { label: "Admin",     color: "text-[#0a2412]", bg: "bg-[#e8f2eb]", Icon: ShieldCheck },
  hr:        { label: "HR",        color: "text-[#b45309]", bg: "bg-[#fef3c7]", Icon: Briefcase },
  social:    { label: "Social",    color: "text-[#0369a1]", bg: "bg-[#e0f2fe]", Icon: Megaphone },
  recruiter: { label: "Recruiter", color: "text-[#374151]", bg: "bg-[#f3f4f6]", Icon: UserCircle2 },
};

const TABS = [
  { id: "about",  label: "About us" },
  { id: "posts",  label: "Posts" },
  { id: "jobs",   label: "Jobs" },
  { id: "people", label: "People" },
] as const;

type TabId = typeof TABS[number]["id"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  company: Company;
  companyId: string;
  myRole: CompanyRole;
  myPermissions: string[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompanyProfileClient({ company, companyId, myRole, myPermissions }: Props) {
  const [profileCompany, setProfileCompany] = useState(company);
  const [activeTab, setActiveTab] = useState<TabId>("about");
  const [copied, setCopied] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = ["owner", "admin"].includes(myRole);
  const canManageProfile = hasCompanyPermission(myRole, myPermissions, "company.manage_profile");

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    const el = tabRefs.current[idx];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  useEffect(() => {
    Promise.all([
      fetch("/api/recruiter/posts").then((r) => r.json()),
      fetch("/api/recruiter/team").then((r) => r.json()),
      fetch("/api/recruiter/company/jobs").then((r) => r.json()),
    ]).then(([postsRes, teamRes, jobsRes]) => {
      setPosts(postsRes.posts ?? []);
      setMembers((teamRes.members ?? []).map((m: {
        id: string; user_id: string; role: CompanyRole;
        profile: { full_name: string | null; headline: string | null; avatar_url: string | null };
      }) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        profile: m.profile,
      })));
      setJobs((jobsRes.jobs ?? []).filter((j: Job) => j.is_active));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function handleShare() {
    const url = `${window.location.origin}/company/${companyId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const companyInitial = profileCompany.name?.[0]?.toUpperCase() ?? "O";
  const activeJobs = jobs.filter((j) => j.is_active);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fafaf8]">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-8 py-6 max-w-[900px]">

          {/* ── Hero card ─────────────────────────────────────────── */}
          <div className="bg-white rounded-[20px] relative mb-1" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>

            {/* Banner */}
            <div className="h-[182px] bg-[#103c1f] rounded-t-[20px] overflow-hidden relative">
              {profileCompany.banner_url && (
                <img src={profileCompany.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
            </div>

            {/* Company logo — overlaps banner */}
            <div className="absolute left-[32px] top-[138px] w-[88px] h-[88px] rounded-full border-[4px] border-white bg-[#e8f2eb] flex items-center justify-center overflow-hidden z-10">
              {profileCompany.logo_url ? (
                <img src={profileCompany.logo_url} alt={profileCompany.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#0a2412] text-[28px] font-bold leading-none">{companyInitial}</span>
              )}
            </div>

            {/* Edit profile */}
            {canManageProfile && (
              <button
                type="button"
                onClick={() => setShowEditProfile(true)}
                className="absolute right-[32px] text-[14px] text-[#4b4b4b] underline underline-offset-2 hover:text-[#0a2412] transition-colors"
                style={{ top: 182 + 24 + "px" }}
              >
                Edit profile
              </button>
            )}

            {/* Info block */}
            <div className="px-[32px] pt-[62px] pb-[28px]">
              <h1 className="text-[20px] font-bold text-black tracking-[-1px] leading-tight">
                {profileCompany.name}
              </h1>

              {profileCompany.location && (
                <p className="text-[16px] text-[#4b4b4b] tracking-[1px] mt-[6px] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {profileCompany.location}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-[12px] mt-[6px]">
                {profileCompany.industry && (
                  <span className="text-[16px] text-[#4b4b4b] tracking-[1px]">{profileCompany.industry}</span>
                )}
                {profileCompany.industry && profileCompany.size && (
                  <span className="text-black text-[16px]">•</span>
                )}
                {profileCompany.size && (
                  <span className="text-[16px] text-[#4b4b4b] tracking-[1px] flex items-center gap-1">
                    <Users2 className="w-3.5 h-3.5" />
                    {profileCompany.size} employees
                  </span>
                )}
                {!loading && members.length > 0 && (
                  <>
                    <span className="text-black text-[16px]">•</span>
                    <span className="text-[16px] text-[#4b4b4b] tracking-[1px]">{members.length} on platform</span>
                  </>
                )}
              </div>

              {profileCompany.website && (
                <a
                  href={profileCompany.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[14px] text-[#0a2412] hover:underline mt-[8px]"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {profileCompany.website.replace(/^https?:\/\/(www\.)?/, "")}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <div className="flex items-center gap-3 mt-[20px]">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-[16px] py-[8px] bg-[#0a2412] text-[#dee2df] rounded-[10px] text-[14px] font-medium hover:bg-[#142e1c] transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {copied ? "Copied!" : "Share"}
                </button>
                <Link
                  href={`/company/${companyId}`}
                  target="_blank"
                  className="flex items-center gap-2 px-[16px] py-[8px] bg-white border border-[#dddbd2] text-[#0a2412] rounded-[10px] text-[14px] font-medium hover:bg-[#f5f4f0] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View public page
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-[32px] relative">
              <div className="flex gap-[45px] relative">
                {TABS.map((tab, idx) => (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[idx] = el; }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-[13px] pb-[10px] transition-colors whitespace-nowrap ${
                      activeTab === tab.id ? "font-bold text-[#0a2412]" : "font-medium text-[#5f5d54] hover:text-[#3d3c36]"
                    }`}
                  >
                    {tab.label}
                    {tab.id === "posts" && posts.length > 0 && (
                      <span className="ml-1 text-[11px] text-[#8a877b] font-normal">{posts.length}</span>
                    )}
                    {tab.id === "jobs" && activeJobs.length > 0 && (
                      <span className="ml-1 text-[11px] text-[#8a877b] font-normal">{activeJobs.length}</span>
                    )}
                    {tab.id === "people" && members.length > 0 && (
                      <span className="ml-1 text-[11px] text-[#8a877b] font-normal">{members.length}</span>
                    )}
                  </button>
                ))}
                <div
                  className="absolute bottom-0 h-[2px] bg-[#0a2412] transition-all duration-200"
                  style={{ left: indicator.left, width: indicator.width }}
                />
              </div>
              <div className="h-px bg-[#eceae3] w-full" />
            </div>
          </div>

          {/* ── Tab content ───────────────────────────────────────── */}
          <div className="mt-4">
            {activeTab === "about"  && <AboutTab company={profileCompany} />}
            {activeTab === "posts"  && <PostsTab posts={posts} companyName={profileCompany.name} loading={loading} />}
            {activeTab === "jobs"   && <JobsTab jobs={activeJobs} companyName={profileCompany.name} isAdmin={isAdmin} loading={loading} />}
            {activeTab === "people" && <PeopleTab members={members} companyName={profileCompany.name} loading={loading} />}
          </div>

        </div>
      </div>
      {showEditProfile && (
        <EditCompanyProfileModal
          company={profileCompany}
          onClose={() => setShowEditProfile(false)}
          onSave={(updated) => {
            setProfileCompany(updated);
            setShowEditProfile(false);
          }}
        />
      )}
    </div>
  );
}

function EditCompanyProfileModal({
  company,
  onClose,
  onSave,
}: {
  company: Company;
  onClose: () => void;
  onSave: (company: Company) => void;
}) {
  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry ?? "");
  const [size, setSize] = useState(company.size ?? "");
  const [location, setLocation] = useState(company.location ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [logoUrl, setLogoUrl] = useState(company.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(company.banner_url ?? "");
  const [logoPreview, setLogoPreview] = useState(company.logo_url ?? "");
  const [bannerPreview, setBannerPreview] = useState(company.banner_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

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
    } catch {
      setLogoPreview("");
    }
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
    } catch {
      setBannerPreview("");
    }
    setUploadingBanner(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/recruiter/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        industry: industry || null,
        size: size || null,
        location: location || null,
        website: website || null,
        description: description || null,
        logo_url: logoUrl || null,
        banner_url: bannerUrl || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save company profile");
      setSaving(false);
      return;
    }
    onSave(data.company as Company);
  }

  const inputCls = "w-full h-[44px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all";
  const selectCls = inputCls + " appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-5">
      <form onSubmit={handleSubmit} className="w-full max-w-[760px] max-h-[90vh] overflow-y-auto bg-white rounded-[24px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">Company profile</p>
            <h2 className="text-[22px] font-semibold text-[#0a2412] tracking-[-0.4px]">Edit profile</h2>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-[10px] bg-[#f5f3ed] flex items-center justify-center hover:bg-[#eceae3] transition-colors">
            <X className="w-4 h-4 text-[#3d3c36]" />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#8a877b]" /> Cover banner
            </label>
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              className="relative w-full h-[150px] rounded-[14px] border-2 border-dashed border-[#d4d0c8] hover:border-[#0a2412]/40 transition-colors overflow-hidden bg-[#fafaf8]"
            >
              {bannerPreview ? (
                <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="h-full flex flex-col items-center justify-center gap-2 text-[12px] text-[#8a877b]">
                  {uploadingBanner ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-[#b0ae9f]" />}
                  {uploadingBanner ? "Uploading..." : "Click to upload banner"}
                </span>
              )}
            </button>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              className="w-20 h-20 rounded-[14px] border-2 border-dashed border-[#d4d0c8] hover:border-[#0a2412]/40 transition-colors overflow-hidden bg-[#fafaf8] flex items-center justify-center shrink-0"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="" className="w-full h-full object-cover" />
              ) : uploadingLogo ? (
                <Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" />
              ) : (
                <Building2 className="w-7 h-7 text-[#8a877b]" />
              )}
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#26251f]">Organisation name <span className="text-red-500">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-[#26251f]">Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectCls}>
                <option value="">Select...</option>
                {INDUSTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-[#26251f]">Employees</label>
              <select value={size} onChange={(e) => setSize(e.target.value)} className={selectCls}>
                <option value="">Select...</option>
                {SIZES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#8a877b]" /> Headquarters</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. London, UK" className={inputCls} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#8a877b]" /> Website</label>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" className={inputCls} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#8a877b]" /> About the organisation</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Mission, culture, what makes you a great place to work..."
              className="w-full bg-[#fafaf8] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all resize-none"
            />
          </div>

          {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-[44px] px-5 text-[13px] text-[#5f5d54] hover:text-[#26251f] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingLogo || uploadingBanner}
              className="h-[44px] px-6 bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── About Tab ────────────────────────────────────────────────────────────────

function AboutTab({ company }: { company: Company }) {
  return (
    <div className="bg-white rounded-[20px] p-6 flex flex-col gap-5">
      {company.description ? (
        <div>
          <h3 className="text-[14px] font-semibold text-[#0a2412] mb-2">About</h3>
          <p className="text-[14px] text-[#3d3c36] leading-[1.8] whitespace-pre-wrap">{company.description}</p>
        </div>
      ) : (
        <div className="py-6 text-center">
          <Building2 className="w-8 h-8 text-[#c8c5bc] mx-auto mb-2" />
          <p className="text-[13px] text-[#8a877b]">No company description yet.</p>
        </div>
      )}

      {(company.industry || company.size || company.location || company.website) && (
        <div className="border-t border-[#f5f3ed] pt-5 grid grid-cols-2 gap-4">
          {company.industry && (
            <div>
              <p className="text-[11px] text-[#8a877b] uppercase tracking-[0.1em] mb-1">Industry</p>
              <p className="text-[13px] text-[#26251f] font-medium">{company.industry}</p>
            </div>
          )}
          {company.size && (
            <div>
              <p className="text-[11px] text-[#8a877b] uppercase tracking-[0.1em] mb-1">Company size</p>
              <p className="text-[13px] text-[#26251f] font-medium">{company.size} employees</p>
            </div>
          )}
          {company.location && (
            <div>
              <p className="text-[11px] text-[#8a877b] uppercase tracking-[0.1em] mb-1">Headquarters</p>
              <p className="text-[13px] text-[#26251f] font-medium">{company.location}</p>
            </div>
          )}
          {company.website && (
            <div>
              <p className="text-[11px] text-[#8a877b] uppercase tracking-[0.1em] mb-1">Website</p>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#0a2412] font-medium hover:underline"
              >
                {company.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Posts Tab ────────────────────────────────────────────────────────────────

function PostsTab({ posts, companyName, loading }: { posts: Post[]; companyName: string; loading: boolean }) {
  if (loading) return <LoadingCard />;

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-12 text-center">
        <Megaphone className="w-8 h-8 text-[#c8c5bc] mx-auto mb-3" />
        <p className="text-[14px] font-medium text-[#5f5d54] mb-1">No posts yet</p>
        <p className="text-[13px] text-[#8a877b]">Posts published from Community will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => {
        const meta = POST_TYPE_META[post.post_type] ?? POST_TYPE_META.update;
        return (
          <div key={post.id} className="bg-white rounded-[20px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {post.author?.avatar_url ? (
                  <img src={post.author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[11px] font-bold shrink-0">
                    {(post.author?.full_name ?? companyName).split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-[13px] font-semibold text-[#0a2412]">{post.author?.full_name ?? companyName}</p>
                  <p className="text-[11px] text-[#8a877b]">{formatDate(post.created_at)}</p>
                </div>
              </div>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
                <meta.Icon className="w-3 h-3" />
                {meta.label}
              </span>
            </div>
            {post.title && (
              <h3 className="text-[15px] font-semibold text-[#0a2412] tracking-[-0.3px] mb-2">{post.title}</h3>
            )}
            <p className="text-[13px] text-[#3d3c36] leading-[1.7] whitespace-pre-wrap">{post.content}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

function JobsTab({ jobs, companyName, isAdmin, loading }: { jobs: Job[]; companyName: string; isAdmin: boolean; loading: boolean }) {
  if (loading) return <LoadingCard />;

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-12 text-center">
        <Briefcase className="w-8 h-8 text-[#c8c5bc] mx-auto mb-3" />
        <p className="text-[14px] font-medium text-[#5f5d54] mb-1">No active jobs</p>
        {isAdmin && (
          <Link href="/recruiter/jobs/new" className="text-[13px] text-[#0a2412] font-semibold hover:underline mt-1 block">
            Post a job →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/recruiter/jobs/${job.id}`}
          className="group bg-white rounded-[16px] p-5 hover:shadow-sm transition-shadow flex items-start justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[#0a2412] group-hover:underline leading-tight mb-1">{job.title}</p>
            <p className="text-[12px] text-[#8a877b] mb-2">{companyName}{job.location ? ` · ${job.location}` : ""}</p>
            <div className="flex flex-wrap gap-[6px]">
              {job.work_mode && (
                <span className="border border-[#d0ebd8] bg-[#f0f9f3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#1a5c30]">
                  {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
                </span>
              )}
              {job.employment_type && (
                <span className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">
                  {TYPE_LABELS[job.employment_type] ?? job.employment_type}
                </span>
              )}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#c8c5bc] shrink-0 mt-1 group-hover:text-[#0a2412] transition-colors" />
        </Link>
      ))}
    </div>
  );
}

// ─── People Tab ───────────────────────────────────────────────────────────────

function PeopleTab({ members, companyName, loading }: { members: Member[]; companyName: string; loading: boolean }) {
  if (loading) return <LoadingCard />;

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-12 text-center">
        <Users2 className="w-8 h-8 text-[#c8c5bc] mx-auto mb-3" />
        <p className="text-[14px] font-medium text-[#5f5d54]">No team members yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {members.map((m) => {
        const { label, color, bg, Icon } = ROLE_META[m.role] ?? ROLE_META.recruiter;
        const displayName = m.profile.full_name ?? (m.role === "owner" ? companyName : m.profile.email ?? "Team member");
        const displayHeadline = m.profile.headline ?? (m.role === "owner" ? "Company account" : m.profile.email ?? "");
        const initials = displayName
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <Link
            key={m.id}
            href={`/u/${m.user_id}`}
            className="bg-white rounded-[14px] p-5 flex flex-col gap-3 ring-1 ring-[#e8f2eb] hover:ring-[#b8dfc4] hover:-translate-y-[2px] hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              {m.profile.avatar_url ? (
                <img src={m.profile.avatar_url} alt="" className="w-[42px] h-[42px] rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-[42px] h-[42px] rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[13px] font-bold shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#0a2412] truncate">{displayName}</p>
                {displayHeadline && (
                  <p className="text-[11px] text-[#5f5d54] truncate mt-[2px]">{displayHeadline}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-1.5 px-[8px] py-[3px] rounded-full text-[10px] font-semibold ${bg} ${color}`}>
                <Icon className="w-2.5 h-2.5" />
                {label}
              </span>
              <span className="text-[11px] text-[#b0ae9f]">View →</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function LoadingCard() {
  return (
    <div className="bg-white rounded-[20px] p-12 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" />
    </div>
  );
}
