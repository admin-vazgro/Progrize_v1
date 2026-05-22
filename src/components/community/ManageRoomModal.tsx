"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Trash2, Globe, Lock, UserMinus, UserPlus, Link, Check, RefreshCw } from "lucide-react";

interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_private: boolean;
}

interface Member {
  user_id: string;
  role: string;
  profile: { id: string; full_name: string | null; headline: string | null } | null;
}

interface SearchUser {
  id: string;
  full_name: string | null;
  headline: string | null;
}

type Tab = "settings" | "members" | "invite";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onUpdated: (room: Room) => void;
}

export default function ManageRoomModal({ isOpen, onClose, room, onUpdated }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("settings");

  // Settings state
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [isPrivate, setIsPrivate] = useState(room.is_private);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Invite state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    const res = await fetch(`/api/rooms/${room.slug}/members`);
    const data = await res.json();
    setMembers(data.members ?? []);
    setMembersLoading(false);
  }, [room.slug]);

  const fetchInvite = useCallback(async () => {
    setInviteLoading(true);
    const res = await fetch(`/api/rooms/${room.slug}/invite`);
    const data = await res.json();
    setInviteToken(data.invite_token ?? null);
    setInviteLoading(false);
  }, [room.slug]);

  useEffect(() => {
    if (!isOpen) return;
    if (tab === "members") fetchMembers();
    if (tab === "invite") fetchInvite();
  }, [isOpen, tab, fetchMembers, fetchInvite]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      const res = await fetch(`/api/people?q=${encodeURIComponent(search)}&limit=8`);
      const data = await res.json();
      const memberIds = new Set(members.map((m) => m.user_id));
      setSearchResults((data.people ?? []).filter((p: SearchUser) => !memberIds.has(p.id)));
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, members]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/rooms/${room.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null, is_private: isPrivate }),
    });
    const data = await res.json();
    if (res.ok) { onUpdated(data.room); onClose(); }
    else setError(data.error ?? "Failed to save changes");
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/rooms/${room.slug}`, { method: "DELETE" });
    if (res.ok) { onClose(); router.push("/community"); router.refresh(); }
    else { const data = await res.json(); setError(data.error ?? "Failed to delete"); setDeleting(false); setConfirmDelete(false); }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    const res = await fetch(`/api/rooms/${room.slug}/members/${userId}`, { method: "DELETE" });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    setRemovingId(null);
  }

  async function handleAdd(user: SearchUser) {
    setAddingId(user.id);
    const res = await fetch(`/api/rooms/${room.slug}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });
    if (res.ok) {
      setMembers((prev) => [...prev, { user_id: user.id, role: "member", profile: user }]);
      setSearchResults((prev) => prev.filter((p) => p.id !== user.id));
    }
    setAddingId(null);
  }

  async function handleCopyLink() {
    if (!inviteToken) return;
    const url = `${window.location.origin}/community/rooms/${room.slug}?invite=${inviteToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const res = await fetch(`/api/rooms/${room.slug}/invite`, { method: "POST" });
    const data = await res.json();
    setInviteToken(data.invite_token ?? null);
    setRegenerating(false);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "settings", label: "Settings" },
    { id: "members", label: "Members" },
    { id: "invite", label: "Invite Link" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-[24px] w-full max-w-[460px] mx-4 shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-[#0a2412]">Manage Room</h2>
            <p className="text-[11px] text-[#8a877b] mt-0.5">r/{room.slug}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f0ede8] text-[#8a877b] hover:text-[#0a2412] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 mt-4 border-b border-[#eceae3] shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-2 px-1 mr-5 text-[13px] font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-[#0a2412] text-[#0a2412]"
                  : "border-transparent text-[#8a877b] hover:text-[#3d3c36]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Settings ── */}
          {tab === "settings" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#5f5d54] uppercase tracking-wider mb-1.5">Room Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  className="w-full border border-[#eceae3] rounded-[10px] px-3 h-[40px] text-[13px] text-[#292929] outline-none focus:border-[#0a2412] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#5f5d54] uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this room about?"
                  rows={3}
                  maxLength={300}
                  className="w-full border border-[#eceae3] rounded-[10px] px-3 py-2.5 text-[13px] text-[#292929] placeholder:text-[#b0ae9f] outline-none resize-none focus:border-[#0a2412] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#5f5d54] uppercase tracking-wider mb-2">Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: false, Icon: Globe, label: "Public", sub: "Anyone can join" },
                    { val: true,  Icon: Lock,  label: "Private", sub: "Invite only" },
                  ].map(({ val, Icon, label, sub }) => (
                    <button
                      key={String(val)}
                      onClick={() => setIsPrivate(val)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border text-left transition-colors ${
                        isPrivate === val ? "border-[#0a2412] bg-[#f0fdf4]" : "border-[#eceae3] hover:border-[#c0bdb4]"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isPrivate === val ? "text-[#0a2412]" : "text-[#8a877b]"}`} />
                      <div>
                        <p className={`text-[12px] font-medium ${isPrivate === val ? "text-[#0a2412]" : "text-[#3d3c36]"}`}>{label}</p>
                        <p className="text-[10px] text-[#8a877b]">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}
            </div>
          )}

          {/* ── Members ── */}
          {tab === "members" && (
            <div className="space-y-4">
              {/* Search to add */}
              <div>
                <label className="block text-[10px] font-semibold text-[#5f5d54] uppercase tracking-wider mb-1.5">Add people</label>
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full border border-[#eceae3] rounded-[10px] px-3 h-[38px] text-[13px] text-[#292929] placeholder:text-[#b0ae9f] outline-none focus:border-[#0a2412] transition-colors"
                  />
                  {searchLoading && <Loader2 className="absolute right-3 top-2.5 w-3.5 h-3.5 animate-spin text-[#8a877b]" />}
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-1 border border-[#eceae3] rounded-[10px] overflow-hidden">
                    {searchResults.map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[#f8fafb] transition-colors">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#0a2412] truncate">{u.full_name ?? "Unknown"}</p>
                          {u.headline && <p className="text-[11px] text-[#8a877b] truncate">{u.headline}</p>}
                        </div>
                        <button
                          onClick={() => handleAdd(u)}
                          disabled={addingId === u.id}
                          className="ml-3 shrink-0 h-[28px] px-3 rounded-[8px] bg-[#0a2412] text-[#dee2df] text-[11px] font-medium hover:bg-[#0a2412]/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                        >
                          {addingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-[#eceae3]" />

              {/* Current members */}
              <div>
                <p className="text-[10px] font-semibold text-[#5f5d54] uppercase tracking-wider mb-2">
                  Current members ({members.length})
                </p>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-[#8a877b]" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-[13px] text-[#8a877b] py-3">No members yet.</p>
                ) : (
                  <div className="space-y-1">
                    {members.map((m) => (
                      <div key={m.user_id} className="flex items-center justify-between py-2 px-1">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#0a2412] truncate">
                            {m.profile?.full_name ?? "Unknown"}
                          </p>
                          <p className="text-[10px] text-[#8a877b] capitalize">{m.role}</p>
                        </div>
                        {m.role !== "admin" && (
                          <button
                            onClick={() => handleRemove(m.user_id)}
                            disabled={removingId === m.user_id}
                            className="ml-3 shrink-0 h-[26px] w-[26px] rounded-[8px] border border-[#eceae3] flex items-center justify-center text-[#b0ae9f] hover:border-red-300 hover:text-red-400 disabled:opacity-50 transition-colors"
                          >
                            {removingId === m.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Invite Link ── */}
          {tab === "invite" && (
            <div className="space-y-4">
              <p className="text-[13px] text-[#5f5d54] leading-[19px]">
                Share this link with people you want to invite to this room. Anyone with the link can join.
              </p>

              {inviteLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-[#8a877b]" />
                </div>
              ) : inviteToken ? (
                <div className="space-y-3">
                  <div className="bg-[#f5f4f0] rounded-[10px] px-3 py-2.5 flex items-center gap-2">
                    <Link className="w-3.5 h-3.5 text-[#8a877b] shrink-0" />
                    <p className="text-[11px] text-[#5f5d54] truncate flex-1 font-mono">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/community/rooms/${room.slug}?invite=${inviteToken}`
                        : `…/community/rooms/${room.slug}?invite=${inviteToken}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 h-[36px] rounded-[10px] bg-[#0a2412] text-[#dee2df] text-[13px] font-medium hover:bg-[#0a2412]/90 flex items-center justify-center gap-2 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy invite link"}
                    </button>
                    <button
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      title="Generate a new link (old link stops working)"
                      className="h-[36px] w-[36px] rounded-[10px] border border-[#eceae3] flex items-center justify-center text-[#8a877b] hover:border-[#c0bdb4] hover:text-[#3d3c36] disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#b0ae9f]">
                    Reset the link to revoke access for anyone who had the old one.
                  </p>
                </div>
              ) : (
                <p className="text-[13px] text-red-500">Could not load invite link.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-[#eceae3] flex items-center justify-between shrink-0">
          {tab === "settings" ? (
            !confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-[12px] text-red-500 hover:text-red-700 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Delete room
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-red-600 font-medium">Are you sure?</span>
                <button onClick={handleDelete} disabled={deleting} className="text-[12px] font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-[6px] flex items-center gap-1 transition-colors">
                  {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-[12px] text-[#5f5d54] hover:text-[#0a2412]">Cancel</button>
              </div>
            )
          ) : <div />}

          <div className="flex gap-2">
            <button onClick={onClose} className="h-[36px] px-4 rounded-[10px] text-[13px] text-[#5f5d54] hover:bg-[#f0ede8] transition-colors">
              {tab === "settings" ? "Cancel" : "Close"}
            </button>
            {tab === "settings" && (
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="h-[36px] px-5 rounded-[10px] text-[13px] font-medium bg-[#0a2412] text-[#dee2df] hover:bg-[#0a2412]/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
