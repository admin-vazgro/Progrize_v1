import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: targetId } = await params;
  if (targetId === user.id) return NextResponse.json({ status: "self", following: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [a, b] = [user.id, targetId].sort();

  const [
    { data: connection },
    { data: pendingRequest },
    { data: follow },
  ] = await Promise.all([
    sb.from("connections").select("id, request_id").eq("user_id_a", a).eq("user_id_b", b).single(),
    sb.from("connection_requests")
      .select("id, sender_id, status")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${user.id})`)
      .eq("status", "pending")
      .single(),
    sb.from("follows").select("id").eq("follower_id", user.id).eq("following_id", targetId).single(),
  ]);

  const following = !!follow;

  if (connection) {
    return NextResponse.json({ status: "connected", request_id: connection.request_id, following });
  }
  if (pendingRequest) {
    const status = pendingRequest.sender_id === user.id ? "pending_sent" : "pending_received";
    return NextResponse.json({ status, request_id: pendingRequest.id, following });
  }
  return NextResponse.json({ status: "none", following });
}
