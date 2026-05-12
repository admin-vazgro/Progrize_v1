import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { skillMatches } from "@/lib/scoring/ats-score";

// Returns candidate suggestions for the recruiter's active jobs
// Uses fuzzy skillMatches so "UI/UX" matches "User Interface Design" etc.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id");
  const limit = parseInt(url.searchParams.get("limit") ?? "20");

  // get recruiter's active jobs (or a specific one)
  let jobQuery = sb
    .from("job_postings")
    .select("id, title, required_skills, nice_to_have_skills")
    .eq("recruiter_id", user.id)
    .eq("is_active", true);

  if (jobId) jobQuery = jobQuery.eq("id", jobId);
  const { data: jobs } = await jobQuery.limit(5);

  if (!jobs || jobs.length === 0) return NextResponse.json({ suggestions: [] });

  const allRequiredSkills = Array.from(
    new Set(jobs.flatMap((j: { required_skills: string[] }) => j.required_skills ?? []))
  ) as string[];

  if (allRequiredSkills.length === 0) return NextResponse.json({ suggestions: [] });

  // Fetch ALL profile skills — JS-side fuzzy matching replaces the exact SQL IN lookup
  const { data: profileSkillRows } = await sb
    .from("profile_skills")
    .select("user_id, skills(name)");

  // group by user
  const userSkillMap: Record<string, string[]> = {};
  (profileSkillRows ?? []).forEach((row: { user_id: string; skills: { name: string } | null }) => {
    if (!userSkillMap[row.user_id]) userSkillMap[row.user_id] = [];
    if (row.skills?.name) userSkillMap[row.user_id].push(row.skills.name);
  });

  // Filter to users who match at least one required skill (fuzzy), excluding the recruiter
  const candidateIds = Object.keys(userSkillMap).filter((uid) => {
    if (uid === user.id) return false;
    const skills = userSkillMap[uid];
    return allRequiredSkills.some((r) => skills.some((s) => skillMatches(s, r)));
  });

  if (candidateIds.length === 0) return NextResponse.json({ suggestions: [] });

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name, headline, location, email, avatar_url, years_experience, summary")
    .in("id", candidateIds)
    .eq("user_type", "jobseeker");

  const suggestions = (profiles ?? []).flatMap((profile: {
    id: string;
    full_name: string | null;
    headline: string | null;
    location: string | null;
    email: string | null;
    avatar_url: string | null;
    years_experience: number | null;
    summary: string | null;
  }) => {
    const skills = userSkillMap[profile.id] ?? [];

    return jobs.map((job: { id: string; title: string; required_skills: string[]; nice_to_have_skills: string[] }) => {
      const required = (job.required_skills ?? []) as string[];
      const niceToHave = (job.nice_to_have_skills ?? []) as string[];

      if (required.length === 0) return null;

      const matchingRequired = required.filter((r) => skills.some((s) => skillMatches(s, r)));
      const matchingNice = niceToHave.filter((r) => skills.some((s) => skillMatches(s, r)));
      const missing = required.filter((r) => !skills.some((s) => skillMatches(s, r)));

      const fitScore = Math.round(
        (matchingRequired.length / required.length) * 80 +
        (niceToHave.length > 0 ? (matchingNice.length / niceToHave.length) * 20 : 20)
      );

      if (fitScore < 20) return null;

      return {
        profile: { ...profile, skills },
        fit_score: fitScore,
        matching_skills: matchingRequired,
        missing_skills: missing,
        job_posting_id: job.id,
        job_title: job.title,
      };
    }).filter(Boolean);
  });

  const sorted = suggestions
    .sort((a: { fit_score: number }, b: { fit_score: number }) => b.fit_score - a.fit_score)
    .slice(0, limit);

  return NextResponse.json({ suggestions: sorted });
}
