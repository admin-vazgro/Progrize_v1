"use client";

import { useState, useRef } from "react";
import { X, Loader2, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface Props {
  profile: Profile | null;
  userId: string;
  onSave: (updated: Profile) => void;
  onClose: () => void;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function EditProfileModal({ profile, userId, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    headline: profile?.headline ?? "",
    location: profile?.location ?? "",
    portfolio_url: profile?.portfolio_url ?? "",
    summary: profile?.summary ?? "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [coverPreview, setCoverPreview] = useState<string | null>(profile?.cover_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function uploadImage(file: File, path: string): Promise<string | null> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error: uploadErr } = await sb.storage.from("profile-media").upload(path, file, { upsert: true });
    if (uploadErr || !data) return null;
    const { data: urlData } = sb.storage.from("profile-media").getPublicUrl(data.path);
    return urlData?.publicUrl ?? null;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string | null> = {
        full_name: form.full_name,
        headline: form.headline,
        location: form.location,
        portfolio_url: form.portfolio_url,
        summary: form.summary,
      };

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const url = await uploadImage(avatarFile, `${userId}/avatar.${ext}`);
        if (url) body.avatar_url = url;
      }
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const url = await uploadImage(coverFile, `${userId}/cover.${ext}`);
        if (url) body.cover_url = url;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      onSave(data.profile);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: "full_name", label: "Full name", placeholder: "Jane Smith" },
    { key: "headline", label: "Headline", placeholder: "Senior Product Designer at Figma" },
    { key: "location", label: "Location", placeholder: "San Francisco, CA" },
    { key: "portfolio_url", label: "Website / Portfolio", placeholder: "https://yoursite.com" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-[18px] font-bold text-[#0a2412]">Edit profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#e8e8e8] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#292929]" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Cover */}
          <div className="relative">
            <div
              className="h-[112px] rounded-[12px] bg-[#103c1f] overflow-hidden cursor-pointer relative group"
              style={coverPreview ? { backgroundImage: `url(${coverPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
              onClick={() => coverRef.current?.click()}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors rounded-[12px]">
                <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="absolute bottom-2 right-3 text-[11px] text-white/50 select-none">Click to change cover</span>
            </div>
            <div
              className="absolute -bottom-7 left-4 w-[64px] h-[64px] rounded-full bg-[#2d6a4f] border-4 border-white flex items-center justify-center cursor-pointer overflow-hidden group"
              style={avatarPreview ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
              onClick={() => avatarRef.current?.click()}
            >
              {!avatarPreview && (
                <span className="text-white text-base font-bold">{getInitials(form.full_name || null)}</span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors rounded-full">
                <Camera className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          <div className="h-6" />

          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#4b4b4b]">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#4b4b4b]">About / Summary</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Tell people about yourself..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[10px] text-sm text-[#292929] hover:bg-[#e8e8e8] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-[10px] text-sm bg-[#0a2412] text-[#dee2df] font-medium hover:bg-[#0a2412]/90 disabled:opacity-60 flex items-center gap-1.5 transition-colors"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
