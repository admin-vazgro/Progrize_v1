import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function syncConnectionCounts(sb: any, id1: string, id2: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [{ count: c1 }, { count: c2 }] = await Promise.all([
    sb.from("connections").select("*", { count: "exact", head: true }).or(`user_id_a.eq.${id1},user_id_b.eq.${id1}`),
    sb.from("connections").select("*", { count: "exact", head: true }).or(`user_id_a.eq.${id2},user_id_b.eq.${id2}`),
  ]);
  await Promise.all([
    sb.from("profiles").update({ connection_count: c1 ?? 0 }).eq("id", id1),
    sb.from("profiles").update({ connection_count: c2 ?? 0 }).eq("id", id2),
  ]);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action } = await req.json() as { action: "accept" | "reject" | "withdraw" | "remove" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: request } = await sb
    .from("connection_requests")
    .select("id, sender_id, recipient_id, status")
    .eq("id", id)
    .single();

  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const isSender = request.sender_id === user.id;
  const isRecipient = request.recipient_id === user.id;
  if (!isSender && !isRecipient) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  if (action === "accept") {
    if (!isRecipient) return NextResponse.json({ error: "Only recipient can accept" }, { status: 403 });

    await sb.from("connection_requests").update({ status: "accepted" }).eq("id", id);

    const [a, b] = [request.sender_id, request.recipient_id].sort();
    const { data: conn } = await sb
      .from("connections")
      .insert({ user_id_a: a, user_id_b: b, request_id: id })
      .select("id")
      .single();

    await syncConnectionCounts(sb, request.sender_id, request.recipient_id);

    // Notify sender (fire and forget)
    try {
      await sb.from("notifications").insert({
        user_id: request.sender_id,
        type: "connection_accepted",
        actor_id: user.id,
        entity_id: conn?.id,
      });
    } catch {
      // non-critical
    }

    return NextResponse.json({ status: "accepted" });
  }

  if (action === "reject") {
    if (!isRecipient) return NextResponse.json({ error: "Only recipient can reject" }, { status: 403 });
    await sb.from("connection_requests").update({ status: "rejected" }).eq("id", id);
    return NextResponse.json({ status: "rejected" });
  }

  if (action === "withdraw") {
    if (!isSender) return NextResponse.json({ error: "Only sender can withdraw" }, { status: 403 });
    await sb.from("connection_requests").update({ status: "withdrawn" }).eq("id", id);
    return NextResponse.json({ status: "withdrawn" });
  }

  if (action === "remove") {
    const [a, b] = [request.sender_id, request.recipient_id].sort();
    await sb.from("connections").delete().eq("user_id_a", a).eq("user_id_b", b);
    await sb.from("connection_requests").update({ status: "withdrawn" }).eq("id", id);
    await syncConnectionCounts(sb, request.sender_id, request.recipient_id);
    return NextResponse.json({ status: "removed" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
