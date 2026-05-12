import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread_only") === "true";

  let query = sb
    .from("notifications")
    .select("id, type, actor_id, entity_id, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (unreadOnly) query = query.eq("read", false);

  const { data: notifications, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = notifications ?? [];
  const actorIds = [...new Set(rows.map((n: { actor_id: string }) => n.actor_id).filter(Boolean))];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createServiceClient() as any;
  const { data: profiles } = actorIds.length
    ? await admin.from("profiles").select("id, full_name, avatar_url, headline").in("id", actorIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));

  const enriched = rows.map((n: Record<string, unknown>) => ({
    ...n,
    actor: profileMap.get(n.actor_id as string) ?? null,
  }));

  const { count: unreadCount } = await sb
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return NextResponse.json({ notifications: enriched, unread_count: unreadCount ?? 0 });
}
