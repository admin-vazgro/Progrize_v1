import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { skillMatches } from "@/lib/scoring/ats-score";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // verify recruiter owns this job
  const { data: job } = await sb
    .from("job_postings")
    .select("id, recruiter_id, title, required_skills")
    .eq("id", id)
    .single();

  if (!job || job.recruiter_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // get all applications for this job with applicant profiles
  const { data: applications, error } = await sb
    .from("applications")
    .select(`
      id,
      status,
      fit_score,
      ats_score,
      cover_note,
      recruiter_notes,
      applied_at,
      updated_at,
      applicant_id
    `)
    .eq("job_posting_id", id)
    .order("applied_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const applicantIds = (applications ?? []).map((a: { applicant_id: string }) => a.applicant_id);

  let profileMap: Record<string, unknown> = {};
  let skillsMap: Record<string, string[]> = {};

  if (applicantIds.length > 0) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("id, full_name, headline, location, email, avatar_url, years_experience, summary")
      .in("id", applicantIds);

    (profiles ?? []).forEach((p: { id: string }) => {
      profileMap[p.id] = p;
    });

    // get skills for each applicant
    const { data: profileSkills } = await sb
      .from("profile_skills")
      .select("user_id, skills(name)")
      .in("user_id", applicantIds);

    (profileSkills ?? []).forEach((ps: { user_id: string; skills: { name: string } }) => {
      if (!skillsMap[ps.user_id]) skillsMap[ps.user_id] = [];
      if (ps.skills?.name) skillsMap[ps.user_id].push(ps.skills.name);
    });
  }

  const requiredSkills = (job.required_skills ?? []) as string[];

  const enriched = (applications ?? []).map((app: {
    applicant_id: string;
    fit_score: number | null;
    ats_score: number | null;
  }) => {
    const profile = profileMap[app.applicant_id] as { id: string; full_name: string | null; headline: string | null; location: string | null; email: string | null; avatar_url: string | null; years_experience: number | null; summary: string | null } | undefined;
    const skills = skillsMap[app.applicant_id] ?? [];

    // compute fit score using fuzzy skillMatches (handles synonyms, partials)
    const matchingSkills = requiredSkills.filter((r) => skills.some((s) => skillMatches(s, r)));
    const missingSkills = requiredSkills.filter((r) => !skills.some((s) => skillMatches(s, r)));

    let fitScore = app.fit_score;
    if (fitScore === null && requiredSkills.length > 0) {
      fitScore = Math.round((matchingSkills.length / requiredSkills.length) * 100);
    }

    return {
      ...app,
      fit_score: fitScore,
      applicant: profile ? { ...profile, skills } : null,
      matching_skills: matchingSkills,
      missing_skills: missingSkills,
    };
  });

  return NextResponse.json({ applications: enriched, job });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const body = await req.json();
  const { application_id, status, recruiter_notes } = body;

  // verify recruiter owns the job
  const { data: job } = await sb
    .from("job_postings")
    .select("recruiter_id")
    .eq("id", id)
    .single();

  if (!job || job.recruiter_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) update.status = status;
  if (recruiter_notes !== undefined) update.recruiter_notes = recruiter_notes;

  const { data, error } = await sb
    .from("applications")
    .update(update)
    .eq("id", application_id)
    .eq("job_posting_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}
