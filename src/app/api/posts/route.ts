import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("room_id");
  const filterRoomIds = searchParams.get("room_ids")?.split(",").filter(Boolean) ?? [];
  const cursor = searchParams.get("cursor");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  let query = sb
    .from("posts")
    .select("id, content, media_urls, like_count, comment_count, reshare_count, created_at, user_id, room_id, reshared_post_id, visibility")
    .order("created_at", { ascending: false })
    .limit(20);

  if (roomId) {
    query = query.eq("room_id", roomId);
  } else if (filterRoomIds.length > 0) {
    query = query.in("room_id", filterRoomIds);
  } else {
    query = query.is("room_id", null);
  }

  if (cursor) query = query.lt("created_at", cursor);

  const { data: posts, error } = await query;
  if (error) {
    console.error("Posts fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  // Fetch current user's connection partner IDs for network-visibility filtering
  const { data: myConnections } = await sb
    .from("connections")
    .select("user_id_a, user_id_b")
    .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`);

  const connectionSet = new Set<string>();
  for (const c of (myConnections ?? []) as Array<{ user_id_a: string; user_id_b: string }>) {
    connectionSet.add(c.user_id_a === user.id ? c.user_id_b : c.user_id_a);
  }

  // Filter by visibility: public → everyone, network → author's connections + author, private → author only
  const visiblePosts = (posts as Array<Record<string, unknown>>).filter((post) => {
    const vis = (post.visibility as string) ?? "public";
    if (vis === "public") return true;
    if (post.user_id === user.id) return true;
    if (vis === "network") return connectionSet.has(post.user_id as string);
    return false; // private, not author
  });

  if (visiblePosts.length === 0) return NextResponse.json({ posts: [] });

  // Fetch profiles for all post authors (service client bypasses RLS)
  const userIds = [...new Set(visiblePosts.map((p) => p.user_id as string))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createServiceClient() as any;
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, headline, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null; headline: string | null }) => [p.id, p])
  );

  // Fetch room names for posts that belong to a room
  const postRoomIds = [...new Set(visiblePosts.map((p) => p.room_id as string | null).filter(Boolean))] as string[];
  const roomMap = new Map<string, { name: string; slug: string }>();
  if (postRoomIds.length > 0) {
    const { data: rooms } = await sb.from("rooms").select("id, name, slug").in("id", postRoomIds);
    for (const r of (rooms ?? []) as Array<{ id: string; name: string; slug: string }>) {
      roomMap.set(r.id, { name: r.name, slug: r.slug });
    }
  }

  // Fetch which posts current user has liked
  const postIds = visiblePosts.map((p) => p.id as string);
  const { data: myLikes } = await sb
    .from("post_likes")
    .select("post_id")
    .eq("user_id", user.id)
    .in("post_id", postIds);

  const likedSet = new Set((myLikes ?? []).map((l: { post_id: string }) => l.post_id));

  // Fetch vote data — gracefully skip if migration hasn't run yet
  let voteMap = new Map<string, number>();
  let upvoteCountMap = new Map<string, number>();
  let downvoteCountMap = new Map<string, number>();
  try {
    const { data: myVotes } = await sb
      .from("post_votes")
      .select("post_id, value")
      .eq("user_id", user.id)
      .in("post_id", postIds);
    const { data: allVotes } = await sb
      .from("post_votes")
      .select("post_id, value")
      .in("post_id", postIds);
    voteMap = new Map((myVotes ?? []).map((v: { post_id: string; value: number }) => [v.post_id, v.value]));
    for (const v of (allVotes ?? []) as Array<{ post_id: string; value: number }>) {
      if (v.value === 1) upvoteCountMap.set(v.post_id, (upvoteCountMap.get(v.post_id) ?? 0) + 1);
      if (v.value === -1) downvoteCountMap.set(v.post_id, (downvoteCountMap.get(v.post_id) ?? 0) + 1);
    }
  } catch { /* migration not yet applied */ }

  const enriched = visiblePosts.map((post) => ({
    ...post,
    profiles: profileMap.get(post.user_id as string) ?? null,
    liked_by_me: likedSet.has(post.id as string),
    my_vote: voteMap.get(post.id as string) ?? 0,
    upvote_count: upvoteCountMap.get(post.id as string) ?? 0,
    downvote_count: downvoteCountMap.get(post.id as string) ?? 0,
    room: post.room_id ? (roomMap.get(post.room_id as string) ?? null) : null,
  }));

  return NextResponse.json({ posts: enriched });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { content, room_id, reshared_post_id, media_urls, visibility } = body as {
    content: string;
    room_id?: string;
    reshared_post_id?: string;
    media_urls?: string[];
    visibility?: string;
  };

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const safeVisibility = ["public", "network", "private"].includes(visibility ?? "") ? visibility : "public";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: post, error } = await sb
    .from("posts")
    .insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      content: content.trim(),
      room_id: room_id ?? null,
      reshared_post_id: reshared_post_id ?? null,
      media_urls: media_urls?.length ? media_urls : null,
      visibility: safeVisibility,
    })
    .select("id, content, like_count, comment_count, reshare_count, created_at, user_id, room_id, visibility")
    .single();

  if (error) {
    console.error("Post create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch author profile separately (service client bypasses RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminPost = await createServiceClient() as any;
  const { data: profile } = await adminPost
    .from("profiles")
    .select("id, full_name, headline")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    post: { ...post, profiles: profile ?? null, liked_by_me: false },
  }, { status: 201 });
}
