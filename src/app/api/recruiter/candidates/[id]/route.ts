import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [
    { data: profile },
    { data: skills },
    { data: experience },
    { data: education },
  ] = await Promise.all([
    sb.from("profiles").select("id, full_name, headline, location, email, avatar_url, years_experience, summary, target_roles").eq("id", id).single(),
    sb.from("profile_skills").select("level, years_used, skills(name, category)").eq("user_id", id),
    sb.from("experience_items").select("*").eq("user_id", id).order("start_date", { ascending: false }),
    sb.from("education_items").select("*").eq("user_id", id).order("start_date", { ascending: false }),
  ]);

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    profile: {
      ...profile,
      skills: (skills ?? []).map((s: { skills: { name: string; category: string }; level: string; years_used: number }) => ({
        name: s.skills?.name,
        category: s.skills?.category,
        level: s.level,
        years_used: s.years_used,
      })),
      experience: experience ?? [],
      education: education ?? [],
    },
  });
}
