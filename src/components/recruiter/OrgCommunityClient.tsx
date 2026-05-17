"use client";

import { useState, useEffect, useRef } from "react";
import {
  Globe,
  Briefcase,
  Heart,
  Bell,
  Loader2,
  X,
  ChevronDown,
  Megaphone,
  Trash2,
  Paperclip,
  ImageIcon,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
} from "lucide-react";
import type { CompanyPost, CompanyRole } from "@/types/recruiter";
import { hasCompanyPermission } from "@/lib/company-permissions";
import FeedTab from "@/components/community/FeedTab";
import { normalizePostContent, richTextToPlainText, sanitizeRichText } from "@/lib/rich-text";

const POST_TYPE_META = {
  update:       { label: "Update",       Icon: Globe,      color: "text-[#0369a1]", bg: "bg-[#e0f2fe]" },
  hiring:       { label: "We're hiring", Icon: Briefcase,  color: "text-[#b45309]", bg: "bg-[#fef3c7]" },
  culture:      { label: "Culture",      Icon: Heart,      color: "text-[#be185d]", bg: "bg-[#fce7f3]" },
  announcement: { label: "Announcement", Icon: Bell,       color: "text-[#7c3aed]", bg: "bg-[#f3ecff]" },
};

type PostType = keyof typeof POST_TYPE_META;
type FilterTab = "all" | PostType;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",          label: "All" },
  { id: "update",       label: "Updates" },
  { id: "hiring",       label: "Hiring" },
  { id: "culture",      label: "Culture" },
  { id: "announcement", label: "Announcements" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  companyName: string;
  companyInitial: string;
  myRole: CompanyRole;
  myPermissions: string[];
  currentUserId: string;
}

export default function OrgCommunityClient({ companyName, companyInitial, myRole, myPermissions, currentUserId }: Props) {
  const [posts, setPosts] = useState<CompanyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showCompose, setShowCompose] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [postType, setPostType] = useState<PostType>("update");
  const [typeOpen, setTypeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const canManagePosts = hasCompanyPermission(myRole, myPermissions, "company.manage_posts");
  const canWrite = hasCompanyPermission(myRole, myPermissions, "company.create_posts");

  useEffect(() => {
    const idx = FILTER_TABS.findIndex((t) => t.id === filterTab);
    const el = tabRefs.current[idx];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [filterTab]);

  async function load() {
    const res = await fetch("/api/recruiter/posts");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function resetCompose() {
    setTitle("");
    setContent("");
    setTagInput("");
    setTags([]);
    images.forEach((image) => URL.revokeObjectURL(image.preview));
    setImages([]);
    setPostType("update");
    setComposeError(null);
    if (contentRef.current) contentRef.current.innerHTML = "";
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

  function addTag(raw: string) {
    const clean = raw.replace(/[,#\s]/g, "").trim();
    if (clean && !tags.includes(clean) && tags.length < 8) {
      setTags((current) => [...current, clean]);
    }
    setTagInput("");
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((current) => current.slice(0, -1));
    }
  }

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - images.length);
    const next = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((current) => [...current, ...next].slice(0, 4));
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanContent = sanitizeRichText(content);
    const plainContent = richTextToPlainText(cleanContent);
    if (!plainContent && !title.trim()) return;
    setSubmitting(true);
    setComposeError(null);

    const parts: string[] = [];
    if (title.trim()) parts.push(`<h3>${title.trim()}</h3>`);
    if (plainContent) parts.push(cleanContent);
    if (tags.length) parts.push(`<p>${tags.map((tag) => `#${tag}`).join(" ")}</p>`);

    let imageUrls: string[] | undefined;
    if (images.length > 0) {
      const formData = new FormData();
      images.forEach((image) => formData.append("files", image.file));
      const uploadRes = await fetch("/api/posts/media", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setComposeError(uploadData.error ?? "Image upload failed");
        setSubmitting(false);
        return;
      }
      imageUrls = uploadData.urls as string[];
    }

    const res = await fetch("/api/recruiter/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: null,
        content: sanitizeRichText(parts.join("")),
        post_type: postType,
        is_published: true,
        image_urls: imageUrls,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setComposeError(data.error ?? "Failed to post"); setSubmitting(false); return; }
    await load();
    setFeedRefreshKey((key) => key + 1);
    resetCompose();
    setShowCompose(false);
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    setDeleting(id);
    await fetch(`/api/recruiter/posts/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
  }

  const filteredPosts = filterTab === "all" ? posts : posts.filter((p) => p.post_type === filterTab);
  const selectedTypeMeta = POST_TYPE_META[postType];
  const canPost = !submitting && (richTextToPlainText(content).length > 0 || title.trim().length > 0);

  const typeCounts = (Object.keys(POST_TYPE_META) as PostType[]).reduce((acc, type) => {
    acc[type] = posts.filter((p) => p.post_type === type).length;
    return acc;
  }, {} as Record<PostType, number>);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fafaf8]">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="px-8 pt-8 pb-12">

          {/* Page heading */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">Community</h1>
              <p className="text-[15px] text-[#5f5d54] mt-1">
                {!loading && (posts.length > 0 ? (
                  <><span className="font-bold">{posts.length}</span> post{posts.length !== 1 ? "s" : ""} from {companyName}</>
                ) : (
                  "Share company updates with your community"
                ))}
              </p>
            </div>
            {canWrite && (
              <button
                onClick={() => setShowCompose(true)}
                className="h-[34px] px-[14px] bg-white border border-[#dddbd2] rounded-[10px] text-[13px] font-medium text-[#0a2412] hover:bg-[#f5f4f0] transition-colors"
              >
                + new post
              </button>
            )}
          </div>

          {/* Two-column layout */}
          <div className="flex gap-6 items-start">

            {/* Left: compose + tabs + feed */}
            <div className="flex-1 min-w-0 flex flex-col gap-8">

              {/* Compose card */}
              {canWrite && (
                <div className="bg-white rounded-[20px] p-6">
                  <div className="mb-6">
                    <h2 className="text-[32px] font-normal tracking-[-0.03em] text-[#0a2412] leading-none">
                      Share with your community
                    </h2>
                    <p className="mt-3 max-w-[520px] text-[16px] font-normal leading-[1.45] text-[#4b4b4b]">
                      Post updates, culture highlights, and hiring announcements.
                    </p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="w-9 h-9 rounded-full bg-[#0a2412] flex items-center justify-center text-[#f7fcca] text-[14px] font-medium shrink-0 select-none">
                      {companyInitial}
                    </div>
                    <div
                      onClick={() => setShowCompose(true)}
                      className="flex-1 bg-[#fafafa] rounded-tr-[20px] rounded-tl-[20px] rounded-br-[20px] h-[56px] flex items-center px-4 cursor-pointer hover:bg-[#f5f4f0] transition-colors"
                    >
                      <span className="text-[14px] text-[#4b4b4b]">What&apos;s happening at {companyName}?</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="relative flex gap-[45px] items-center border-b border-[#eceae3]">
                {FILTER_TABS.map((tab, i) => (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[i] = el; }}
                    onClick={() => setFilterTab(tab.id)}
                    className={`text-[13px] leading-[1.35] whitespace-nowrap pb-2.5 transition-colors ${
                      filterTab === tab.id ? "font-bold text-[#0a2412]" : "font-medium text-[#5f5d54] hover:text-[#3d3c36]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                <div
                  className="absolute bottom-[-1px] h-[2px] bg-[#0a2412] transition-all duration-300"
                  style={{ left: indicator.left, width: indicator.width }}
                />
              </div>

              {/* Shared feed */}
              {filterTab === "all" ? (
                <FeedTab
                  userId={currentUserId}
                  userName={companyName}
                  hideCompose
                  refreshKey={feedRefreshKey}
                  sortBy="latest"
                />
              ) : loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-[20px] p-5 animate-pulse">
                      <div className="flex gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-[#e8e8e8]" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 bg-[#e8e8e8] rounded w-32" />
                          <div className="h-2.5 bg-[#e8e8e8] rounded w-24" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-[#e8e8e8] rounded w-full" />
                        <div className="h-3 bg-[#e8e8e8] rounded w-4/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white rounded-[20px] p-12 text-center">
                  <Megaphone className="w-8 h-8 text-[#c8c5bc] mx-auto mb-3" />
                  <p className="text-[14px] font-medium text-[#5f5d54] mb-1">No posts yet</p>
                  <p className="text-[13px] text-[#8a877b]">
                    {canWrite ? "Share company updates, culture highlights, and hiring announcements." : "No posts published yet."}
                  </p>
                  {canWrite && (
                    <button onClick={() => setShowCompose(true)} className="mt-4 text-[13px] font-semibold text-[#0a2412] hover:underline">
                      Create first post
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map((post) => {
                    const typeMeta = POST_TYPE_META[post.post_type as PostType] ?? POST_TYPE_META.update;
                    const { Icon, color, bg } = typeMeta;
                const canDelete = canManagePosts || post.author_id === currentUserId;

                    return (
                      <div key={post.id} className="bg-white rounded-[20px] p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[11px] font-bold shrink-0">
                              {companyInitial}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-[#0a2412]">{companyName}</p>
                              <p className="text-[11px] text-[#8a877b]">{formatDate(post.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${bg} ${color}`}>
                              <Icon className="w-3 h-3" />
                              {typeMeta.label}
                            </span>
                            {!post.is_published && (
                              <span className="text-[10px] px-2 py-0.5 bg-[#f5f3ed] text-[#8a877b] rounded-full">Draft</span>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(post.id)}
                                disabled={deleting === post.id}
                                className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#c8c5bc] hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                {deleting === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                        <div
                          className="text-[13px] text-[#3d3c36] leading-[1.7] [&_a]:text-[#0a7854] [&_a]:underline [&_h3]:mb-3 [&_h3]:text-[18px] [&_h3]:font-semibold [&_h3]:text-[#0a2412] [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc"
                          dangerouslySetInnerHTML={{ __html: normalizePostContent(post.content) }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="w-[277px] shrink-0 hidden lg:flex flex-col gap-6">
              <div className="bg-white rounded-[20px] p-6">
                <h3 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none pb-4">
                  Post types
                </h3>
                {posts.length === 0 ? (
                  <p className="text-[13px] text-[#8a877b]">No posts yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {(Object.entries(POST_TYPE_META) as [PostType, typeof POST_TYPE_META[PostType]][]).map(([type, meta], i, arr) => (
                      <button
                        key={type}
                        onClick={() => setFilterTab(filterTab === type ? "all" : type)}
                        className={`flex items-center gap-2 hover:opacity-70 transition-opacity text-left ${
                          i < arr.length - 1 ? "pb-4 border-b border-[#ebebeb]" : ""
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-[6px] ${meta.bg} flex items-center justify-center shrink-0`}>
                          <meta.Icon className={`w-3 h-3 ${meta.color}`} />
                        </span>
                        <span className="flex-1 text-[14px] font-normal text-[#292929]">{meta.label}</span>
                        <div className={`h-[27px] px-3 rounded-[10px] flex items-center justify-center shrink-0 ${filterTab === type ? "bg-[#e8f2eb]" : "bg-[#f5f3ed]"}`}>
                          <span className="text-[12px] font-medium text-[#0a2412]">{typeCounts[type]}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCompose(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative bg-white rounded-[24px] w-full max-w-[560px] shadow-2xl p-7" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowCompose(false); resetCompose(); }}
              className="absolute top-5 right-5 w-8 h-8 rounded-[8px] bg-[#f5f3ed] flex items-center justify-center hover:bg-[#eceae3] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#5f5d54]" />
            </button>

            <h2 className="text-[20px] font-semibold text-[#0a2412] tracking-[-0.4px] mb-5">New company post</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#26251f]">Post type</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTypeOpen(!typeOpen)}
                    className="w-full h-[44px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[13px] text-[#26251f] border border-[#eceae3] flex items-center justify-between"
                  >
                    <span className={`flex items-center gap-2 ${selectedTypeMeta.color}`}>
                      <selectedTypeMeta.Icon className="w-4 h-4" />
                      {selectedTypeMeta.label}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#8a877b]" />
                  </button>
                  {typeOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[10px] border border-[#eceae3] shadow-lg z-10 py-1">
                      {(Object.entries(POST_TYPE_META) as [PostType, typeof POST_TYPE_META[PostType]][]).map(([t, meta]) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setPostType(t); setTypeOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafaf8] transition-colors ${postType === t ? "font-semibold" : ""}`}
                        >
                          <span className={`w-7 h-7 rounded-[6px] ${meta.bg} flex items-center justify-center shrink-0`}>
                            <meta.Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                          </span>
                          <span className="text-[13px] text-[#26251f]">{meta.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#26251f]">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title"
                  className="w-full h-[44px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#26251f]">
                  Content
                </label>
                <div className="overflow-hidden rounded-[8px] border border-[#eceae3] bg-[#fafaf8] focus-within:border-[#0a2412] transition-colors">
                  <div className="flex flex-wrap items-center gap-1 border-b border-[#eceae3] px-2 py-2">
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
                  <div className="relative bg-white">
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
                      className="min-h-[150px] px-[12px] py-[10px] text-[13px] leading-relaxed text-[#26251f] outline-none [&_a]:text-[#0a7854] [&_a]:underline [&_h3]:mb-2 [&_h3]:text-[15px] [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#26251f]">Tags</label>
                <div
                  className="min-h-[44px] px-[10px] py-[8px] border border-[#eceae3] rounded-[8px] bg-[#fafaf8] flex flex-wrap gap-[6px] items-center cursor-text focus-within:border-[#0a2412] transition-colors"
                  onClick={() => document.getElementById("company-tag-input")?.focus()}
                >
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-[4px] px-[8px] py-[2px] rounded-full bg-[#f0fad8] text-[#3a6b10] text-[11px] font-medium"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTags(tags.filter((t) => t !== tag)); }}
                        className="text-[#3a6b10] hover:text-[#0a2412] leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    id="company-tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={onTagKeyDown}
                    onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                    placeholder={tags.length === 0 ? "Add tags — press Enter or comma to add" : ""}
                    className="flex-1 min-w-[140px] text-[12px] text-[#26251f] placeholder:text-[#8a877b] outline-none bg-transparent"
                  />
                </div>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-[8px]">
                  {images.map((image, i) => (
                    <div key={i} className="relative aspect-square rounded-[8px] overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-[4px] right-[4px] w-[20px] h-[20px] rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-[10px] h-[10px]" />
                      </button>
                    </div>
                  ))}
                  {images.length < 4 && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="aspect-square rounded-[8px] border-2 border-dashed border-[#eceae3] flex flex-col items-center justify-center gap-[4px] text-[#b0ae9f] hover:border-[#c0bdb4] hover:text-[#8a877b] transition-colors"
                    >
                      <ImageIcon className="w-[16px] h-[16px]" />
                      <span className="text-[9px]">Add more</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-[16px]">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-[8px] h-[44px] px-[12px] border border-[#eceae3] rounded-[8px] text-[12px] text-[#8a877b] hover:border-[#c0bdb4] hover:text-[#5f5d54] transition-colors"
                >
                  <Paperclip className="w-[14px] h-[14px]" />
                  Add Attachments
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

              {composeError && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{composeError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCompose(false); resetCompose(); }}
                  className="h-[44px] px-4 text-[13px] text-[#5f5d54] hover:text-[#26251f] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canPost}
                  className="flex-1 h-[44px] bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Publishing…" : "Publish post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
