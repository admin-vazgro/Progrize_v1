import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: rows, error } = await sb
    .from("connections")
    .select("id, user_id_a, user_id_b, request_id, created_at")
    .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const otherIds = (rows ?? []).map((r: { user_id_a: string; user_id_b: string }) =>
    r.user_id_a === user.id ? r.user_id_b : r.user_id_a
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createServiceClient() as any;
  const { data: profiles } = otherIds.length
    ? await admin.from("profiles").select("id, full_name, headline, location, avatar_url").in("id", otherIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));

  const connections = (rows ?? []).map((r: { id: string; user_id_a: string; user_id_b: string; request_id: string; created_at: string }) => {
    const otherId = r.user_id_a === user.id ? r.user_id_b : r.user_id_a;
    return {
      id: r.id,
      request_id: r.request_id,
      connected_at: r.created_at,
      profile: profileMap.get(otherId) ?? null,
    };
  });

  return NextResponse.json({ connections });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipient_id } = await req.json() as { recipient_id: string };
  if (!recipient_id) return NextResponse.json({ error: "recipient_id required" }, { status: 400 });
  if (recipient_id === user.id) return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Check already connected
  const [a, b] = [user.id, recipient_id].sort();
  const { data: existing } = await sb.from("connections").select("id").eq("user_id_a", a).eq("user_id_b", b).single();
  if (existing) return NextResponse.json({ error: "Already connected" }, { status: 409 });

  // Check existing pending request
  const { data: pending } = await sb
    .from("connection_requests")
    .select("id, status")
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipient_id}),and(sender_id.eq.${recipient_id},recipient_id.eq.${user.id})`)
    .in("status", ["pending"])
    .single();
  if (pending) return NextResponse.json({ error: "Request already exists" }, { status: 409 });

  const { data: request, error } = await sb
    .from("connection_requests")
    .insert({ sender_id: user.id, recipient_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify recipient (fire and forget — ignore errors)
  try {
    await sb.from("notifications").insert({
      user_id: recipient_id,
      type: "connection_request",
      actor_id: user.id,
      entity_id: request.id,
    });
  } catch {
    // non-critical
  }

  return NextResponse.json({ request }, { status: 201 });
}
