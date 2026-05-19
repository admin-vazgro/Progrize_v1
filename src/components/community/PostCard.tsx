"use client";

import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Repeat2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Send, MoreHorizontal, Pencil, Trash2, Loader2, X, ImagePlus, ArrowUp, ArrowDown, LayoutList, UserPlus, UserCheck } from "lucide-react";
import Link from "next/link";
import type { Post } from "./FeedTab";
import { formatDistanceToNow } from "@/lib/utils";
import { normalizePostContent, richTextToPlainText } from "@/lib/rich-text";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string | null } | null;
}

interface Props {
  post: Post;
  currentUserId: string;
  onLikeToggle: (postId: string, liked: boolean, newCount: number) => void;
  onCommentAdded: (postId: string) => void;
  onDelete: (postId: string) => void;
  onEdit: (postId: string, newContent: string, newMediaUrls: string[]) => void;
  onVote: (postId: string, myVote: 1 | -1 | 0, upvoteCount: number, downvoteCount: number) => void;
}

function Avatar({ name, url, size = "post" }: { name: string | null; url?: string | null; size?: "post" | "sm" }) {
  const initials = (name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const sizeClass = size === "sm" ? "h-9 w-9" : "h-[45px] w-[45px]";
  if (url) return <img src={url} alt={name ?? ""} className={`${sizeClass} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${sizeClass} rounded-full bg-[#0a2412] text-[#c6f46b] flex items-center justify-center text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function ImageGrid({ urls, onOpen }: { urls: string[]; onOpen: (index: number) => void }) {
  if (!urls.length) return null;

  if (urls.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="mt-8 aspect-[600/510] w-full overflow-hidden rounded-[14px] bg-[#f5f4f0] text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.015]" />
      </button>
    );
  }

  if (urls.length === 2) {
    return (
      <div className="mt-8 grid aspect-[600/360] w-full grid-cols-2 gap-[7px] overflow-hidden rounded-[14px] bg-[#eceae3]">
        {urls.map((u, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(i)}
            className="overflow-hidden bg-[#f5f4f0]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.015]" />
          </button>
        ))}
      </div>
    );
  }

  if (urls.length === 3) {
    return (
      <div className="mt-8 grid aspect-[600/420] w-full grid-cols-[minmax(0,1.55fr)_minmax(105px,1fr)] gap-[7px] overflow-hidden rounded-[14px] bg-[#eceae3]">
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="row-span-2 overflow-hidden bg-[#f5f4f0]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[0]} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.015]" />
        </button>
        {urls.slice(1, 3).map((u, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(i + 1)}
            className="overflow-hidden bg-[#f5f4f0]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.015]" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8 grid aspect-[600/510] w-full grid-cols-[minmax(0,362fr)_minmax(105px,231fr)] gap-[7px] overflow-hidden rounded-[14px] bg-[#eceae3]">
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="row-span-3 overflow-hidden bg-[#f5f4f0]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.015]" />
      </button>
      {urls.slice(1, 4).map((u, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpen(i + 1)}
          className="relative overflow-hidden bg-[#f5f4f0]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.015]" />
          {i === 2 && urls.length > 4 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-[24px] font-semibold text-white">
              +{urls.length - 4}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function ImageViewer({
  urls,
  index,
  onClose,
  onChange,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const hasMultiple = urls.length > 1;
  const src = urls[index];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasMultiple) onChange((index - 1 + urls.length) % urls.length);
      if (e.key === "ArrowRight" && hasMultiple) onChange((index + 1) % urls.length);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasMultiple, index, onChange, onClose, urls.length]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/88 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image viewer"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {hasMultiple && (
        <button
          type="button"
          onClick={() => onChange((index - 1 + urls.length) % urls.length)}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/20 sm:flex"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-[88vh] w-auto max-w-[98vw] rounded-[14px] object-contain shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
      />

      {hasMultiple && (
        <button
          type="button"
          onClick={() => onChange((index + 1) % urls.length)}
          aria-label="Next image"
          className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/20 sm:flex"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {hasMultiple && (
        <div className="absolute bottom-4 rounded-full bg-black/45 px-3 py-1 text-xs text-white">
          {index + 1} / {urls.length}
        </div>
      )}
    </div>
  );
}

function FollowButton({ userId, initialFollowing }: { userId: string; initialFollowing?: boolean }) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFollowing(!!initialFollowing);
  }, [initialFollowing, userId]);

  async function toggleFollow() {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok && data) setFollowing(data.following);
    setLoading(false);
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`ml-2 inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
        following
          ? "bg-[#e8f2eb] text-[#0a2412]"
          : "text-[#0a66c2] hover:bg-[#edf6ff]"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        <UserCheck className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {following ? "Following" : "+ Follow"}
    </button>
  );
}

function PostContent({ content, compact = false }: { content: string; compact?: boolean }) {
  return (
    <div
      className={`${compact ? "line-clamp-3 text-sm text-[#111111]" : "text-[14px] text-[#111111]"} leading-relaxed [&_a]:text-[#0a7854] [&_a]:underline [&_h3]:mb-5 [&_h3]:text-[24px] [&_h3]:font-normal [&_h3]:leading-[1.18] [&_h3]:text-[#111111] [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:list-disc`}
      dangerouslySetInnerHTML={{ __html: normalizePostContent(content) }}
    />
  );
}

export default function PostCard({ post, currentUserId, onLikeToggle, onCommentAdded, onDelete, onEdit, onVote }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [votePending, setVotePending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.content);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const isCompanyPost = !!post.company_id;
  const isOwner = post.user_id === currentUserId;
  const name = isCompanyPost ? (post.company?.name ?? "Company") : (post.profiles?.full_name ?? "Unknown");
  const headline = isCompanyPost ? (post.company?.industry ?? "Company") : (post.profiles?.headline ?? "");
  const avatarUrl = isCompanyPost ? (post.company?.logo_url ?? null) : (post.profiles?.avatar_url ?? null);
  const images = post.media_urls ?? [];

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  async function toggleComments() {
    if (!showComments && !commentsLoaded) {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
      setCommentsLoaded(true);
    }
    setShowComments((v) => !v);
  }

  async function handleVote(value: 1 | -1) {
    if (votePending) return;
    const next = post.my_vote === value ? 0 : value;

    // Optimistic update
    const prevUp = post.upvote_count ?? 0;
    const prevDown = post.downvote_count ?? 0;
    const prevVote = post.my_vote;
    let newUp = prevUp;
    let newDown = prevDown;
    if (prevVote === 1) newUp--;
    if (prevVote === -1) newDown--;
    if (next === 1) newUp++;
    if (next === -1) newDown++;
    onVote(post.id, next as 1 | -1 | 0, newUp, newDown);

    setVotePending(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: next }),
      });
      const data = await res.json();
      if (res.ok) {
        onVote(post.id, data.my_vote, data.upvote_count, data.downvote_count);
      } else {
        // Rollback on failure
        onVote(post.id, prevVote, prevUp, prevDown);
      }
    } catch {
      onVote(post.id, prevVote, prevUp, prevDown);
    }
    setVotePending(false);
  }

  async function handleLike() {
    if (likePending) return;
    setLikePending(true);
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      const delta = data.liked ? 1 : -1;
      onLikeToggle(post.id, data.liked, Math.max(0, post.like_count + delta));
    }
    setLikePending(false);
  }

  async function submitComment() {
    if (!commentDraft.trim()) return;
    setSubmittingComment(true);
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentDraft }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((prev) => [...prev, data.comment]);
      setCommentDraft("");
      onCommentAdded(post.id);
    }
    setSubmittingComment(false);
  }

  function onEditFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const total = editImages.length + newImages.length;
    const files = Array.from(e.target.files ?? []).slice(0, 4 - total);
    const next = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewImages((prev) => [...prev, ...next].slice(0, 4 - editImages.length));
    e.target.value = "";
  }

  async function handleSaveEdit() {
    if (!editDraft.trim() || saving) return;
    setSaving(true);

    let finalUrls = editImages;
    if (newImages.length > 0) {
      const formData = new FormData();
      newImages.forEach((img) => formData.append("files", img.file));
      const uploadRes = await fetch("/api/posts/media", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (uploadRes.ok) finalUrls = [...editImages, ...(uploadData.urls as string[])];
    }

    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editDraft, media_urls: finalUrls }),
    });
    if (res.ok) {
      newImages.forEach((img) => URL.revokeObjectURL(img.preview));
      setNewImages([]);
      onEdit(post.id, editDraft.trim(), finalUrls);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDelete(post.id);
    else setDeleting(false);
  }

  return (
    <div className="rounded-[16px] bg-white px-5 py-5 shadow-[0_18px_50px_rgba(33,31,24,0.04)] sm:px-8 sm:py-6">
      {/* Header */}
      <div className="flex gap-4">
        <Avatar name={name} url={avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[14px] font-bold leading-[18px] text-[#4b4b4b]">{name}</p>
            {!isOwner && !isCompanyPost && <FollowButton userId={post.user_id} initialFollowing={post.author_following} />}
          </div>
          {headline && <p className="truncate text-[11px] font-light leading-[15px] text-[#4b4b4b]">{headline}</p>}
          <p className="text-[11px] font-light leading-[15px] text-[#4b4b4b]">{formatDistanceToNow(post.created_at)}</p>
        </div>

        {/* Owner menu */}
        {isOwner && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-[#b0ae9f] hover:bg-[#f5f4f0] hover:text-[#5f5d54] transition-colors"
            >
              <MoreHorizontal className="w-[14px] h-[14px]" />
            </button>
            {menuOpen && (
              <div className="absolute top-[32px] right-0 bg-white border border-[#eceae3] rounded-[12px] shadow-xl overflow-hidden z-10 w-[130px] animate-scale-in">
                <button
                  onClick={() => { setEditing(true); setEditDraft(richTextToPlainText(post.content)); setEditImages(post.media_urls ?? []); setNewImages([]); setMenuOpen(false); }}
                  className="w-full text-left px-[12px] py-[10px] text-[12px] text-[#3d3c36] hover:bg-[#f5f4f0] flex items-center gap-[8px] transition-colors"
                >
                  <Pencil className="w-[12px] h-[12px] text-[#8a877b]" />
                  Edit post
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full text-left px-[12px] py-[10px] text-[12px] text-red-500 hover:bg-red-50 flex items-center gap-[8px] transition-colors disabled:opacity-50"
                >
                  {deleting
                    ? <Loader2 className="w-[12px] h-[12px] animate-spin" />
                    : <Trash2 className="w-[12px] h-[12px]" />}
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="my-8 h-px w-full bg-[#eceae3]" />

      {/* Board badge */}
      {post.room && (
        <Link
          href={`/community/rooms/${post.room.slug}`}
          className="mb-5 inline-flex items-center gap-1.5 rounded-[8px] bg-[#f0ede8] px-2.5 py-1 transition-colors hover:bg-[#e8e4de]"
        >
          <LayoutList className="w-3 h-3 text-[#5f5d54]" />
          <span className="text-[11px] font-medium text-[#5f5d54]">{post.room.name}</span>
        </Link>
      )}

      {/* Content — edit mode or display */}
      {editing ? (
        <div className="mb-3 flex flex-col gap-[8px]">
          <textarea
            autoFocus
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={4}
            className="w-full px-[10px] py-[8px] border border-[#dadada] rounded-[10px] text-sm text-[#292929] outline-none focus:border-[#0a2412] resize-none transition-colors"
          />

          {/* Image editing grid */}
          {(editImages.length > 0 || newImages.length > 0) && (
            <div className="grid grid-cols-4 gap-[6px]">
              {editImages.map((url, i) => (
                <div key={`e-${i}`} className="relative aspect-square rounded-[8px] overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setEditImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-[3px] right-[3px] w-[18px] h-[18px] rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-[9px] h-[9px]" />
                  </button>
                </div>
              ))}
              {newImages.map((img, i) => (
                <div key={`n-${i}`} className="relative aspect-square rounded-[8px] overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNewImages((prev) => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i); })}
                    className="absolute top-[3px] right-[3px] w-[18px] h-[18px] rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-[9px] h-[9px]" />
                  </button>
                </div>
              ))}
              {editImages.length + newImages.length < 4 && (
                <button
                  onClick={() => editFileRef.current?.click()}
                  className="aspect-square rounded-[8px] border-2 border-dashed border-[#eceae3] flex items-center justify-center text-[#b0ae9f] hover:border-[#c6f46b] hover:text-[#0a2412] transition-colors"
                >
                  <ImagePlus className="w-[16px] h-[16px]" />
                </button>
              )}
            </div>
          )}
          {editImages.length + newImages.length === 0 && (
            <button
              onClick={() => editFileRef.current?.click()}
              className="self-start flex items-center gap-[6px] px-[8px] py-[4px] rounded-[6px] text-[11px] text-[#8a877b] hover:bg-[#f5f4f0] hover:text-[#0a2412] transition-colors"
            >
              <ImagePlus className="w-[12px] h-[12px]" />
              Add images
            </button>
          )}
          <input ref={editFileRef} type="file" accept="image/*" multiple className="hidden" onChange={onEditFilesChange} />

          <div className="flex justify-end gap-[6px]">
            <button
              onClick={() => { setEditing(false); newImages.forEach((img) => URL.revokeObjectURL(img.preview)); setNewImages([]); }}
              className="h-[28px] px-[10px] text-[11px] text-[#5f5d54] rounded-[8px] hover:bg-[#f5f4f0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editDraft.trim()}
              className="h-[28px] px-[12px] text-[11px] font-medium bg-[#0a2412] text-[#fafaf8] rounded-[8px] disabled:opacity-40 flex items-center gap-[5px] hover:bg-[#0a2412]/90 transition-colors"
            >
              {saving && <Loader2 className="w-[10px] h-[10px] animate-spin" />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <PostContent content={post.content} />
      )}

      {/* Images — hidden in edit mode since the edit grid takes over */}
      {!editing && images.length > 0 && <ImageGrid urls={images} onOpen={setViewerIndex} />}
      {viewerIndex !== null && images[viewerIndex] && (
        <ImageViewer
          urls={images}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onChange={setViewerIndex}
        />
      )}

      {/* Reshared post preview */}
      {post.reshared_post && (
        <div className="rounded-[10px] p-3 mb-3 bg-[#f8fafb]">
          <p className="text-xs font-semibold text-[#4b4b4b] mb-1">
            {post.reshared_post.profiles?.full_name ?? "Unknown"}
          </p>
          <PostContent content={post.reshared_post.content} compact />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-8">

        {/* Upvote */}
        <button
          onClick={() => handleVote(1)}
          disabled={votePending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs transition-colors disabled:opacity-50 ${
            post.my_vote === 1
              ? "bg-[#e8f2eb] text-[#0a7854] font-semibold"
              : "text-[#4b4b4b] hover:bg-[#f5f4f0]"
          }`}
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>{post.upvote_count ?? 0}</span>
        </button>

        {/* Downvote */}
        <button
          onClick={() => handleVote(-1)}
          disabled={votePending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs transition-colors disabled:opacity-50 ${
            post.my_vote === -1
              ? "bg-[#fee2e2] text-[#b91c1c] font-semibold"
              : "text-[#4b4b4b] hover:bg-[#f5f4f0]"
          }`}
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>{post.downvote_count ?? 0}</span>
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs text-[#4b4b4b] hover:bg-[#e8e8e8] transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {post.comment_count > 0 && <span>{post.comment_count}</span>}
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 pt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.profiles?.full_name ?? null} size="sm" />
              <div className="flex-1 bg-[#f8fafb] rounded-[10px] px-3 py-2">
                <p className="text-xs font-bold text-[#292929] mb-0.5">
                  {c.profiles?.full_name ?? "Unknown"}
                  {c.user_id === currentUserId && (
                    <span className="ml-1.5 text-[#4b4b4b] font-normal">· you</span>
                  )}
                </p>
                <p className="text-sm text-[#292929] leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#0a2412] text-[#c6f46b] flex items-center justify-center text-xs font-bold shrink-0">
              Me
            </div>
            <div className="flex-1 flex gap-2">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); }
                }}
                placeholder="Write a comment…"
                rows={1}
                className="flex-1 px-3 py-2 text-sm rounded-[10px] bg-white border border-[#eceae3] text-[#292929] placeholder:text-[#4b4b4b] outline-none focus:border-[#0a2412] resize-none transition-colors"
              />
              <button
                onClick={submitComment}
                disabled={submittingComment || !commentDraft.trim()}
                className="px-3 py-2 rounded-[10px] bg-[#0a2412] text-[#c6f46b] hover:bg-[#0a2412]/90 disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
