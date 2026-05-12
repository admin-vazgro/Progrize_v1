"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Paperclip, Loader2, ImageIcon, Bold, Italic, Underline, List, ListOrdered, Link2 } from "lucide-react";
import { richTextToPlainText, sanitizeRichText } from "@/lib/rich-text";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userHeadline: string;
  onPosted: () => void;
}

type Visibility = "Public" | "Network" | "Private";
const VISIBILITY_OPTIONS: Visibility[] = ["Public", "Network", "Private"];

export default function ComposeModal({ isOpen, onClose, userName, userHeadline, onPosted }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("Public");
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const visRef = useRef<HTMLDivElement>(null);

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Close visibility dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (visRef.current && !visRef.current.contains(e.target as Node)) {
        setVisibilityOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function addTag(raw: string) {
    const clean = raw.replace(/[,#\s]/g, "").trim();
    if (clean && !tags.includes(clean) && tags.length < 8) {
      setTags((t) => [...t, clean]);
    }
    setTagInput("");
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((t) => t.slice(0, -1));
    }
  }

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - images.length);
    const next = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...next].slice(0, 4));
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function syncEditorContent() {
    setContent(sanitizeRichText(contentRef.current?.innerHTML ?? ""));
  }

  function runFormat(command: string, value?: string) {
    contentRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  }

  function addLink() {
    const url = window.prompt("Paste a URL");
    if (!url?.trim()) return;
    const normalized = /^https?:\/\//i.test(url) || /^mailto:/i.test(url) ? url.trim() : `https://${url.trim()}`;
    runFormat("createLink", normalized);
  }

  async function handlePost() {
    const cleanContent = sanitizeRichText(content);
    const plainContent = richTextToPlainText(cleanContent);
    if (!plainContent && !title.trim()) return;
    setPosting(true);
    setError(null);

    const parts: string[] = [];
    if (title.trim()) parts.push(`<h3>${title.trim()}</h3>`);
    if (plainContent) parts.push(cleanContent);
    if (tags.length) parts.push(`<p>${tags.map((t) => `#${t}`).join(" ")}</p>`);

    try {
      let media_urls: string[] | undefined;
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((img) => formData.append("files", img.file));
        const uploadRes = await fetch("/api/posts/media", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error ?? "Image upload failed");
        media_urls = uploadData.urls as string[];
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: sanitizeRichText(parts.join("")), media_urls, visibility: visibility.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post");
      // reset
      setTitle(""); setContent(""); setTags([]); setTagInput("");
      if (contentRef.current) contentRef.current.innerHTML = "";
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
      onPosted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  if (!isOpen) return null;

  const canPost = !posting && (richTextToPlainText(content).length > 0 || title.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-[20px] w-full max-w-[710px] shadow-2xl animate-scale-in overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-[30px] pt-[28px] pb-[20px]">
          {/* User info */}
          <div className="flex items-center gap-[20px]">
            <div className="w-[55px] h-[55px] rounded-full bg-[#0a2412] text-[#c6f46b] flex items-center justify-center text-[16px] font-bold shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-[16px] font-normal text-[#292929] tracking-[0.5px] leading-none mb-[4px]">
                {userName}
              </p>
              <p className="text-[11px] font-light text-[#4b4b4b]">{userHeadline}</p>
            </div>
          </div>

          {/* Visibility + Close */}
          <div className="flex items-center gap-[12px]">
            {/* Visibility dropdown */}
            <div ref={visRef} className="relative">
              <button
                onClick={() => setVisibilityOpen((o) => !o)}
                className="flex items-center gap-[8px] h-[36px] px-[16px] bg-[#e8e8e8] rounded-[8px] text-[14px] text-[#0a2412] hover:bg-[#dddbd2] transition-colors"
              >
                {visibility}
                <ChevronDown className="w-[14px] h-[14px] opacity-50" />
              </button>
              {visibilityOpen && (
                <div className="absolute top-[40px] right-0 bg-white border border-[#eceae3] rounded-[12px] shadow-xl overflow-hidden z-10 w-[140px]">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setVisibility(opt); setVisibilityOpen(false); }}
                      className={`w-full text-left px-[14px] py-[10px] text-[13px] transition-colors ${
                        visibility === opt
                          ? "bg-[#e8f2eb] text-[#0a2412] font-medium"
                          : "text-[#3d3c36] hover:bg-[#f5f4f0]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-[44px] h-[44px] rounded-[12px] bg-[#e8e8e8] flex items-center justify-center hover:bg-[#dddbd2] transition-colors"
            >
              <X className="w-[18px] h-[18px] text-[#0a2412]" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#eceae3] mx-[30px]" />

        {/* Form */}
        <div className="px-[30px] pt-[28px] pb-[24px] flex flex-col gap-[24px]">

          {/* Title */}
          <div className="flex flex-col gap-[10px]">
            <label className="text-[14px] text-black font-normal">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              className="h-[44px] px-[12px] border border-[#dadada] rounded-[8px] text-[12px] text-[#292929] placeholder:text-[#8a877b] outline-none focus:border-[#0a2412] transition-colors"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-[10px]">
            <label className="text-[14px] text-black font-normal">Content</label>
            <div className="overflow-hidden rounded-[8px] border border-[#dadada] focus-within:border-[#0a2412] transition-colors">
              <div className="flex flex-wrap items-center gap-1 border-b border-[#eceae3] bg-[#fafaf8] px-2 py-2">
                {[
                  { label: "Bold", Icon: Bold, action: () => runFormat("bold") },
                  { label: "Italic", Icon: Italic, action: () => runFormat("italic") },
                  { label: "Underline", Icon: Underline, action: () => runFormat("underline") },
                  { label: "Bulleted list", Icon: List, action: () => runFormat("insertUnorderedList") },
                  { label: "Numbered list", Icon: ListOrdered, action: () => runFormat("insertOrderedList") },
                  { label: "Link", Icon: Link2, action: addLink },
                ].map(({ label, Icon, action }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    title={label}
                    onClick={action}
                    className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#5f5d54] transition-colors hover:bg-[#eceae3] hover:text-[#0a2412]"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <div className="relative">
                {!richTextToPlainText(content) && (
                  <p className="pointer-events-none absolute left-[12px] top-[10px] text-[12px] text-[#8a877b]">
                    Your thoughts
                  </p>
                )}
                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  autoFocus
                  onInput={syncEditorContent}
                  onBlur={syncEditorContent}
                  className="min-h-[160px] px-[12px] py-[10px] text-[12px] leading-relaxed text-[#292929] outline-none [&_a]:text-[#0a7854] [&_a]:underline [&_h3]:mb-2 [&_h3]:text-[15px] [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-[10px]">
            <label className="text-[14px] text-black font-normal">Tags</label>
            <div
              className="min-h-[44px] px-[10px] py-[8px] border border-[#dadada] rounded-[8px] flex flex-wrap gap-[6px] items-center cursor-text focus-within:border-[#0a2412] transition-colors"
              onClick={() => document.getElementById("tag-input")?.focus()}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-[4px] px-[8px] py-[2px] rounded-full bg-[#f0fad8] text-[#3a6b10] text-[11px] font-medium"
                >
                  #{tag}
                  <button
                    onClick={(e) => { e.stopPropagation(); setTags(tags.filter((t) => t !== tag)); }}
                    className="text-[#3a6b10] hover:text-[#0a2412] leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                placeholder={tags.length === 0 ? "Add tags — press Enter or comma to add" : ""}
                className="flex-1 min-w-[140px] text-[12px] text-[#292929] placeholder:text-[#8a877b] outline-none bg-transparent"
              />
            </div>
            {tags.length > 0 && (
              <p className="text-[10px] text-[#8a877b]">{8 - tags.length} tags remaining</p>
            )}
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-[8px]">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-[8px] overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-[4px] right-[4px] w-[20px] h-[20px] rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-[10px] h-[10px]" />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-[8px] border-2 border-dashed border-[#eceae3] flex flex-col items-center justify-center gap-[4px] text-[#b0ae9f] hover:border-[#c0bdb4] hover:text-[#8a877b] transition-colors"
                >
                  <ImageIcon className="w-[16px] h-[16px]" />
                  <span className="text-[9px]">Add more</span>
                </button>
              )}
            </div>
          )}

          {/* Add Attachments */}
          <div className="flex items-center gap-[16px]">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-[8px] h-[44px] px-[12px] border border-[#dadada] rounded-[8px] text-[12px] text-[#8a877b] hover:border-[#c0bdb4] hover:text-[#5f5d54] transition-colors"
            >
              <Paperclip className="w-[14px] h-[14px]" />
              Add Attachements
            </button>
            <p className="text-[10px] text-[#b0ae9f]">Images only · max 4</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFilesChange}
          />

          {error && (
            <p className="text-[12px] text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-[24px] pt-[4px]">
            <button
              onClick={handlePost}
              disabled={!canPost}
              className="h-[42px] px-[28px] bg-[#0a2412] text-[#fafaf8] text-[14px] font-medium rounded-[12px] disabled:opacity-40 flex items-center gap-[8px] hover:bg-[#0a2412]/90 transition-colors"
            >
              {posting && <Loader2 className="w-[13px] h-[13px] animate-spin" />}
              Post
            </button>
            <button
              onClick={onClose}
              className="text-[16px] text-black font-normal tracking-[0.5px] hover:text-[#5f5d54] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
