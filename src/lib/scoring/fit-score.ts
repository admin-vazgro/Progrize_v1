import type { ParsedJob } from "@/types/job";
import type { FitScore } from "@/types/scoring";

interface ProfileData {
  skills: string[];
  years_experience: number;
  job_titles: string[];
  location: string;
  work_preferences: { remote: boolean; hybrid: boolean; onsite: boolean };
}

function overlap(a: string[], b: string[]): number {
  const normalise = (s: string) => s.toLowerCase().trim();
  const setA = new Set(a.map(normalise));
  if (setA.size === 0 || b.length === 0) return 0;
  const matches = b.filter((s) => setA.has(normalise(s))).length;
  return Math.min(100, (matches / b.length) * 100);
}

function titleSimilarity(profileTitles: string[], jobTitle: string): number {
  const jt = jobTitle.toLowerCase();
  for (const t of profileTitles) {
    const pt = t.toLowerCase();
    if (pt === jt) return 100;
    if (pt.includes(jt) || jt.includes(pt)) return 75;
    const ptWords = new Set(pt.split(/\s+/));
    const jtWords = jt.split(/\s+/);
    const common = jtWords.filter((w) => ptWords.has(w)).length;
    if (common > 0) return Math.min(60, (common / jtWords.length) * 80);
  }
  return 20;
}

function experienceScore(profileYears: number, requiredYears: number | null): number {
  if (!requiredYears) return 70;
  if (profileYears >= requiredYears) return 100;
  if (profileYears >= requiredYears * 0.75) return 80;
  if (profileYears >= requiredYears * 0.5) return 55;
  return 30;
}

function locationScore(
  profileLocation: string,
  jobLocation: string,
  jobMode: string,
  prefs: { remote: boolean; hybrid: boolean; onsite: boolean }
): number {
  if (jobMode === "remote") return prefs.remote ? 100 : 80;
  if (jobMode === "hybrid") return prefs.hybrid ? 100 : 70;

  const pl = profileLocation.toLowerCase();
  const jl = jobLocation.toLowerCase();
  if (!pl || !jl) return 60;
  if (pl.includes(jl) || jl.includes(pl)) return 100;
  return prefs.onsite ? 50 : 30;
}

export function computeFitScore(profile: ProfileData, job: ParsedJob): FitScore {
  const skillOverlap = Math.round(
    overlap(profile.skills, job.required_skills) * 0.7 +
    overlap(profile.skills, job.optional_skills) * 0.3
  );
  const expScore = experienceScore(profile.years_experience, job.years_experience_required);
  const titleScore = Math.round(titleSimilarity(profile.job_titles, job.title));
  const locScore = locationScore(
    profile.location,
    job.location,
    job.work_mode,
    profile.work_preferences
  );

  const weights = { skill: 0.35, experience: 0.25, title: 0.20, location: 0.20 };
  const overall = Math.round(
    skillOverlap * weights.skill +
    expScore * weights.experience +
    titleScore * weights.title +
    locScore * weights.location
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    skill_overlap: skillOverlap,
    experience_relevance: expScore,
    title_similarity: titleScore,
    seniority_match: 70,
    location_match: locScore,
    semantic_similarity: 0,
  };
}
