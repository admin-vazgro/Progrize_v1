import type { ParsedJob } from "@/types/job";
import type { ATSScore } from "@/types/scoring";

interface ResumeData {
  skills: string[];
  raw_text: string;
  has_summary: boolean;
  has_experience: boolean;
  has_education: boolean;
  has_skills_section: boolean;
  experience_items: Array<{ achievements: string[]; description: string }>;
  title: string;
}

function normalizeTech(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\.js$/i, "")         // react.js → react
    .replace(/\.ts$/i, "")         // angular.ts → angular
    .replace(/\.net\b/i, " dotnet")
    .replace(/\s*[\/\\|&,]\s*.+$/, "") // "TypeScript/JavaScript" → "TypeScript"
    .replace(/\s+/g, " ")
    .trim();
}

export function skillMatches(a: string, b: string): boolean {
  const na = normalizeTech(a);
  const nb = normalizeTech(b);
  if (na === nb) return true;
  // Partial containment (min length 3 prevents noise from "go", "r", etc.)
  if (na.length >= 3 && nb.includes(na)) return true;
  if (nb.length >= 3 && na.includes(nb)) return true;
  return false;
}

function keywordCoverage(rawText: string, keywords: string[]): number {
  if (!keywords.length) return 80;
  const lower = rawText.toLowerCase();
  const found = keywords.filter((k) => {
    const nk = normalizeTech(k);
    return lower.includes(nk) || lower.includes(k.toLowerCase().trim());
  }).length;
  return Math.round((found / keywords.length) * 100);
}

function requiredSkillCoverage(profileSkills: string[], required: string[]): number {
  if (!required.length) return 80;
  const found = required.filter((r) =>
    profileSkills.some((ps) => skillMatches(ps, r))
  ).length;
  return Math.round((found / required.length) * 100);
}

function sectionCompleteness(data: ResumeData): number {
  const sections = [
    data.has_summary,
    data.has_experience,
    data.has_education,
    data.has_skills_section,
    !!data.title,
  ];
  return Math.round((sections.filter(Boolean).length / sections.length) * 100);
}

function measurableImpact(experience: ResumeData["experience_items"]): number {
  if (!experience.length) return 0;
  const metricPattern = /\d+%|\$[\d,]+|£[\d,]+|€[\d,]+|\d+x|\d+ (million|thousand|users|customers|clients|team|projects|engineers|repos|deployments)/i;
  let bulletsWithMetrics = 0;
  let totalBullets = 0;

  for (const item of experience) {
    const bullets = item.achievements ?? [];
    totalBullets += bullets.length;
    bulletsWithMetrics += bullets.filter((b) => metricPattern.test(b)).length;
  }

  if (!totalBullets) return 30;
  return Math.min(100, Math.round((bulletsWithMetrics / totalBullets) * 100) + 20);
}

function titleAlignment(resumeTitle: string, jobTitle: string): number {
  const rt = resumeTitle.toLowerCase();
  const jt = jobTitle.toLowerCase();
  if (!rt) return 30;
  if (rt === jt) return 100;
  if (rt.includes(jt) || jt.includes(rt)) return 82;
  const rtWords = new Set(rt.split(/\s+/));
  const jtWords = jt.split(/\s+/).filter((w) => w.length > 2);
  const overlap = jtWords.filter((w) => rtWords.has(w)).length;
  if (overlap > 0) return Math.min(70, overlap * 22 + 28);
  return 20;
}

export function computeATSScore(resume: ResumeData, job: ParsedJob): ATSScore {
  const kc = keywordCoverage(resume.raw_text, job.keywords);
  const rsc = requiredSkillCoverage(resume.skills, job.required_skills);
  const sc = sectionCompleteness(resume);
  const mi = measurableImpact(resume.experience_items);
  const ta = titleAlignment(resume.title, job.title);

  const weights = { kc: 0.25, rsc: 0.30, sc: 0.15, mi: 0.15, ta: 0.15 };
  const overall = Math.round(
    kc * weights.kc +
    rsc * weights.rsc +
    sc * weights.sc +
    mi * weights.mi +
    ta * weights.ta
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    keyword_coverage: kc,
    required_skill_coverage: rsc,
    section_completeness: sc,
    measurable_impact: mi,
    role_title_alignment: ta,
  };
}

export function getMissingKeywords(rawText: string, keywords: string[]): string[] {
  const lower = rawText.toLowerCase();
  return keywords.filter((k) => {
    const nk = normalizeTech(k);
    return !lower.includes(nk) && !lower.includes(k.toLowerCase().trim());
  });
}

export function getMissingSkills(profileSkills: string[], required: string[]): string[] {
  return required.filter((r) => !profileSkills.some((ps) => skillMatches(ps, r)));
}
