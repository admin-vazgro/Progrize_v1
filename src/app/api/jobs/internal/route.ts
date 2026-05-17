import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface InternalJob {
  id: string;
  title: string;
  company_name: string;
  company_id: string;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  description: string;
  required_skills: string[];
  posted_at: string;
  source: "progrize";
}

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function postingMatchesSearch(
  posting: {
    title: string;
    location: string | null;
    description: string;
    required_skills: string[];
    work_mode: string | null;
    employment_type: string | null;
  },
  companyName: string,
  keywords: string,
  location: string,
) {
  const terms = normalize(keywords)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);

  const haystack = normalize([
    posting.title,
    companyName,
    posting.location,
    posting.description,
    posting.work_mode,
    posting.employment_type,
    ...(posting.required_skills ?? []),
  ].filter(Boolean).join(" "));

  const keywordMatch = terms.length === 0 || terms.every((term) => haystack.includes(term));
  const locationMatch = !location.trim() || normalize(posting.location).includes(normalize(location));
  return keywordMatch && locationMatch;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const keywords = searchParams.get("keywords") ?? "";
  const location = searchParams.get("location") ?? "";
  const hasSearch = !!keywords.trim() || !!location.trim();

  // Use service client so company names are readable regardless of membership
  const admin = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  // Fetch user profile for relevance matching when no explicit search is provided.
  const [{ data: profile }, { data: skillsRaw }] = hasSearch
    ? [{ data: null }, { data: [] }]
    : await Promise.all([
      sb.from("profiles").select("target_roles, headline").eq("id", user.id).single(),
      sb.from("profile_skills").select("skills(name)").eq("user_id", user.id),
    ]);

  const targetRoles: string[] = (profile?.target_roles ?? []).map((r: string) => r.toLowerCase());
  const userSkills: string[] = ((skillsRaw ?? []) as Array<{ skills: { name: string } | null }>)
    .map((ps) => ps.skills?.name?.toLowerCase() ?? "").filter(Boolean);

  // Significant words from target roles (length > 3 to skip filler words like "and", "the")
  const roleWords = [...new Set(
    targetRoles.flatMap((r) => r.split(/\s+/).filter((w) => w.length > 3))
  )];
  // Also include significant headline words as fallback when no target roles set
  const headlineWords = (profile?.headline ?? "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

  const { data: postings, error } = await sb
    .from("job_postings")
    .select("id, company_id, title, location, work_mode, employment_type, seniority, salary_min, salary_max, salary_currency, description, required_skills, posted_at")
    .eq("is_active", true)
    .order("posted_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!postings?.length) return NextResponse.json({ jobs: [] });

  type RawPosting = {
    id: string; company_id: string; title: string; location: string | null;
    work_mode: string | null; employment_type: string | null; seniority: string | null;
    salary_min: number | null; salary_max: number | null; salary_currency: string;
    description: string; required_skills: string[]; posted_at: string;
  };

  // Score each posting by how well it matches the user's role.
  // Title must contain a role keyword — skill overlap alone is not enough.
  function scorePosting(p: RawPosting): number {
    const titleLower = p.title.toLowerCase();
    const jobSkills = (p.required_skills ?? []).map((s: string) => s.toLowerCase());

    // Primary: role keyword must appear in title
    const titleWords = roleWords.length > 0 ? roleWords : headlineWords;
    const titleMatch = titleWords.some((word: string) => titleLower.includes(word));
    if (!titleMatch) return 0;

    let score = 5; // base for title match
    // Boost for skill overlap (exact match only to avoid false positives)
    for (const skill of userSkills) {
      if (jobSkills.includes(skill)) score += 1;
    }
    return score;
  }

  // Fetch company names
  const companyIds = [...new Set((postings as RawPosting[]).map((p) => p.company_id))];
  const { data: companies } = await sb
    .from("companies")
    .select("id, name")
    .in("id", companyIds);

  const companyMap = Object.fromEntries(
    ((companies ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name])
  );

  const searchedPostings = hasSearch
    ? (postings as RawPosting[]).filter((p) => postingMatchesSearch(p, companyMap[p.company_id] ?? "", keywords, location))
    : null;

  // Sort by relevance score descending; only keep jobs with at least some relevance
  // when the user has a profile. Fall back to recent jobs if no profile data.
  const scored = ((searchedPostings ?? postings) as RawPosting[])
    .map((p) => ({ p, score: scorePosting(p) }))
    .sort((a, b) => b.score - a.score || new Date(b.p.posted_at).getTime() - new Date(a.p.posted_at).getTime());

  // Only show jobs that score > 0 when user has a profile; show nothing rather than irrelevant jobs.
  // Only fall back to recent jobs when the user has no profile data at all.
  const hasProfile = targetRoles.length > 0 || userSkills.length > 0;
  const finalPostings = hasSearch
    ? scored.map((x) => x.p).slice(0, 30)
    : hasProfile
    ? scored.filter((x) => x.score > 0).map((x) => x.p).slice(0, 20)
    : scored.slice(0, 20).map((x) => x.p);

  const jobs: InternalJob[] = finalPostings.map((p) => ({
    id: p.id,
    title: p.title,
    company_name: companyMap[p.company_id] ?? "Unknown",
    company_id: p.company_id,
    location: p.location,
    work_mode: p.work_mode,
    employment_type: p.employment_type,
    seniority: p.seniority,
    salary_min: p.salary_min,
    salary_max: p.salary_max,
    salary_currency: p.salary_currency ?? "USD",
    description: p.description,
    required_skills: (p.required_skills as string[]) ?? [],
    posted_at: p.posted_at,
    source: "progrize",
  }));

  return NextResponse.json({ jobs });
}
