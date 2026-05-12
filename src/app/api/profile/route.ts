import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["full_name", "headline", "location", "portfolio_url", "summary", "linkedin_url", "phone", "avatar_url", "cover_url"];
  const arrayFields = ["target_roles"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key] || null;
  }
  for (const key of arrayFields) {
    if (key in body) update[key] = Array.isArray(body[key]) ? body[key] : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb.from("profiles").upsert({ id: user.id, ...update }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}
