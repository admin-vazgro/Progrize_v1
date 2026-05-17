import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [] });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Get requester's company to exclude existing members
  const { data: membership } = await sb
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .single();

  let existingMemberIds: string[] = [user.id];
  if (membership?.company_id) {
    const { data: members } = await sb
      .from("company_members")
      .select("user_id")
      .eq("company_id", membership.company_id);
    existingMemberIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
  }

  const { data } = await sb
    .from("profiles")
    .select("id, full_name, headline, avatar_url, email")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .not("id", "in", `(${existingMemberIds.join(",")})`)
    .limit(8);

  return NextResponse.json({ users: data ?? [] });
}
