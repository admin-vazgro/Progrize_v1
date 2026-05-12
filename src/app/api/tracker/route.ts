import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data, error } = await sb
    .from("job_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    job_title: string;
    company_name: string;
    source_url?: string;
    location?: string;
    salary_range?: string;
    notes?: string;
    status?: string;
  };

  if (!body.job_title?.trim() || !body.company_name?.trim()) {
    return NextResponse.json({ error: "job_title and company_name are required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data, error } = await sb
    .from("job_applications")
    .insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      job_title: body.job_title.trim(),
      company_name: body.company_name.trim(),
      source_url: body.source_url ?? null,
      location: body.location ?? null,
      salary_range: body.salary_range ?? null,
      notes: body.notes ?? null,
      status: body.status ?? "saved",
      applied_at: body.status === "applied" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data }, { status: 201 });
}
