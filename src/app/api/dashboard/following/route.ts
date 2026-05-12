import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createServiceClient() as any;

  const { data: follows } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id);
  if (!ids.length) return NextResponse.json({ people: [] });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, headline, avatar_url")
    .in("id", ids);

  return NextResponse.json({ people: profiles ?? [] });
}
