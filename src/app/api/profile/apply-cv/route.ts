import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toDate(val: string | null | undefined): string | null {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (/^\d{4}-\d{2}$/.test(val)) return `${val}-01`;
  if (/^\d{4}$/.test(val)) return `${val}-01-01`;
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { profile, skills, experience, education } = await req.json();

  // 1. Profile fields
  if (profile && Object.keys(profile).length > 0) {
    const patch: Record<string, unknown> = { id: user.id };
    for (const key of ["full_name", "headline", "location"] as const) {
      if (profile[key]) patch[key] = profile[key];
    }
    await sb.from("profiles").upsert(patch);
  }

  // 2. Skills — replace entirely
  if (Array.isArray(skills) && skills.length > 0) {
    await sb.from("profile_skills").delete().eq("user_id", user.id);
    for (const name of skills as string[]) {
      if (!name?.trim()) continue;
      let { data: skillRow } = await sb
        .from("skills").select("id").ilike("name", name.trim()).single();
      if (!skillRow) {
        const { data: newSkill } = await sb
          .from("skills")
          .insert({ id: crypto.randomUUID(), name: name.trim() })
          .select("id").single();
        skillRow = newSkill;
      }
      if (skillRow?.id) {
        await sb.from("profile_skills").insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          profile_id: user.id,
          skill_id: skillRow.id,
        });
      }
    }
  }

  // 3. Experience — replace entirely
  if (Array.isArray(experience) && experience.length > 0) {
    await sb.from("experience_items").delete().eq("user_id", user.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (experience as any[])
      .filter((e) => e.job_title && e.company_name)
      .map((e, i) => ({
        id: crypto.randomUUID(),
        user_id: user.id,
        profile_id: user.id,
        job_title: e.job_title,
        company_name: e.company_name,
        start_date: toDate(e.start_date),
        end_date: e.is_current ? null : toDate(e.end_date),
        is_current: e.is_current ?? false,
        location: e.location || null,
        description: e.description || null,
        achievements: Array.isArray(e.achievements) && e.achievements.length > 0 ? e.achievements : null,
        sort_order: i,
      }));
    if (rows.length > 0) await sb.from("experience_items").insert(rows);
  }

  // 4. Education — replace entirely
  if (Array.isArray(education) && education.length > 0) {
    await sb.from("education_items").delete().eq("user_id", user.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (education as any[])
      .filter((e) => e.institution)
      .map((e) => ({
        id: crypto.randomUUID(),
        user_id: user.id,
        profile_id: user.id,
        institution: e.institution,
        degree: e.degree || null,
        field_of_study: e.field_of_study || null,
        start_date: toDate(e.start_date),
        end_date: toDate(e.end_date),
      }));
    if (rows.length > 0) await sb.from("education_items").insert(rows);
  }

  return NextResponse.json({ ok: true });
}
