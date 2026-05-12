import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: existing } = await sb
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await sb.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await sb.from("post_likes").insert({ id: crypto.randomUUID(), post_id: postId, user_id: user.id });
  }

  // Sync like_count from the actual row count
  const { count } = await sb
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  await sb.from("posts").update({ like_count: count ?? 0 }).eq("id", postId);

  // Notify post author on like (not on unlike, not if liking own post)
  if (!existing) {
    const { data: post } = await sb.from("posts").select("user_id").eq("id", postId).single();
    if (post?.user_id && post.user_id !== user.id) {
      await sb.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: post.user_id,
        actor_id: user.id,
        type: "post_like",
        entity_id: postId,
        read: false,
      });
    }
  }

  return NextResponse.json({ liked: !existing });
}
