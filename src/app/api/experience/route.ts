import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.job_title?.trim() || !body.company_name?.trim())
    return NextResponse.json({ error: "job_title and company_name are required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb.from("experience_items").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    profile_id: user.id,
    company_name: body.company_name.trim(),
    job_title: body.job_title.trim(),
    start_date: body.start_date ? `${body.start_date}-01` : null,
    end_date: body.is_current ? null : body.end_date ? `${body.end_date}-01` : null,
    is_current: body.is_current ?? false,
    location: body.location?.trim() || null,
    description: body.description?.trim() || null,
    achievements: body.achievements?.length ? body.achievements : null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ experience: data }, { status: 201 });
}
