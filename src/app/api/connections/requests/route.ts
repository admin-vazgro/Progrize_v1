import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: requests, error } = await sb
    .from("connection_requests")
    .select("id, sender_id, recipient_id, status, created_at")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = requests ?? [];
  const received = rows.filter((r: { recipient_id: string }) => r.recipient_id === user.id);
  const sent = rows.filter((r: { sender_id: string }) => r.sender_id === user.id);

  // Fetch profiles for all actors
  const actorIds = [...new Set([
    ...received.map((r: { sender_id: string }) => r.sender_id),
    ...sent.map((r: { recipient_id: string }) => r.recipient_id),
  ])];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createServiceClient() as any;
  const { data: profiles } = actorIds.length
    ? await admin.from("profiles").select("id, full_name, headline, avatar_url, location").in("id", actorIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));

  const enrich = (req: { id: string; sender_id: string; recipient_id: string; created_at: string }, actorId: string) => ({
    id: req.id,
    created_at: req.created_at,
    profile: profileMap.get(actorId) ?? null,
  });

  return NextResponse.json({
    received: received.map((r: { id: string; sender_id: string; recipient_id: string; created_at: string }) => enrich(r, r.sender_id)),
    sent: sent.map((r: { id: string; sender_id: string; recipient_id: string; created_at: string }) => enrich(r, r.recipient_id)),
  });
}
