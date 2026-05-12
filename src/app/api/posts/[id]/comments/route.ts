import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: comments, error } = await sb
    .from("post_comments")
    .select("id, content, created_at, user_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!comments || comments.length === 0) {
    return NextResponse.json({ comments: [] });
  }

  // Fetch profiles separately
  const userIds = [...new Set((comments as Array<{ user_id: string }>).map((c) => c.user_id))];
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p])
  );

  const enriched = (comments as Array<Record<string, unknown>>).map((c) => ({
    ...c,
    profiles: profileMap.get(c.user_id as string) ?? null,
  }));

  return NextResponse.json({ comments: enriched });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json() as { content: string };
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: comment, error } = await sb
    .from("post_comments")
    .insert({ id: crypto.randomUUID(), post_id: postId, user_id: user.id, content: content.trim() })
    .select("id, content, created_at, user_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync comment count from actual rows (best-effort)
  try {
    const { count } = await sb.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", postId);
    await sb.from("posts").update({ comment_count: count ?? 0 }).eq("id", postId);
  } catch {
    // non-critical
  }

  // Notify post author on comment (not if commenting on own post)
  const { data: post } = await sb.from("posts").select("user_id").eq("id", postId).single();
  if (post?.user_id && post.user_id !== user.id) {
    await sb.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id: post.user_id,
      actor_id: user.id,
      type: "post_comment",
      entity_id: postId,
      read: false,
    });
  }

  // Fetch profile
  const { data: profile } = await sb.from("profiles").select("id, full_name").eq("id", user.id).single();

  return NextResponse.json({ comment: { ...comment, profiles: profile ?? null } }, { status: 201 });
}
