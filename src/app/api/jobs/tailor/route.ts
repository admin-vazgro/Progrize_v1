import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tailorCV } from "@/lib/ai/tailor-cv";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ExperienceRow = Database["public"]["Tables"]["experience_items"]["Row"];
type EducationRow = Database["public"]["Tables"]["education_items"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId, jobDetails } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const [{ data: profileRaw }, { data: experienceRaw }, { data: educationRaw }, { data: skillsRaw }, { data: jobRaw }] =
      await Promise.all([
        sb.from("profiles").select("*").eq("id", user.id).single() as Promise<{ data: ProfileRow | null }>,
        sb.from("experience_items").select("*").eq("user_id", user.id).order("sort_order") as Promise<{ data: ExperienceRow[] | null }>,
        sb.from("education_items").select("*").eq("user_id", user.id) as Promise<{ data: EducationRow[] | null }>,
        sb.from("profile_skills").select("*, skills(name, category)").eq("user_id", user.id) as Promise<{ data: Array<{ skills: { name: string; category: string | null } | null; level: string | null; years_used: number | null }> | null }>,
        sb.from("jobs").select("*").eq("id", jobId).single() as Promise<{ data: JobRow | null }>,
      ]);

    const profile = profileRaw as ProfileRow | null;
    const job = jobRaw as JobRow | null;

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const profileJson = {
      ...profile,
      experience: experienceRaw ?? [],
      education: educationRaw ?? [],
      skills: (skillsRaw ?? []).map((ps) => ({
        name: ps.skills?.name,
        category: ps.skills?.category,
        level: ps.level,
        years_used: ps.years_used,
      })),
    };

    const parsedJobJson = {
      title: job.title,
      company_name: job.company_name,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
    };

    const tailored = await tailorCV({
      profileJson,
      jobDescription: job.description_raw,
      parsedJobJson,
      jobDetails: jobDetails ?? null,
    });

    const { data: tailoredResumeRaw } = await sb
      .from("tailored_resumes")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        profile_id: user.id,
        job_id: jobId,
        version_name: `${job.title} — ${job.company_name}`,
        content_json: tailored,
      })
      .select()
      .single() as { data: { id: string } | null };

    return NextResponse.json({ tailored, tailoredResumeId: tailoredResumeRaw?.id });
  } catch (err) {
    console.error("Tailor CV error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
