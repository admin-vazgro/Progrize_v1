"use client";

import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Repeat2, ChevronDown, ChevronUp, Send, MoreHorizontal, Pencil, Trash2, Loader2, X, ImagePlus, ArrowUp, ArrowDown, LayoutList } from "lucide-react";
import Link from "next/link";
import type { Post } from "./FeedTab";
import { formatDistanceToNow } from "@/lib/utils";

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

function Avatar({ name, url }: { name: string | null; url?: string | null }) {
  const initials = (name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (url) return <img src={url} alt={name ?? ""} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-9 h-9 rounded-full bg-[#0a2412] text-[#c6f46b] flex items-center justify-center text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

function ImageGrid({ urls }: { urls: string[] }) {
  if (!urls.length) return null;

  if (urls.length === 1) {
    return (
      <div className="mt-3 w-full rounded-[10px] overflow-hidden max-h-[420px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  const cols =
    urls.length === 2 ? "grid-cols-2" :
    urls.length === 3 ? "grid-cols-3" :
    "grid-cols-2";

  return (
    <div className={`grid ${cols} gap-[3px] mt-3`}>
      {urls.slice(0, 4).map((u, i) => (
        <div key={i} className="aspect-square rounded-[8px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
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
  const menuRef = useRef<HTMLDivElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const isOwner = post.user_id === currentUserId;
  const name = post.profiles?.full_name ?? "Unknown";
  const headline = post.profiles?.headline ?? "";
  const avatarUrl = post.profiles?.avatar_url ?? null;
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
    <div className="bg-white rounded-[20px] p-5">
      {/* Header */}
      <div className="flex gap-3 mb-3">
        <Avatar name={name} url={avatarUrl} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#292929] leading-tight">{name}</p>
          {headline && <p className="text-xs text-[#4b4b4b] truncate">{headline}</p>}
          <p className="text-xs text-[#808080] mt-0.5">{formatDistanceToNow(post.created_at)}</p>
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
                  onClick={() => { setEditing(true); setEditDraft(post.content); setEditImages(post.media_urls ?? []); setNewImages([]); setMenuOpen(false); }}
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

      {/* Board badge */}
      {post.room && (
        <Link
          href={`/community/rooms/${post.room.slug}`}
          className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-[8px] bg-[#f0ede8] hover:bg-[#e8e4de] transition-colors"
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
        <p className="text-sm text-[#292929] leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>
      )}

      {/* Images — hidden in edit mode since the edit grid takes over */}
      {!editing && images.length > 0 && <ImageGrid urls={images} />}

      {/* Reshared post preview */}
      {post.reshared_post && (
        <div className="rounded-[10px] p-3 mb-3 bg-[#f8fafb]">
          <p className="text-xs font-semibold text-[#4b4b4b] mb-1">
            {post.reshared_post.profiles?.full_name ?? "Unknown"}
          </p>
          <p className="text-sm text-[#292929] leading-relaxed line-clamp-3">{post.reshared_post.content}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2">

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

        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs transition-colors ${
            post.liked_by_me
              ? "text-[#0a2412] font-semibold bg-[#f7fcca]"
              : "text-[#4b4b4b] hover:bg-[#e8e8e8]"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${post.liked_by_me ? "fill-current" : ""}`} />
          {post.like_count > 0 && <span>{post.like_count}</span>}
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs text-[#4b4b4b] hover:bg-[#e8e8e8] transition-colors">
          <Repeat2 className="w-3.5 h-3.5" />
          {post.reshare_count > 0 && <span>{post.reshare_count}</span>}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 pt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.profiles?.full_name ?? null} />
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
