import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

async function getAdminRoom(sb: any, slug: string, userId: string) {
  const { data: room } = await sb.from("rooms").select("id, creator_id").eq("slug", slug).single();
  if (!room) return null;
  const { data: member } = await sb.from("room_members").select("role").eq("room_id", room.id).eq("user_id", userId).single();
  const isAdmin = room.creator_id === userId || member?.role === "admin" || member?.role === "moderator";
  return isAdmin ? room : null;
}

// GET — list members
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: room } = await sb.from("rooms").select("id").eq("slug", slug).single();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: members } = await sb
    .from("room_members")
    .select("user_id, role, joined_at")
    .eq("room_id", room.id)
    .order("joined_at", { ascending: true });

  if (!members?.length) return NextResponse.json({ members: [] });

  const userIds = members.map((m: any) => m.user_id);
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name, avatar_url, headline")
    .in("id", userIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

  return NextResponse.json({
    members: members.map((m: any) => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      profile: profileMap[m.user_id] ?? null,
    })),
  });
}

// POST — add a member by user_id (admin only)
export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const room = await getAdminRoom(sb, slug, user.id);
  if (!room) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const { data: existing } = await sb.from("room_members").select("id").eq("room_id", room.id).eq("user_id", user_id).single();
  if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 });

  await sb.from("room_members").insert({ id: crypto.randomUUID(), room_id: room.id, user_id, role: "member" });
  const { count } = await sb.from("room_members").select("*", { count: "exact", head: true }).eq("room_id", room.id);
  await sb.from("rooms").update({ member_count: count ?? 0 }).eq("id", room.id);

  return NextResponse.json({ ok: true });
}
