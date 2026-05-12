import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  // Get IDs I'm already connected with
  const { data: myConnections } = await sb
    .from("connections")
    .select("user_id_a, user_id_b")
    .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`);

  const connectedIds = (myConnections ?? []).map((c: { user_id_a: string; user_id_b: string }) =>
    c.user_id_a === user.id ? c.user_id_b : c.user_id_a
  );

  // Get pending request IDs (sent or received)
  const { data: pendingReqs } = await sb
    .from("connection_requests")
    .select("sender_id, recipient_id")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq("status", "pending");

  const pendingIds = (pendingReqs ?? []).flatMap((r: { sender_id: string; recipient_id: string }) =>
    [r.sender_id, r.recipient_id].filter((id) => id !== user.id)
  );

  const excludeIds = [...new Set([user.id, ...connectedIds, ...pendingIds])];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createServiceClient() as any;
  let query = admin
    .from("profiles")
    .select("id, full_name, headline, location, avatar_url, connection_count, follower_count")
    .not("id", "in", `(${excludeIds.join(",")})`)
    .limit(limit);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,headline.ilike.%${q}%`);
  }

  const { data: people, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach follow status
  const peopleIds = (people ?? []).map((p: { id: string }) => p.id);
  const { data: myFollows } = peopleIds.length
    ? await sb.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", peopleIds)
    : { data: [] };

  const followingSet = new Set((myFollows ?? []).map((f: { following_id: string }) => f.following_id));

  const enriched = (people ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    following: followingSet.has(p.id as string),
  }));

  return NextResponse.json({ people: enriched });
}
