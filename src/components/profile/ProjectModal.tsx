"use client";

import { useRef, useState } from "react";
import { X, Loader2, Trash2, ImagePlus } from "lucide-react";
import type { Database } from "@/types/database";

type ProjectItem = Database["public"]["Tables"]["profile_projects"]["Row"];

interface Props {
  item?: ProjectItem | null;
  onSave: (item: ProjectItem) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function ProjectModal({ item, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState({
    title: item?.title ?? "",
    description: item?.description ?? "",
    project_url: item?.project_url ?? "",
  });
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(item?.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  async function uploadImage() {
    if (!imageFile) return imageUrl;
    const formData = new FormData();
    formData.append("file", imageFile);
    const res = await fetch("/api/projects/image", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Image upload failed");
    return data.url as string;
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Project title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const uploadedUrl = await uploadImage();
      const url = item ? `/api/projects/${item.id}` : "/api/projects";
      const method = item ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image_url: uploadedUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      onSave(data.project);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item || !onDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${item.id}`, { method: "DELETE" });
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
            {item ? "Edit project" : "Add project"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#e8e8e8] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#292929]" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#4b4b4b]">Project title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Portfolio website, AI job tracker, case study..."
              className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[#4b4b4b]">Project image</label>
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-[12px] bg-[#f8fafb]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="" className="h-[180px] w-full object-cover" />
                <div className="absolute right-3 top-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-[8px] bg-white/90 px-3 py-1.5 text-xs font-medium text-[#292929] shadow-sm transition-colors hover:bg-white"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(""); setImageUrl(""); }}
                    className="rounded-[8px] bg-white/90 px-3 py-1.5 text-xs font-medium text-red-500 shadow-sm transition-colors hover:bg-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-[132px] w-full flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#cfcfc8] bg-[#f8fafb] text-[#4b4b4b] transition-colors hover:border-[#c1cc5a] hover:text-[#0a2412]"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-sm font-medium">Upload project image</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#4b4b4b]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What you built, the problem solved, your role, and impact..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#4b4b4b]">Project or blog link</label>
            <input
              type="url"
              value={form.project_url}
              onChange={(e) => set("project_url", e.target.value)}
              placeholder="https://example.com/project"
              className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none"
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
              <button onClick={onClose} className="px-4 py-2 rounded-[10px] text-sm text-[#292929] hover:bg-[#e8e8e8] transition-colors">
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
