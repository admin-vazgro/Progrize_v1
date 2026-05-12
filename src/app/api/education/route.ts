import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.institution?.trim())
    return NextResponse.json({ error: "institution is required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb.from("education_items").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    profile_id: user.id,
    institution: body.institution.trim(),
    degree: body.degree?.trim() || null,
    field_of_study: body.field_of_study?.trim() || null,
    start_date: body.start_date ? `${body.start_date}-01` : null,
    end_date: body.end_date ? `${body.end_date}-01` : null,
    description: body.description?.trim() || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ education: data }, { status: 201 });
}
