import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

  let query = sb
    .from("companies")
    .select("id, name, industry, location, logo_url, website, size, description")
    .limit(limit);

  if (q.trim()) {
    query = query.or(`name.ilike.%${q}%,industry.ilike.%${q}%,location.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ companies: data ?? [] });
}
