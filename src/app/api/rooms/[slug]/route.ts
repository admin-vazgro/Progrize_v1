import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: room } = await sb.from("rooms").select("id, creator_id").eq("slug", slug).single();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: membership } = await sb
    .from("room_members").select("role").eq("room_id", room.id).eq("user_id", user.id).single();

  if (membership?.role !== "admin" && room.creator_id !== user.id) {
    return NextResponse.json({ error: "Only admins can edit this room" }, { status: 403 });
  }

  const body = await req.json() as { name?: string; description?: string; is_private?: boolean };
  const allowed = ["name", "description", "is_private"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key as keyof typeof body] ?? null;
  }
  if (body.name) {
    update.slug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const { data: updated, error } = await sb.from("rooms").update(update).eq("id", room.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ room: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: room } = await sb.from("rooms").select("id, creator_id").eq("slug", slug).single();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  if (room.creator_id !== user.id) {
    return NextResponse.json({ error: "Only the room creator can delete it" }, { status: 403 });
  }

  const { error } = await sb.from("rooms").delete().eq("id", room.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
