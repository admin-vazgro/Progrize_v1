import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { value } = await req.json() as { value: 1 | -1 | 0 };
  if (![1, -1, 0].includes(value)) return NextResponse.json({ error: "Invalid vote" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: existing } = await sb
    .from("post_votes")
    .select("id, value")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (value === 0) {
    if (existing) await sb.from("post_votes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else if (existing) {
    if (existing.value === value) {
      // Same vote clicked again — remove it
      await sb.from("post_votes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      // Switch direction
      await sb.from("post_votes").update({ value }).eq("post_id", postId).eq("user_id", user.id);
    }
  } else {
    await sb.from("post_votes").insert({ id: crypto.randomUUID(), post_id: postId, user_id: user.id, value });
  }

  // Recount from actual rows
  const { count: upCount } = await sb.from("post_votes").select("*", { count: "exact", head: true }).eq("post_id", postId).eq("value", 1);
  const { count: downCount } = await sb.from("post_votes").select("*", { count: "exact", head: true }).eq("post_id", postId).eq("value", -1);

  await sb.from("posts").update({ upvote_count: upCount ?? 0, downvote_count: downCount ?? 0 }).eq("id", postId);

  const { data: myVote } = await sb.from("post_votes").select("value").eq("post_id", postId).eq("user_id", user.id).single();

  return NextResponse.json({
    my_vote: myVote?.value ?? 0,
    upvote_count: upCount ?? 0,
    downvote_count: downCount ?? 0,
  });
}
