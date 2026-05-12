"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface Props {
  profile: Profile | null;
  onSave: (updated: Profile) => void;
  onClose: () => void;
}

export default function NetworkingModal({ profile, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    linkedin_url: profile?.linkedin_url ?? "",
    portfolio_url: profile?.portfolio_url ?? "",
    phone: profile?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    onSave(data.profile);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-[18px] font-bold text-[#0a2412]">Networking links</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#e8e8e8] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#292929]" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {[
            { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourhandle" },
            { key: "portfolio_url", label: "Website / Portfolio", placeholder: "https://yoursite.com" },
            { key: "phone", label: "Phone / WhatsApp", placeholder: "+1 555 000 0000" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#4b4b4b]">{label}</label>
              <input
                type="text"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none"
              />
            </div>
          ))}

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
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
