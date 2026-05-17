"use client";

import { useState, useEffect, useRef } from "react";
import {
  Users, Search, Plus, Trash2, ChevronDown, Loader2,
  ShieldCheck, Crown, Briefcase, Megaphone, UserCircle2, X,
} from "lucide-react";
import type { TeamMember, CompanyRole } from "@/types/recruiter";
import { hasCompanyPermission } from "@/lib/company-permissions";

const ROLE_META: Record<CompanyRole, { label: string; color: string; bg: string; Icon: React.ElementType; description: string }> = {
  owner:    { label: "Owner",    color: "text-[#7c3aed]", bg: "bg-[#f3ecff]", Icon: Crown,        description: "Full control — billing, settings, team" },
  admin:    { label: "Admin",    color: "text-[#0a2412]", bg: "bg-[#e8f2eb]", Icon: ShieldCheck,  description: "All permissions except transferring ownership" },
  hr:       { label: "HR",       color: "text-[#b45309]", bg: "bg-[#fef3c7]", Icon: Briefcase,    description: "Post jobs, manage applications & pipeline" },
  social:   { label: "Social",   color: "text-[#0369a1]", bg: "bg-[#e0f2fe]", Icon: Megaphone,    description: "Create company posts & marketing content" },
  recruiter:{ label: "Recruiter",color: "text-[#374151]", bg: "bg-[#f3f4f6]", Icon: UserCircle2,  description: "Post jobs and review candidates" },
};

const ASSIGNABLE_ROLES: CompanyRole[] = ["admin", "hr", "social", "recruiter"];

interface SearchUser {
  id: string;
  full_name: string | null;
  headline: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface Props {
  companyId: string;
  companyName: string;
  myRole: CompanyRole;
  myPermissions: string[];
  currentUserId: string;
}

export default function TeamClient({ companyName, myRole, myPermissions, currentUserId }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  // invite state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [newRole, setNewRole] = useState<CompanyRole>("hr");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [roleMenuOpen, setRoleMenuOpen] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<CompanyRole[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = hasCompanyPermission(myRole, myPermissions, "company.manage_members");

  async function loadMembers() {
    const res = await fetch("/api/recruiter/team");
    const data = await res.json();
    setMembers(data.members ?? []);
    setLoading(false);
  }

  useEffect(() => { loadMembers(); }, []);

  useEffect(() => {
    if (!showInvite) { setQuery(""); setSearchResults([]); setSelectedUser(null); setAddError(null); }
  }, [showInvite]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/recruiter/team/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.users ?? []);
      setSearching(false);
    }, 280);
  }, [query]);

  async function handleAdd() {
    if (!selectedUser) return;
    setAdding(true);
    setAddError(null);
    const res = await fetch("/api/recruiter/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_user_id: selectedUser.id, role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error ?? "Failed to add member"); setAdding(false); return; }
    await loadMembers();
    setShowInvite(false);
    setAdding(false);
  }

  async function handleRoleChange(userId: string, roles: CompanyRole[]) {
    if (roles.length === 0) return;
    setUpdating(userId);
    setRoleMenuOpen(null);
    await fetch(`/api/recruiter/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles }),
    });
    await loadMembers();
    setUpdating(null);
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member from the team?")) return;
    setUpdating(userId);
    await fetch(`/api/recruiter/team/${userId}`, { method: "DELETE" });
    await loadMembers();
    setUpdating(null);
  }

  const inputCls = "w-full h-[44px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all";

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[820px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">Team</h1>
            <p className="text-[15px] text-[#5f5d54] mt-[8px]">Manage who has access to <span className="font-semibold">{companyName}</span> and what they can do.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 h-[40px] px-5 bg-[#0a2412] text-[#dee2df] text-[13px] font-medium rounded-[10px] hover:bg-[#142e1c] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add member
            </button>
          )}
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {(["hr", "social", "admin", "owner"] as CompanyRole[]).map((r) => {
            const { label, color, bg, Icon, description } = ROLE_META[r];
            return (
              <div key={r} className="bg-white rounded-[14px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-[6px] ${bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <span className={`text-[12px] font-semibold ${color}`}>{label}</span>
                </div>
                <p className="text-[11px] text-[#8a877b] leading-[1.5]">{description}</p>
              </div>
            );
          })}
        </div>

        {/* Members table */}
        <div className="bg-white rounded-[20px]">
          <div className="px-6 py-4 border-b border-[#eceae3] flex items-center gap-2 rounded-t-[20px]">
            <Users className="w-4 h-4 text-[#8a877b]" />
            <span className="text-[13px] font-semibold text-[#26251f]">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-[#f5f3ed]">
              {members.map((m) => {
                const { label, color, bg, Icon } = ROLE_META[m.role] ?? ROLE_META.recruiter;
                const isSelf = m.user_id === currentUserId;
                const isOwner = m.role === "owner";
                const canEdit = isAdmin && !isOwner && !isSelf;
                const displayName = m.profile.full_name ?? (isOwner ? companyName : m.profile.email ?? "Team member");
                const displayHeadline = m.profile.headline ?? (isOwner ? "Company account" : m.profile.email ?? "");

                return (
                  <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                    {/* Avatar */}
                    {m.profile.avatar_url ? (
                      <img src={m.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[12px] font-bold shrink-0">
                        {displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-[#0a2412] truncate">
                          {displayName}
                        </p>
                        {isSelf && <span className="text-[10px] text-[#8a877b] bg-[#f5f3ed] px-1.5 py-0.5 rounded-full">you</span>}
                      </div>
                      <p className="text-[12px] text-[#8a877b] truncate">{displayHeadline}</p>
                    </div>

                    {/* Role badges / multi-role selector */}
                    <div className="relative shrink-0 flex items-center gap-1.5 flex-wrap justify-end max-w-[200px]">
                      {(m.roles ?? [m.role]).map((r) => {
                        const rm = ROLE_META[r as CompanyRole] ?? ROLE_META.recruiter;
                        return (
                          <span key={r} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${rm.bg} ${rm.color}`}>
                            <rm.Icon className="w-2.5 h-2.5" />
                            {rm.label}
                          </span>
                        );
                      })}
                      {updating === m.user_id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8a877b]" />}
                      {canEdit && updating !== m.user_id && (
                        <button
                          onClick={() => {
                            const currentRoles = (m.roles ?? [m.role]) as CompanyRole[];
                            setPendingRoles(currentRoles);
                            setRoleMenuOpen(roleMenuOpen === m.user_id ? null : m.user_id);
                          }}
                          className="w-5 h-5 rounded-full bg-[#eceae3] hover:bg-[#d4d0c8] flex items-center justify-center transition-colors"
                        >
                          <ChevronDown className="w-3 h-3 text-[#5f5d54]" />
                        </button>
                      )}

                      {roleMenuOpen === m.user_id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-[12px] shadow-xl border border-[#eceae3] z-20 p-2">
                          <p className="text-[10px] font-semibold text-[#8a877b] uppercase tracking-wide px-2 py-1">Assign roles</p>
                          {ASSIGNABLE_ROLES.map((r) => {
                            const { label: rl, color: rc, bg: rb, Icon: RI } = ROLE_META[r];
                            const checked = pendingRoles.includes(r);
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setPendingRoles(checked
                                  ? pendingRoles.filter(x => x !== r)
                                  : [...pendingRoles, r]
                                )}
                                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[8px] hover:bg-[#fafaf8] transition-colors"
                              >
                                <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 ${checked ? "border-[#0a2412] bg-[#0a2412]" : "border-[#d4d0c8]"}`}>
                                  {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <span className={`w-6 h-6 rounded-[5px] ${rb} flex items-center justify-center shrink-0`}>
                                  <RI className={`w-3 h-3 ${rc}`} />
                                </span>
                                <span className="text-[12px] text-[#26251f]">{rl}</span>
                              </button>
                            );
                          })}
                          <div className="flex gap-2 mt-2 px-1">
                            <button
                              type="button"
                              onClick={() => setRoleMenuOpen(null)}
                              className="flex-1 h-8 text-[12px] text-[#5f5d54] hover:text-[#26251f] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={pendingRoles.length === 0}
                              onClick={() => handleRoleChange(m.user_id, pendingRoles)}
                              className="flex-1 h-8 bg-[#0a2412] text-[#dee2df] text-[12px] font-semibold rounded-[8px] hover:bg-[#142e1c] transition-colors disabled:opacity-40"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remove */}
                    {(isAdmin && !isOwner) || isSelf ? (
                      <button
                        onClick={() => handleRemove(m.user_id)}
                        disabled={updating === m.user_id}
                        className="shrink-0 w-7 h-7 rounded-[6px] flex items-center justify-center text-[#c8c5bc] hover:text-red-500 hover:bg-red-50 transition-colors"
                        title={isSelf ? "Leave team" : "Remove member"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : <div className="w-7 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add member modal */}
        {showInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[460px] shadow-2xl p-7" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowInvite(false)} className="absolute top-5 right-5 w-8 h-8 rounded-[8px] bg-[#f5f3ed] flex items-center justify-center hover:bg-[#eceae3] transition-colors">
                <X className="w-3.5 h-3.5 text-[#5f5d54]" />
              </button>

              <h2 className="text-[20px] font-semibold text-[#0a2412] tracking-[-0.4px] mb-1">Add team member</h2>
              <p className="text-[13px] text-[#8a877b] mb-5">Search for existing platform users by name or email.</p>

              {/* User search */}
              {!selectedUser ? (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a877b]" />
                    <input
                      autoFocus
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name or email…"
                      className="w-full h-[48px] bg-[#fafaf8] rounded-[10px] pl-10 pr-4 text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all"
                    />
                    {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a877b] animate-spin" />}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto">
                      {searchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-[#f5f3ed] transition-colors text-left"
                        >
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
                  {query.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-[12px] text-[#8a877b] text-center py-3">No users found for &ldquo;{query}&rdquo;</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Selected user */}
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
                    <button onClick={() => setSelectedUser(null)} className="text-[#8a877b] hover:text-[#26251f] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Role picker */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-medium text-[#26251f]">Assign role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ASSIGNABLE_ROLES.map((r) => {
                        const { label, color, bg, Icon: RI, description } = ROLE_META[r];
                        const sel = newRole === r;
                        return (
                          <button
                            key={r}
                            onClick={() => setNewRole(r)}
                            className={`flex flex-col gap-1.5 p-3 rounded-[10px] border text-left transition-all ${
                              sel ? "border-[#0a2412] bg-[#f0f7f1]" : "border-[#eceae3] hover:border-[#0a2412]/30"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-[5px] ${bg} flex items-center justify-center`}>
                                <RI className={`w-3 h-3 ${color}`} />
                              </span>
                              <span className={`text-[12px] font-semibold ${sel ? "text-[#0a2412]" : "text-[#26251f]"}`}>{label}</span>
                            </div>
                            <p className="text-[10px] text-[#8a877b] leading-[1.4]">{description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {addError && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{addError}</p>}

                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setSelectedUser(null)} className="h-[44px] px-4 text-[13px] text-[#5f5d54] hover:text-[#26251f] transition-colors">
                      Back
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={adding}
                      className="flex-1 h-[44px] bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                      {adding ? "Adding…" : `Add as ${ROLE_META[newRole].label}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
