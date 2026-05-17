"use client";

import { useState, useEffect, useRef } from "react";
import {
  Building2, Globe, MapPin, Users2, FileText, Check, Loader2,
  Upload, X, Search, Plus, Trash2, ChevronDown,
  Crown, ShieldCheck, Briefcase, Megaphone, UserCircle2,
  ImageIcon,
} from "lucide-react";
import type { Company, TeamMember, CompanyRole } from "@/types/recruiter";
import { hasCompanyPermission } from "@/lib/company-permissions";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Retail",
  "Manufacturing", "Media & Entertainment", "Consulting", "Real Estate",
  "Legal", "Logistics", "Energy", "Agriculture", "Other",
];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

const TEAMS: { role: CompanyRole; label: string; description: string; Icon: React.ElementType; color: string; bg: string }[] = [
  { role: "admin",    label: "Admin",       description: "All permissions except ownership transfer", Icon: ShieldCheck, color: "text-[#0a2412]", bg: "bg-[#e8f2eb]" },
  { role: "hr",       label: "HR Team",     description: "Post jobs, manage applications & pipeline",  Icon: Briefcase,   color: "text-[#b45309]", bg: "bg-[#fef3c7]" },
  { role: "social",   label: "Social Media",description: "Publish company posts & updates",            Icon: Megaphone,   color: "text-[#0369a1]", bg: "bg-[#e0f2fe]" },
  { role: "recruiter",label: "Recruiter",   description: "Post jobs and review candidates",            Icon: UserCircle2, color: "text-[#374151]", bg: "bg-[#f3f4f6]" },
];

const ROLE_META: Record<CompanyRole, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  owner:    { label: "Owner",    color: "text-[#7c3aed]", bg: "bg-[#f3ecff]", Icon: Crown },
  admin:    { label: "Admin",    color: "text-[#0a2412]", bg: "bg-[#e8f2eb]", Icon: ShieldCheck },
  hr:       { label: "HR",       color: "text-[#b45309]", bg: "bg-[#fef3c7]", Icon: Briefcase },
  social:   { label: "Social",   color: "text-[#0369a1]", bg: "bg-[#e0f2fe]", Icon: Megaphone },
  recruiter:{ label: "Recruiter",color: "text-[#374151]", bg: "bg-[#f3f4f6]", Icon: UserCircle2 },
};

interface SearchUser { id: string; full_name: string | null; headline: string | null; avatar_url: string | null; email: string | null }

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  company: Company & { banner_url?: string | null };
  myRole: CompanyRole;
  myPermissions: string[];
  currentUserId: string;
}

export default function OrgSettingsClient({ company, myRole, myPermissions, currentUserId }: Props) {
  const [activeTab, setActiveTab] = useState<"profile" | "teams">("profile");
  const canManageProfile = hasCompanyPermission(myRole, myPermissions, "company.manage_profile");
  const canManageMembers = hasCompanyPermission(myRole, myPermissions, "company.manage_members");

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[800px] mx-auto px-8 py-8">
        <div className="mb-6">
          <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">Settings</h1>
          <p className="text-[15px] text-[#5f5d54] mt-[8px]">{company.name}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#eceae3] mb-8">
          {[
            { id: "profile" as const, label: "Company Profile" },
            { id: "teams"   as const, label: "Teams & Permissions" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-[13px] border-b-2 -mb-px transition-colors ${
                activeTab === t.id
                  ? "border-[#0a2412] text-[#0a2412] font-medium"
                  : "border-transparent text-[#8a877b] hover:text-[#3d3c36]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && <ProfileTab company={company} isAdmin={canManageProfile} />}
        {activeTab === "teams"   && <TeamsTab companyName={company.name} myRole={myRole} currentUserId={currentUserId} companyId={company.id} isAdmin={canManageMembers} />}
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ company, isAdmin }: { company: Props["company"]; isAdmin: boolean }) {
  const [name, setName]             = useState(company.name);
  const [industry, setIndustry]     = useState(company.industry ?? "");
  const [size, setSize]             = useState(company.size ?? "");
  const [location, setLocation]     = useState(company.location ?? "");
  const [website, setWebsite]       = useState(company.website ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [logoUrl, setLogoUrl]       = useState(company.logo_url ?? "");
  const [bannerUrl, setBannerUrl]   = useState(company.banner_url ?? "");
  const [logoPreview, setLogoPreview]   = useState(company.logo_url ?? "");
  const [bannerPreview, setBannerPreview] = useState(company.banner_url ?? "");

  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo]   = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const logoRef   = useRef<HTMLInputElement>(null);
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
    try { const url = await uploadImage(file, "logo"); setLogoUrl(url); } catch { setLogoPreview(""); }
    setUploadingLogo(false);
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setBannerPreview(URL.createObjectURL(file));
    try { const url = await uploadImage(file, "banner"); setBannerUrl(url); } catch { setBannerPreview(""); }
    setUploadingBanner(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    const res = await fetch("/api/recruiter/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, industry: industry || null, size: size || null,
        location: location || null, website: website || null,
        description: description || null,
        logo_url: logoUrl || null, banner_url: bannerUrl || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); setSaving(false); return; }
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  }

  const inputCls = "w-full h-[44px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all";
  const selectCls = inputCls + " appearance-none cursor-pointer";
  const disabledCls = "w-full h-[44px] bg-[#f5f3ed] rounded-[8px] px-[12px] text-[13px] text-[#8a877b] border border-[#eceae3] flex items-center";

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">

      {/* Banner */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[#8a877b]" /> Cover banner
        </label>
        {isAdmin ? (
          <div
            onClick={() => bannerRef.current?.click()}
            className="relative w-full h-[130px] rounded-[12px] border-2 border-dashed border-[#d4d0c8] hover:border-[#0a2412]/40 transition-colors cursor-pointer overflow-hidden bg-[#fafaf8]"
          >
            {bannerPreview ? (
              <>
                <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                <button type="button" onClick={e => { e.stopPropagation(); setBannerPreview(""); setBannerUrl(""); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                {uploadingBanner ? <Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" /> : <Upload className="w-5 h-5 text-[#b0ae9f]" />}
                <p className="text-[12px] text-[#8a877b]">{uploadingBanner ? "Uploading…" : "Click to upload banner"}</p>
              </div>
            )}
          </div>
        ) : bannerPreview ? (
          <img src={bannerPreview} alt="Banner" className="w-full h-[130px] object-cover rounded-[12px]" />
        ) : (
          <div className="w-full h-[130px] rounded-[12px] bg-[#f5f3ed] flex items-center justify-center">
            <p className="text-[12px] text-[#8a877b]">No banner</p>
          </div>
        )}
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
      </div>

      {/* Logo + name row */}
      <div className="flex items-center gap-5">
        {isAdmin ? (
          <div onClick={() => logoRef.current?.click()}
            className="relative w-20 h-20 rounded-[14px] border-2 border-dashed border-[#d4d0c8] hover:border-[#0a2412]/40 transition-colors cursor-pointer overflow-hidden bg-[#fafaf8] flex items-center justify-center shrink-0">
            {logoPreview ? (
              <>
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                <button type="button" onClick={e => { e.stopPropagation(); setLogoPreview(""); setLogoUrl(""); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </>
            ) : uploadingLogo ? <Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" /> : <Upload className="w-5 h-5 text-[#b0ae9f]" />}
          </div>
        ) : (
          <div className="w-20 h-20 rounded-[14px] bg-[#e8f2eb] flex items-center justify-center shrink-0 overflow-hidden">
            {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-8 h-8 text-[#0a2412]" />}
          </div>
        )}
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#26251f]">Organisation name <span className="text-red-500">*</span></label>
          {isAdmin
            ? <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputCls} />
            : <div className={disabledCls}>{name}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-[#26251f]">Industry</label>
          {isAdmin ? (
            <select value={industry} onChange={e => setIndustry(e.target.value)} className={selectCls}>
              <option value="">Select…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          ) : <div className={disabledCls}>{industry || "—"}</div>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-[#26251f]">Employees</label>
          {isAdmin ? (
            <select value={size} onChange={e => setSize(e.target.value)} className={selectCls}>
              <option value="">Select…</option>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : <div className={disabledCls}>{size || "—"}</div>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#8a877b]" /> Headquarters</label>
        {isAdmin
          ? <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. London, UK" className={inputCls} />
          : <div className={disabledCls}>{location || "—"}</div>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#8a877b]" /> Website</label>
        {isAdmin
          ? <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourcompany.com" className={inputCls} />
          : <div className={disabledCls}>{website || "—"}</div>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-[#26251f] flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#8a877b]" /> About the organisation</label>
        {isAdmin ? (
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            placeholder="Mission, culture, what makes you a great place to work…"
            className="w-full bg-[#fafaf8] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all resize-none" />
        ) : <div className="min-h-[80px] bg-[#f5f3ed] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[#8a877b] border border-[#eceae3]">{description || "—"}</div>}
      </div>

      {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}

      {isAdmin && (
        <button type="submit" disabled={saving || uploadingLogo || uploadingBanner}
          className="self-start flex items-center gap-2 h-[44px] px-6 bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors disabled:opacity-50">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saved && <Check className="w-4 h-4 text-[#c6f46b]" />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </button>
      )}
    </form>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────

function TeamsTab({ companyName, myRole, currentUserId, companyId, isAdmin }: { companyName: string; myRole: CompanyRole; currentUserId: string; companyId: string; isAdmin: boolean }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState<CompanyRole>("hr");

  // invite state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState<CompanyRole>("hr");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const res = await fetch("/api/recruiter/team");
    const data = await res.json();
    setMembers(data.members ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/recruiter/team/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.users ?? []);
      setSearching(false);
    }, 280);
  }, [query]);

  function openInvite(role: CompanyRole) { setInviteRole(role); setShowInvite(true); setQuery(""); setResults([]); setSelectedUser(null); setAddError(null); }

  async function handleAdd() {
    if (!selectedUser) return;
    setAdding(true); setAddError(null);
    const res = await fetch("/api/recruiter/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_user_id: selectedUser.id, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error ?? "Failed"); setAdding(false); return; }
    await load();
    setShowInvite(false); setAdding(false);
  }

  async function handleRoleChange(userId: string, role: CompanyRole) {
    setUpdating(userId); setRoleMenuOpen(null);
    await fetch(`/api/recruiter/team/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    await load(); setUpdating(null);
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member?")) return;
    setUpdating(userId);
    await fetch(`/api/recruiter/team/${userId}`, { method: "DELETE" });
    await load(); setUpdating(null);
  }

  const teamMembers = members.filter(m => m.role === activeTeam);
  const owners = members.filter(m => m.role === "owner");
  const activeTeamMeta = TEAMS.find(t => t.role === activeTeam)!;
  const ownerDisplayName = owners[0]?.profile.full_name ?? companyName;
  const ownerDisplayHeadline = owners[0]?.profile.headline ?? owners[0]?.profile.email ?? "Company account";

  return (
    <div className="flex flex-col gap-6">
      {/* Owner card */}
      {owners.length > 0 && (
        <div className="bg-white rounded-[16px] p-4 flex items-center gap-4">
          {owners[0].profile.avatar_url ? (
            <img src={owners[0].profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[12px] font-bold shrink-0">
              {ownerDisplayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#0a2412]">{ownerDisplayName}</p>
            <p className="text-[12px] text-[#8a877b]">{ownerDisplayHeadline}</p>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f3ecff] text-[#7c3aed]">
            <Crown className="w-3 h-3" /> Owner
          </span>
        </div>
      )}

      {/* Team selector + members */}
      <div className="bg-white rounded-[20px] overflow-hidden">
        {/* Team tabs */}
        <div className="flex border-b border-[#f5f3ed] overflow-x-auto">
          {TEAMS.map(t => {
            const count = members.filter(m => m.role === t.role).length;
            return (
              <button key={t.role} onClick={() => setActiveTeam(t.role)}
                className={`flex items-center gap-2 px-5 py-3.5 text-[13px] whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  activeTeam === t.role ? "border-[#0a2412] text-[#0a2412] font-medium" : "border-transparent text-[#8a877b] hover:text-[#3d3c36]"
                }`}>
                <t.Icon className="w-3.5 h-3.5" />
                {t.label}
                {count > 0 && <span className="text-[10px] font-mono text-[#8a877b]">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Team description + permissions */}
        <div className="px-6 pt-5 pb-4 border-b border-[#f5f3ed]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-[8px] ${activeTeamMeta.bg} flex items-center justify-center shrink-0`}>
                <activeTeamMeta.Icon className={`w-4 h-4 ${activeTeamMeta.color}`} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#0a2412]">{activeTeamMeta.label}</p>
                <p className="text-[12px] text-[#8a877b] mt-0.5">{activeTeamMeta.description}</p>
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => openInvite(activeTeam)}
                className="flex items-center gap-1.5 h-[34px] px-4 bg-[#0a2412] text-[#dee2df] text-[12px] font-medium rounded-[8px] hover:bg-[#142e1c] transition-colors shrink-0">
                <Plus className="w-3.5 h-3.5" /> Add member
              </button>
            )}
          </div>
        </div>

        {/* Members list */}
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" /></div>
        ) : teamMembers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
            <div className={`w-12 h-12 rounded-[12px] ${activeTeamMeta.bg} flex items-center justify-center`}>
              <activeTeamMeta.Icon className={`w-6 h-6 ${activeTeamMeta.color}`} />
            </div>
            <p className="text-[13px] font-medium text-[#5f5d54]">No {activeTeamMeta.label} members yet</p>
            {isAdmin && (
              <button onClick={() => openInvite(activeTeam)} className="text-[13px] font-semibold text-[#0a2412] hover:underline">
                Add the first member
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#f5f3ed]">
            {teamMembers.map(m => {
              const { label, color, bg, Icon } = ROLE_META[m.role];
              const isSelf = m.user_id === currentUserId;
              const canEdit = isAdmin && m.role !== "owner";
              const displayName = m.profile.full_name ?? (m.role === "owner" ? companyName : m.profile.email ?? "Team member");
              const displayHeadline = m.profile.headline ?? (m.role === "owner" ? "Company account" : m.profile.email ?? "");

              return (
                <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                  {m.profile.avatar_url ? (
                    <img src={m.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[12px] font-bold shrink-0">
                      {displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#0a2412] truncate">{displayName}</p>
                      {isSelf && <span className="text-[10px] text-[#8a877b] bg-[#f5f3ed] px-1.5 py-0.5 rounded-full">you</span>}
                    </div>
                    <p className="text-[12px] text-[#8a877b] truncate">{displayHeadline}</p>
                  </div>

                  {/* Role badge / change */}
                  <div className="relative shrink-0">
                    {canEdit ? (
                      <button onClick={() => setRoleMenuOpen(roleMenuOpen === m.user_id ? null : m.user_id)}
                        disabled={updating === m.user_id}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${bg} ${color} hover:opacity-80 transition-opacity`}>
                        <Icon className="w-3 h-3" />
                        {updating === m.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : label}
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>
                    ) : (
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${bg} ${color}`}>
                        <Icon className="w-3 h-3" />{label}
                      </span>
                    )}
                    {roleMenuOpen === m.user_id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-[10px] shadow-lg border border-[#eceae3] z-20 py-1">
                        {(["admin", "hr", "social", "recruiter"] as CompanyRole[]).map(r => {
                          const { label: rl, color: rc, bg: rb, Icon: RI } = ROLE_META[r];
                          return (
                            <button key={r} onClick={() => handleRoleChange(m.user_id, r)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#fafaf8] ${m.role === r ? "font-semibold" : ""}`}>
                              <span className={`w-5 h-5 rounded-[4px] ${rb} flex items-center justify-center`}><RI className={`w-3 h-3 ${rc}`} /></span>
                              <span className="text-[#26251f]">{rl}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {(canEdit || isSelf) && (
                    <button onClick={() => handleRemove(m.user_id)} disabled={updating === m.user_id}
                      className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#c8c5bc] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative bg-white rounded-[24px] w-full max-w-[460px] shadow-2xl p-7" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowInvite(false)} className="absolute top-5 right-5 w-8 h-8 rounded-[8px] bg-[#f5f3ed] flex items-center justify-center hover:bg-[#eceae3]">
              <X className="w-3.5 h-3.5 text-[#5f5d54]" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-9 h-9 rounded-[8px] ${ROLE_META[inviteRole].bg} flex items-center justify-center shrink-0`}>
                {(() => { const { Icon, color } = ROLE_META[inviteRole]; return <Icon className={`w-4 h-4 ${color}`} />; })()}
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-[#0a2412] tracking-[-0.4px]">Add to {TEAMS.find(t => t.role === inviteRole)?.label}</h2>
                <p className="text-[12px] text-[#8a877b]">Search for existing platform users.</p>
              </div>
            </div>

            {!selectedUser ? (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a877b]" />
                  <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-full h-[48px] bg-[#fafaf8] rounded-[10px] pl-10 pr-4 text-[13px] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent" />
                  {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a877b] animate-spin" />}
                </div>
                {results.length > 0 && (
                  <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                    {results.map(u => (
                      <button key={u.id} onClick={() => setSelectedUser(u)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-[#f5f3ed] transition-colors text-left">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[11px] font-bold shrink-0">
                            {(u.full_name ?? "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#0a2412] truncate">{u.full_name ?? u.email ?? "User"}</p>
                          <p className="text-[11px] text-[#8a877b] truncate">{u.headline ?? u.email ?? ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {query.length >= 2 && !searching && results.length === 0 && (
                  <p className="text-[12px] text-[#8a877b] text-center py-3">No users found</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 p-3 bg-[#f5f3ed] rounded-[12px]">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[12px] font-bold shrink-0">
                      {(selectedUser.full_name ?? "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0a2412]">{selectedUser.full_name ?? selectedUser.email ?? "User"}</p>
                    <p className="text-[12px] text-[#8a877b]">{selectedUser.headline ?? selectedUser.email ?? ""}</p>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-[#8a877b] hover:text-[#26251f]"><X className="w-4 h-4" /></button>
                </div>
                {addError && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{addError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setSelectedUser(null)} className="h-[44px] px-4 text-[13px] text-[#5f5d54] hover:text-[#26251f]">Back</button>
                  <button onClick={handleAdd} disabled={adding}
                    className="flex-1 h-[44px] bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] disabled:opacity-50 flex items-center justify-center gap-2">
                    {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                    {adding ? "Adding…" : `Add to ${TEAMS.find(t => t.role === inviteRole)?.label}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
