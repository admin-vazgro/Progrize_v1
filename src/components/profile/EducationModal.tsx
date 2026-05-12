"use client";

import { useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import type { Database } from "@/types/database";

type EducationItem = Database["public"]["Tables"]["education_items"]["Row"];

interface Props {
  item?: EducationItem | null;
  onSave: (item: EducationItem) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function EducationModal({ item, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState({
    institution: item?.institution ?? "",
    degree: item?.degree ?? "",
    field_of_study: item?.field_of_study ?? "",
    start_date: item?.start_date?.slice(0, 7) ?? "",
    end_date: item?.end_date?.slice(0, 7) ?? "",
    description: item?.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  async function handleSave() {
    if (!form.institution.trim()) {
      setError("Institution is required");
      return;
    }
    setSaving(true);
    setError(null);
    const url = item ? `/api/education/${item.id}` : "/api/education";
    const method = item ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    onSave(data.education);
    onClose();
  }

  async function handleDelete() {
    if (!item || !onDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/education/${item.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) { onDelete(item.id); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-[18px] font-bold text-[#0a2412]">
            {item ? "Edit education" : "Add education"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#e8e8e8] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#292929]" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {[
            { key: "institution", label: "Institution *", placeholder: "MIT, Stanford, etc." },
            { key: "degree", label: "Degree", placeholder: "Bachelor of Science" },
            { key: "field_of_study", label: "Field of study", placeholder: "Computer Science" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#4b4b4b]">{label}</label>
              <input
                type="text"
                value={form[key as keyof typeof form]}
                onChange={(e) => set(key as keyof typeof form, e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#4b4b4b]">Start date</label>
              <input
                type="month"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#4b4b4b]">End date</label>
              <input
                type="month"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#4b4b4b]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Activities, thesis, notable achievements..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            {item ? (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
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
    </div>
  );
}
