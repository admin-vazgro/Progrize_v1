import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sanitizeRichText } from "@/lib/rich-text";

type VisiblePost = Record<string, unknown> & {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  room_id: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  reshare_count?: number | null;
};

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "that", "this", "your", "you", "are", "our", "but",
  "about", "into", "have", "has", "was", "were", "will", "can", "how", "what", "why",
  "job", "jobs", "work", "career", "role", "roles",
]);

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9+#.\s-]/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeTerm(value)
    .split(/[\s,/|]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function extractHashtags(value: string) {
  return [...value.matchAll(/#([a-zA-Z0-9_-]+)/g)].map((match) => match[1]);
}

function addWeightedTerms(weights: Map<string, number>, values: Array<string | null | undefined>, weight: number) {
  for (const value of values) {
    if (!value) continue;
    const phrase = normalizeTerm(value);
    if (phrase.length >= 3) weights.set(phrase, Math.max(weights.get(phrase) ?? 0, weight));
    for (const token of tokenize(value)) weights.set(token, Math.max(weights.get(token) ?? 0, weight * 0.7));
  }
}

function freshnessScore(createdAt: string) {
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 36e5);
  return Math.max(0, 18 - ageHours * 0.55);
}

function engagementScore(post: VisiblePost, upvotes: number, downvotes: number) {
  return (
    Math.log1p((post.like_count ?? 0) + upvotes * 2 + (post.comment_count ?? 0) * 3 + (post.reshare_count ?? 0) * 2) * 7
    - downvotes * 2
  );
}

function relevanceScore(
  post: VisiblePost,
  profile: { headline: string | null } | null,
  room: { name: string; slug: string } | null,
  interestWeights: Map<string, number>,
  joinedRoomIds: Set<string>,
  upvotes: number,
  downvotes: number,
) {
  const postText = normalizeTerm([
    stripHtml(post.content ?? ""),
    room?.name,
    profile?.headline,
    extractHashtags(post.content ?? "").join(" "),
  ].filter(Boolean).join(" "));

  let score = 0;
  for (const [term, weight] of interestWeights) {
    if (!term) continue;
    if (postText.includes(term)) score += weight;
  }

  if (post.room_id && joinedRoomIds.has(post.room_id)) score += 18;
  score += engagementScore(post, upvotes, downvotes);
  score += freshnessScore(post.created_at);

  return score;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("room_id");
  const filterRoomIds = searchParams.get("room_ids")?.split(",").filter(Boolean) ?? [];
  const cursor = searchParams.get("cursor");
  const sort = searchParams.get("sort") ?? "all";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  let query = sb
    .from("posts")
    .select("id, content, media_urls, like_count, comment_count, reshare_count, created_at, user_id, room_id, reshared_post_id, visibility");

  if (sort === "top") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", weekAgo).order("like_count", { ascending: false }).order("comment_count", { ascending: false }).limit(40);
  } else {
    query = query.order("created_at", { ascending: false }).limit(sort === "recommended" ? 60 : 20);
  }

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
  const visiblePosts = (posts as VisiblePost[]).filter((post) => {
    const vis = (post.visibility as string) ?? "public";
    if (sort === "network" && post.user_id !== user.id && !connectionSet.has(post.user_id as string)) return false;
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

  const profileMap = new Map<string, { id: string; full_name: string | null; headline: string | null; avatar_url?: string | null }>(
    (profiles ?? []).map((p: { id: string; full_name: string | null; headline: string | null; avatar_url?: string | null }) => [p.id, p])
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

  const { data: joinedRows } = await sb
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id);
  const joinedRoomSet = new Set<string>(((joinedRows ?? []) as Array<{ room_id: string }>).map((row) => row.room_id));

  // Fetch which posts current user has liked
  const postIds = visiblePosts.map((p) => p.id as string);
  const [{ data: myLikes }, { data: myFollows }] = await Promise.all([
    sb
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds),
    sb
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", userIds),
  ]);

  const likedSet = new Set((myLikes ?? []).map((l: { post_id: string }) => l.post_id));
  const followingSet = new Set((myFollows ?? []).map((f: { following_id: string }) => f.following_id));

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

  let rankedPosts = visiblePosts;

  if (sort === "recommended") {
    const [{ data: preferences }, { data: myProfile }, { data: skillRows }] = await Promise.all([
      sb.from("user_preferences").select("industries, topics, job_roles, career_goals").eq("user_id", user.id).single(),
      sb.from("profiles").select("headline, target_roles").eq("id", user.id).single(),
      sb.from("profile_skills").select("skills(name)").eq("user_id", user.id),
    ]);

    const pref = (preferences ?? {}) as {
      industries?: string[];
      topics?: string[];
      job_roles?: string[];
      career_goals?: string[];
    };
    const profile = (myProfile ?? {}) as { headline?: string | null; target_roles?: string[] | null };
    const skills = ((skillRows ?? []) as Array<{ skills: { name: string } | null }>)
      .map((row) => row.skills?.name)
      .filter(Boolean) as string[];

    const interestWeights = new Map<string, number>();
    addWeightedTerms(interestWeights, pref.topics ?? [], 28);
    addWeightedTerms(interestWeights, pref.industries ?? [], 22);
    addWeightedTerms(interestWeights, pref.job_roles ?? [], 24);
    addWeightedTerms(interestWeights, pref.career_goals ?? [], 18);
    addWeightedTerms(interestWeights, profile.target_roles ?? [], 26);
    addWeightedTerms(interestWeights, skills, 30);
    addWeightedTerms(interestWeights, [profile.headline], 18);

    rankedPosts = [...visiblePosts].sort((a, b) => {
      const bProfile = profileMap.get(b.user_id) ?? null;
      const aProfile = profileMap.get(a.user_id) ?? null;
      const bScore = relevanceScore(
        b,
        bProfile,
        b.room_id ? (roomMap.get(b.room_id) ?? null) : null,
        interestWeights,
        joinedRoomSet,
        upvoteCountMap.get(b.id) ?? 0,
        downvoteCountMap.get(b.id) ?? 0,
      );
      const aScore = relevanceScore(
        a,
        aProfile,
        a.room_id ? (roomMap.get(a.room_id) ?? null) : null,
        interestWeights,
        joinedRoomSet,
        upvoteCountMap.get(a.id) ?? 0,
        downvoteCountMap.get(a.id) ?? 0,
      );
      return bScore - aScore || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }).slice(0, 20);
  }

  const enriched = rankedPosts.map((post) => ({
    ...post,
    profiles: profileMap.get(post.user_id as string) ?? null,
    author_following: followingSet.has(post.user_id),
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

  const safeContent = sanitizeRichText(content ?? "");

  if (!safeContent) {
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
      content: safeContent,
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
