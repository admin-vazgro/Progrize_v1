import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET — return job_posting_ids the current user has applied to
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("applications")
    .select("job_posting_id")
    .eq("applicant_id", user.id);

  return NextResponse.json({ applied: (data ?? []).map((r: { job_posting_id: string }) => r.job_posting_id) });
}

// POST — apply to a job posting
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { job_posting_id, cover_note, cv_name } = await req.json();
  if (!job_posting_id) return NextResponse.json({ error: "job_posting_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Insert into recruiter-side applications table
  const { error } = await sb.from("applications").insert({
    job_posting_id,
    applicant_id: user.id,
    cover_note: cover_note ?? null,
    status: "applied",
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, already_applied: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Use service client so company name is readable regardless of the applicant's membership
  const admin = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminSb = admin as any;

  const { data: posting } = await adminSb
    .from("job_postings")
    .select("title, location, salary_min, salary_max, salary_currency, company_id")
    .eq("id", job_posting_id)
    .single();

  if (posting) {
    const { data: company } = await adminSb
      .from("companies")
      .select("name")
      .eq("id", posting.company_id)
      .single();

    const sym = posting.salary_currency === "GBP" ? "£" : posting.salary_currency === "EUR" ? "€" : "$";
    const salaryRange = posting.salary_min && posting.salary_max
      ? `${sym}${Math.round(posting.salary_min / 1000)}k–${sym}${Math.round(posting.salary_max / 1000)}k`
      : null;

    // Mirror into job_applications so it appears in the job seeker tracker + dashboard
    await sb.from("job_applications").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      job_title: posting.title,
      company_name: company?.name ?? "Unknown",
      source_url: null,
      location: posting.location ?? null,
      salary_range: salaryRange,
      notes: `Applied via Progrize — job_posting_id: ${job_posting_id}${cv_name ? ` · cv: ${cv_name}` : ""}`,
      status: "applied",
      applied_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
