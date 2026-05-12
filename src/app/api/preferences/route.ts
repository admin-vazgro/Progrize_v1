import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    industries?: string[];
    topics?: string[];
    job_roles?: string[];
    career_goals?: string[];
    onboarding_completed?: boolean;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { error } = await sb.from("user_preferences").upsert({
    id: crypto.randomUUID(),
    user_id: user.id,
    industries: body.industries ?? [],
    topics: body.topics ?? [],
    job_roles: body.job_roles ?? [],
    career_goals: body.career_goals ?? [],
    onboarding_completed: body.onboarding_completed ?? false,
  }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
