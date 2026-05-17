"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Megaphone, Briefcase, Heart, Bell, Globe, X, ChevronDown } from "lucide-react";
import type { CompanyPost, CompanyRole } from "@/types/recruiter";
import { hasCompanyPermission } from "@/lib/company-permissions";

const POST_TYPE_META = {
  update:       { label: "Update",       Icon: Globe,      color: "text-[#0369a1]", bg: "bg-[#e0f2fe]" },
  hiring:       { label: "We're hiring", Icon: Briefcase,  color: "text-[#b45309]", bg: "bg-[#fef3c7]" },
  culture:      { label: "Culture",      Icon: Heart,      color: "text-[#be185d]", bg: "bg-[#fce7f3]" },
  announcement: { label: "Announcement", Icon: Bell,       color: "text-[#7c3aed]", bg: "bg-[#f3ecff]" },
};

type PostType = keyof typeof POST_TYPE_META;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  companyName: string;
  myRole: CompanyRole;
  myPermissions: string[];
  currentUserId: string;
}

export default function CompanyPostsClient({ companyName, myRole, myPermissions, currentUserId }: Props) {
  const [posts, setPosts] = useState<CompanyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  // compose state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("update");
  const [isPublished, setIsPublished] = useState(true);
  const [typeOpen, setTypeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<string | null>(null);
  const canManagePosts = hasCompanyPermission(myRole, myPermissions, "company.manage_posts");
  const canWrite = hasCompanyPermission(myRole, myPermissions, "company.create_posts");

  async function load() {
    const res = await fetch("/api/recruiter/posts");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function resetCompose() {
    setTitle(""); setContent(""); setPostType("update"); setIsPublished(true); setComposeError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setComposeError(null);
    const res = await fetch("/api/recruiter/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || null, content: content.trim(), post_type: postType, is_published: isPublished }),
    });
    const data = await res.json();
    if (!res.ok) { setComposeError(data.error ?? "Failed to post"); setSubmitting(false); return; }
    await load();
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

  const selectedTypeMeta = POST_TYPE_META[postType];

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[820px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">{companyName}</p>
            <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">Company Posts</h1>
            <p className="text-[13px] text-[#8a877b] mt-1">Updates, culture, and announcements visible to job seekers.</p>
          </div>
          {canWrite && (
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 h-[40px] px-5 bg-[#0a2412] text-[#dee2df] text-[13px] font-medium rounded-[10px] hover:bg-[#142e1c] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New post
            </button>
          )}
        </div>

        {/* Posts list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-dashed border-[#d4d0c8] p-12 text-center">
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
          <div className="flex flex-col gap-4">
            {posts.map((post) => {
              const typeMeta = POST_TYPE_META[post.post_type] ?? POST_TYPE_META.update;
              const { Icon, color, bg } = typeMeta;
              const canDelete = canManagePosts || post.author_id === currentUserId;

              return (
                <div key={post.id} className="bg-white rounded-[20px] p-6">
                  {/* Post header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      {post.author?.avatar_url ? (
                        <img src={post.author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[11px] font-bold shrink-0">
                          {(post.author?.full_name ?? companyName).split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] font-semibold text-[#0a2412]">{post.author?.full_name ?? companyName}</p>
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

                  {post.title && (
                    <h3 className="text-[16px] font-semibold text-[#0a2412] tracking-[-0.3px] mb-2">{post.title}</h3>
                  )}
                  <p className="text-[13px] text-[#3d3c36] leading-[1.7] whitespace-pre-wrap">{post.content}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Compose modal */}
        {showCompose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCompose(false)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[560px] shadow-2xl p-7" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setShowCompose(false); resetCompose(); }} className="absolute top-5 right-5 w-8 h-8 rounded-[8px] bg-[#f5f3ed] flex items-center justify-center hover:bg-[#eceae3] transition-colors">
                <X className="w-3.5 h-3.5 text-[#5f5d54]" />
              </button>

              <h2 className="text-[20px] font-semibold text-[#0a2412] tracking-[-0.4px] mb-5">New company post</h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Post type picker */}
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

                {/* Title */}
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-[#26251f]">Title <span className="text-[#8a877b] font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. We're expanding to London!"
                    className="w-full h-[44px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-medium text-[#26251f]">Content <span className="text-red-500">*</span></label>
                  <textarea
                    autoFocus
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    placeholder="Share what's happening at your company…"
                    className="w-full bg-[#fafaf8] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 border border-[#eceae3] focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Publish toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setIsPublished(!isPublished)}
                    className={`w-10 h-5 rounded-full transition-colors ${isPublished ? "bg-[#0a2412]" : "bg-[#d4d0c8]"} relative`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${isPublished ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-[13px] text-[#26251f]">{isPublished ? "Publish immediately" : "Save as draft"}</span>
                </label>

                {composeError && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{composeError}</p>}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setShowCompose(false); resetCompose(); }} className="h-[44px] px-4 text-[13px] text-[#5f5d54] hover:text-[#26251f] transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !content.trim()}
                    className="flex-1 h-[44px] bg-[#0a2412] text-[#dee2df] text-[13px] font-semibold rounded-[10px] hover:bg-[#142e1c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? "Publishing…" : isPublished ? "Publish post" : "Save draft"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
