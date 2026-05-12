import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: room } = await sb.from("rooms").select("id").eq("slug", slug).single();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: existing } = await sb
    .from("room_members")
    .select("id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Leave
    await sb.from("room_members").delete().eq("room_id", room.id).eq("user_id", user.id);
    try {
      const { count } = await sb.from("room_members").select("*", { count: "exact", head: true }).eq("room_id", room.id);
      await sb.from("rooms").update({ member_count: count ?? 0 }).eq("id", room.id);
    } catch { /* non-critical */ }
    return NextResponse.json({ joined: false });
  } else {
    // Join
    await sb.from("room_members").insert({
      id: crypto.randomUUID(),
      room_id: room.id,
      user_id: user.id,
      role: "member",
    });
    try {
      const { count } = await sb.from("room_members").select("*", { count: "exact", head: true }).eq("room_id", room.id);
      await sb.from("rooms").update({ member_count: count ?? 0 }).eq("id", room.id);
    } catch { /* non-critical */ }
    return NextResponse.json({ joined: true });
  }
}
