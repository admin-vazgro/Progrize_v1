import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string; userId: string }>;

// DELETE — remove a member (admin only, cannot remove yourself if last admin)
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { slug, userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: room } = await sb.from("rooms").select("id, creator_id").eq("slug", slug).single();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: requesterMember } = await sb.from("room_members").select("role").eq("room_id", room.id).eq("user_id", user.id).single();
  const isAdmin = room.creator_id === user.id || requesterMember?.role === "admin" || requesterMember?.role === "moderator";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Prevent removing the creator
  if (userId === room.creator_id) return NextResponse.json({ error: "Cannot remove room creator" }, { status: 400 });

  await sb.from("room_members").delete().eq("room_id", room.id).eq("user_id", userId);
  const { count } = await sb.from("room_members").select("*", { count: "exact", head: true }).eq("room_id", room.id);
  await sb.from("rooms").update({ member_count: count ?? 0 }).eq("id", room.id);

  return NextResponse.json({ ok: true });
}
