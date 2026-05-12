import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { skill } = await req.json();
  if (!skill?.trim()) return NextResponse.json({ error: "skill required" }, { status: 400 });

  const name = skill.trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  let { data: skillRow } = await sb.from("skills").select("id").ilike("name", name).single();
  if (!skillRow) {
    const { data: newSkill, error: insertErr } = await sb
      .from("skills")
      .insert({ id: crypto.randomUUID(), name })
      .select("id")
      .single();
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });
    skillRow = newSkill;
  }

  const { data: existing } = await sb
    .from("profile_skills")
    .select("id")
    .eq("user_id", user.id)
    .eq("skill_id", skillRow.id)
    .single();

  if (!existing) {
    const { error: psErr } = await sb.from("profile_skills").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      profile_id: user.id,
      skill_id: skillRow.id,
    });
    if (psErr) return NextResponse.json({ error: psErr.message }, { status: 400 });
  }

  return NextResponse.json({ skill: name });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { skill } = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: skillRow } = await sb.from("skills").select("id").ilike("name", skill).single();
  if (!skillRow) return NextResponse.json({ ok: true });

  const { error } = await sb.from("profile_skills").delete().eq("user_id", user.id).eq("skill_id", skillRow.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
