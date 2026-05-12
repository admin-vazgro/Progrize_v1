import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function syncFollowCounts(sb: unknown, followerId: string, followingId: string) {
  const s = sb as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    s.from("follows").select("*", { count: "exact", head: true }).eq("following_id", followingId),
    s.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", followerId),
  ]);
  await Promise.all([
    s.from("profiles").update({ follower_count: followerCount ?? 0 }).eq("id", followingId),
    s.from("profiles").update({ following_count: followingCount ?? 0 }).eq("id", followerId),
  ]);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: targetId } = await params;
  if (targetId === user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: existing } = await sb
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .single();

  if (existing) {
    await sb.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    await syncFollowCounts(sb, user.id, targetId);
    return NextResponse.json({ following: false });
  } else {
    await sb.from("follows").insert({ follower_id: user.id, following_id: targetId });
    await syncFollowCounts(sb, user.id, targetId);
    // Notify target (fire and forget)
    try {
      await sb.from("notifications").insert({
        user_id: targetId,
        type: "follow",
        actor_id: user.id,
      });
    } catch {
      // non-critical
    }
    return NextResponse.json({ following: true });
  }
}
