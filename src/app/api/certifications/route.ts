import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim())
    return NextResponse.json({ error: "Certification name is required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb.from("certifications").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    profile_id: user.id,
    name: body.name.trim(),
    issuer: body.issuer?.trim() || null,
    issue_date: body.issue_date ? `${body.issue_date}-01` : null,
    expiration_date: body.expiration_date ? `${body.expiration_date}-01` : null,
    credential_url: body.credential_url?.trim() || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ certification: data }, { status: 201 });
}
