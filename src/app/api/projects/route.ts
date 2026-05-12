import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title?.trim())
    return NextResponse.json({ error: "Project title is required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb.from("profile_projects").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    profile_id: user.id,
    title: body.title.trim(),
    description: body.description?.trim() || null,
    image_url: body.image_url?.trim() || null,
    project_url: body.project_url?.trim() || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ project: data }, { status: 201 });
}
