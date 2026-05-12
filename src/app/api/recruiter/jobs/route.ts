import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data, error } = await sb
    .from("job_postings")
    .select("*, companies(id, name, logo_url)")
    .eq("recruiter_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // attach application counts
  const jobIds = (data ?? []).map((j: { id: string }) => j.id);
  let counts: Record<string, number> = {};
  if (jobIds.length > 0) {
    const { data: appData } = await sb
      .from("applications")
      .select("job_posting_id")
      .in("job_posting_id", jobIds);
    (appData ?? []).forEach((a: { job_posting_id: string }) => {
      counts[a.job_posting_id] = (counts[a.job_posting_id] ?? 0) + 1;
    });
  }

  const jobs = (data ?? []).map((j: { id: string }) => ({
    ...j,
    application_count: counts[j.id] ?? 0,
  }));

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await sb
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "No company found" }, { status: 404 });

  const body = await req.json();

  const { data, error } = await sb
    .from("job_postings")
    .insert({
      company_id: membership.company_id,
      recruiter_id: user.id,
      title: body.title,
      location: body.location ?? null,
      work_mode: body.work_mode ?? null,
      employment_type: body.employment_type ?? null,
      seniority: body.seniority ?? null,
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      salary_currency: body.salary_currency ?? "USD",
      description: body.description,
      requirements: body.requirements ?? [],
      required_skills: body.required_skills ?? [],
      nice_to_have_skills: body.nice_to_have_skills ?? [],
      is_active: true,
    })
    .select("*, companies(id, name, logo_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}
