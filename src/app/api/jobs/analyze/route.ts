import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeJobDescription } from "@/lib/ai/analyze-job";
import { computeFitScore } from "@/lib/scoring/fit-score";
import { computeATSScore, getMissingKeywords, getMissingSkills, skillMatches } from "@/lib/scoring/ats-score";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ExperienceRow = Database["public"]["Tables"]["experience_items"]["Row"];
type ProfileSkillRow = { skills: { name: string } | null };

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { job_description, job_url, jobDetails } = await req.json();
    if (!job_description?.trim()) {
      return NextResponse.json({ error: "job_description is required" }, { status: 400 });
    }

    // jobDetails: pre-parsed structured data from /api/jobs/details (optional)
    const structuredSkills: string[] = jobDetails?.required_skills ?? [];
    const structuredNiceToHave: string[] = jobDetails?.nice_to_have ?? [];
    const structuredResponsibilities: string[] = jobDetails?.responsibilities ?? [];
    const structuredKeywords: string[] = jobDetails?.required_skills ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const [{ data: profileRaw }, { data: profileSkillsRaw }, { data: experienceRaw }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", user.id).single() as Promise<{ data: ProfileRow | null }>,
      sb.from("profile_skills").select("*, skills(name)").eq("user_id", user.id) as Promise<{ data: ProfileSkillRow[] | null }>,
      sb.from("experience_items").select("*").eq("user_id", user.id) as Promise<{ data: ExperienceRow[] | null }>,
    ]);

    const profile = profileRaw as ProfileRow | null;

    if (!profile) {
      return NextResponse.json({ error: "Upload and parse your CV first" }, { status: 400 });
    }

    const profileSkillNames = ((profileSkillsRaw ?? []) as ProfileSkillRow[])
      .map((ps) => ps.skills?.name ?? "")
      .filter(Boolean);

    const experience = (experienceRaw ?? []) as ExperienceRow[];
    const jobTitles = experience.map((e) => e.job_title);

    // Parse job description with AI
    const parsedJob = await analyzeJobDescription(job_description);

    // Enrich with structured jobDetails — deduplicate and merge
    if (structuredSkills.length) {
      const existing = new Set(parsedJob.required_skills.map((s) => s.toLowerCase()));
      for (const s of structuredSkills) {
        if (!existing.has(s.toLowerCase())) parsedJob.required_skills.push(s);
      }
    }
    if (structuredNiceToHave.length) {
      const existing = new Set(parsedJob.optional_skills.map((s) => s.toLowerCase()));
      for (const s of structuredNiceToHave) {
        if (!existing.has(s.toLowerCase())) parsedJob.optional_skills.push(s);
      }
    }
    if (structuredResponsibilities.length) {
      const existing = new Set(parsedJob.responsibilities.map((s) => s.toLowerCase()));
      for (const s of structuredResponsibilities) {
        if (!existing.has(s.toLowerCase())) parsedJob.responsibilities.push(s);
      }
    }
    if (structuredKeywords.length) {
      const existing = new Set(parsedJob.keywords.map((s) => s.toLowerCase()));
      for (const s of structuredKeywords) {
        if (!existing.has(s.toLowerCase())) parsedJob.keywords.push(s);
      }
    }

    // Sanitize enum values to match DB check constraints
    const VALID_WORK_MODES = new Set(["remote", "hybrid", "onsite", "unknown"]);
    const VALID_EMPLOYMENT_TYPES = new Set(["full-time", "part-time", "contract", "freelance", "unknown"]);
    const safeWorkMode = VALID_WORK_MODES.has(parsedJob.work_mode ?? "") ? parsedJob.work_mode : null;
    const safeEmploymentType = VALID_EMPLOYMENT_TYPES.has(parsedJob.employment_type ?? "") ? parsedJob.employment_type : null;

    // Save job record
    const { data: jobRaw, error: jobInsertError } = await sb
      .from("jobs")
      .insert({
        id: crypto.randomUUID(),
        source: job_url ? "url" : "paste",
        source_url: job_url ?? null,
        company_name: parsedJob.company_name || "Unknown",
        title: parsedJob.title || "Unknown",
        location: parsedJob.location || null,
        work_mode: safeWorkMode,
        employment_type: safeEmploymentType,
        seniority: parsedJob.seniority || null,
        salary_min: parsedJob.salary_min,
        salary_max: parsedJob.salary_max,
        salary_currency: parsedJob.salary_currency || "USD",
        description_raw: job_description,
        description_clean: parsedJob.summary || null,
        requirements: parsedJob.requirements,
        responsibilities: parsedJob.responsibilities,
        benefits: parsedJob.benefits,
        is_active: true,
      })
      .select()
      .single();

    if (jobInsertError || !jobRaw) {
      console.error("Job insert error:", jobInsertError);
      return NextResponse.json({ error: jobInsertError?.message ?? "Failed to save job" }, { status: 500 });
    }

    const workPrefs = (profile.work_preferences as { remote: boolean; hybrid: boolean; onsite: boolean } | null) ?? {
      remote: false, hybrid: false, onsite: true,
    };

    const fitScore = computeFitScore(
      {
        skills: profileSkillNames,
        years_experience: profile.years_experience ?? 0,
        job_titles: jobTitles,
        location: profile.location ?? "",
        work_preferences: workPrefs,
      },
      parsedJob
    );

    const expItems = experience.map((e) => ({
      achievements: Array.isArray(e.achievements) ? (e.achievements as string[]) : [],
      description: e.description ?? "",
    }));

    const atsScore = computeATSScore(
      {
        skills: profileSkillNames,
        raw_text: [
          profile.summary ?? "",
          ...expItems.map((e) => [e.description, ...e.achievements].join(" ")),
        ].join(" "),
        has_summary: !!profile.summary,
        has_experience: experience.length > 0,
        has_education: true,
        has_skills_section: profileSkillNames.length > 0,
        experience_items: expItems,
        title: jobTitles[0] ?? "",
      },
      parsedJob
    );

    const missingKeywords = getMissingKeywords(
      [profile.summary ?? "", ...expItems.map((e) => e.description)].join(" "),
      parsedJob.keywords
    );

    const missingSkills = getMissingSkills(profileSkillNames, parsedJob.required_skills);
    const matchingSkills = profileSkillNames.filter((s) =>
      parsedJob.required_skills.some((r) => skillMatches(s, r)) ||
      parsedJob.optional_skills.some((r) => skillMatches(s, r))
    );

    const recommendations: string[] = [];
    if (missingKeywords.length > 0) {
      recommendations.push(`Add these keywords to your CV: ${missingKeywords.slice(0, 5).join(", ")}`);
    }
    if (missingSkills.length > 0) {
      recommendations.push(`Highlight or acquire these required skills: ${missingSkills.slice(0, 4).join(", ")}`);
    }
    if (atsScore.measurable_impact < 50) {
      recommendations.push("Add more measurable achievements (numbers, percentages, dollar values)");
    }
    if (atsScore.section_completeness < 80) {
      recommendations.push("Ensure your CV includes a summary, skills section, and education");
    }

    const { data: matchRaw } = await sb
      .from("job_matches")
      .upsert({
        id: crypto.randomUUID(),
        user_id: user.id,
        profile_id: user.id,
        job_id: jobRaw.id,
        fit_score: fitScore.overall,
        ats_score: atsScore.overall,
        skill_overlap_score: fitScore.skill_overlap,
        experience_score: fitScore.experience_relevance,
        title_similarity_score: fitScore.title_similarity,
        seniority_score: fitScore.seniority_match,
        location_score: fitScore.location_match,
        missing_skills: missingSkills,
        missing_keywords: missingKeywords,
        strengths: matchingSkills,
        explanation: { fit: fitScore, ats: atsScore, recommendations },
      }, { onConflict: "profile_id,job_id" })
      .select()
      .single() as { data: { id: string } | null };

    return NextResponse.json({
      jobId: jobRaw.id,
      matchId: matchRaw?.id,
      parsedJob,
      fitScore,
      atsScore,
      missingSkills,
      missingKeywords,
      matchingSkills,
      recommendations,
    });
  } catch (err) {
    console.error("Job analysis error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
