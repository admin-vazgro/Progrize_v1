"use client";

import { useState, useEffect, useCallback } from "react";
import PostCard from "./PostCard";
import { Loader2 } from "lucide-react";

export interface Post {
  id: string;
  content: string;
  media_urls: string[] | null;
  like_count: number;
  comment_count: number;
  reshare_count: number;
  upvote_count: number;
  downvote_count: number;
  my_vote: 1 | -1 | 0;
  created_at: string;
  user_id: string;
  author_following?: boolean;
  liked_by_me: boolean;
  profiles: { full_name: string | null; headline: string | null; avatar_url: string | null } | null;
  room?: { name: string; slug: string } | null;
  reshared_post?: {
    id: string;
    content: string;
    created_at: string;
    profiles: { full_name: string | null } | null;
  } | null;
}

interface Props {
  userId: string;
  userName: string;
  roomId?: string;
  joinedRoomIds?: string[];
  hideCompose?: boolean;
  sortBy?: "recommended" | "all" | "latest" | "top" | "network" | "boards";
}

const POST_LIMIT = 1000;

export default function FeedTab({ userId, userName, roomId, joinedRoomIds, hideCompose, sortBy }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (roomId) {
        params.set("room_id", roomId);
      } else if (sortBy === "boards" && joinedRoomIds && joinedRoomIds.length > 0) {
        params.set("room_ids", joinedRoomIds.join(","));
      }
      if (sortBy) params.set("sort", sortBy);
      const res = await fetch(`/api/posts?${params}`);
      if (!res.ok) throw new Error("Failed to load posts");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [joinedRoomIds, roomId, sortBy]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handlePost() {
    if (!draft.trim() || draft.length > POST_LIMIT) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, room_id: roomId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) => [data.post, ...prev]);
        setDraft("");
        setShowCompose(false);
      } else {
        setPostError(data.error ?? "Failed to post");
      }
    } catch {
      setPostError("Failed to post. Check your connection.");
    } finally {
      setPosting(false);
    }
  }

  function handleLikeToggle(postId: string, liked: boolean, newCount: number) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, liked_by_me: liked, like_count: newCount } : p));
  }

  function handleCommentAdded(postId: string) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
  }

  function handleDelete(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function handleEdit(postId: string, newContent: string, newMediaUrls: string[]) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, content: newContent, media_urls: newMediaUrls.length ? newMediaUrls : null } : p));
  }

  function handleVote(postId: string, myVote: 1 | -1 | 0, upvoteCount: number, downvoteCount: number) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, my_vote: myVote, upvote_count: upvoteCount, downvote_count: downvoteCount } : p));
  }

  return (
    <div className="space-y-4">
      {/* Compose — hidden when parent owns the compose card */}
      {!hideCompose && (
        !showCompose ? (
          <button
            onClick={() => setShowCompose(true)}
            className="w-full text-left bg-white rounded-[20px] px-5 py-4 text-sm text-[#4b4b4b] transition-colors"
          >
            What&apos;s on your mind, {userName.split(" ")[0]}?
          </button>
        ) : (
          <div className="bg-white rounded-[20px] p-5 space-y-3 animate-fade-up">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`What's on your mind, ${userName.split(" ")[0]}?`}
              rows={4}
              maxLength={POST_LIMIT}
              className="w-full px-0 py-0 text-sm text-[#292929] placeholder:text-[#4b4b4b] outline-none resize-none bg-transparent"
            />
            {postError && <p className="text-xs text-red-600">{postError}</p>}
            <div className="flex items-center justify-between pt-2">
              <span className={`text-xs tabular-nums ${draft.length > POST_LIMIT * 0.9 ? "text-red-500" : "text-[#b0b0b0]"}`}>
                {draft.length > POST_LIMIT * 0.8 ? `${POST_LIMIT - draft.length} left` : ""}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCompose(false); setDraft(""); setPostError(null); }}
                  className="px-4 py-2 rounded-[10px] text-sm text-[#292929] hover:bg-[#e8e8e8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePost}
                  disabled={posting || !draft.trim() || draft.length > POST_LIMIT}
                  className="px-4 py-2 rounded-[10px] text-sm bg-[#c1cc5a] text-[#0a2412] font-medium hover:bg-[#c1cc5a]/90 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
                >
                  {posting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Post
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Feed */}
      {loading ? (
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
      ) : fetchError ? (
        <div className="bg-white rounded-[20px] p-10 text-center animate-fade-up">
          <p className="text-sm font-medium text-[#292929] mb-2">{fetchError}</p>
          <button
            onClick={fetchPosts}
            className="text-xs font-medium px-3 py-1.5 rounded-[8px] bg-[#f0f0f0] text-[#292929] hover:bg-[#e0e0e0] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-[20px] p-12 text-center">
          <p className="text-sm font-bold text-[#292929] mb-1">No posts yet</p>
          <p className="text-xs text-[#4b4b4b]">Be the first to share something.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={userId}
              onLikeToggle={handleLikeToggle}
              onCommentAdded={handleCommentAdded}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onVote={handleVote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
