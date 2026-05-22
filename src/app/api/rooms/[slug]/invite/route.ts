import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

// GET — return the invite token for a private room (admin only)
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: room } = await sb.from("rooms").select("id, creator_id, invite_token, is_private").eq("slug", slug).single();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: member } = await sb.from("room_members").select("role").eq("room_id", room.id).eq("user_id", user.id).single();
  const isAdmin = room.creator_id === user.id || member?.role === "admin" || member?.role === "moderator";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ invite_token: room.invite_token });
}

// POST — regenerate the invite token (admin only)
export async function POST(_req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: room } = await sb.from("rooms").select("id, creator_id").eq("slug", slug).single();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: member } = await sb.from("room_members").select("role").eq("room_id", room.id).eq("user_id", user.id).single();
  const isAdmin = room.creator_id === user.id || member?.role === "admin" || member?.role === "moderator";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const newToken = crypto.randomUUID();
  await sb.from("rooms").update({ invite_token: newToken }).eq("id", room.id);

  return NextResponse.json({ invite_token: newToken });
}
