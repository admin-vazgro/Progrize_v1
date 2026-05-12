import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: rooms, error } = await sb
    .from("rooms")
    .select("id, name, slug, description, is_private, member_count, post_count, created_at")
    .eq("is_private", false)
    .order("member_count", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch which rooms the user has joined
  const { data: memberships } = await sb
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id);

  const joinedIds = new Set((memberships ?? []).map((m: { room_id: string }) => m.room_id));

  const annotated = (rooms ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    is_joined: joinedIds.has(r.id),
  }));

  return NextResponse.json({ rooms: annotated });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, is_private } = await req.json() as {
    name: string;
    description?: string;
    is_private?: boolean;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: room, error } = await sb
    .from("rooms")
    .insert({
      id: crypto.randomUUID(),
      name: name.trim(),
      slug,
      description: description ?? null,
      is_private: is_private ?? false,
      creator_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-join creator as admin
  await sb.from("room_members").insert({
    id: crypto.randomUUID(),
    room_id: room.id,
    user_id: user.id,
    role: "admin",
  });

  return NextResponse.json({ room }, { status: 201 });
}
