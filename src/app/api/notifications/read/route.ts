import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { all?: boolean; ids?: string[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  if (body.all) {
    await sb.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    return NextResponse.json({ ok: true });
  }

  if (body.ids?.length) {
    await sb.from("notifications").update({ read: true }).eq("user_id", user.id).in("id", body.ids);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Provide ids or all:true" }, { status: 400 });
}
