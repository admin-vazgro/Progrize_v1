import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { id } = await params;

  const [
    { data: company },
    { data: jobs },
    { data: posts },
    { count: memberCount },
  ] = await Promise.all([
    sb.from("companies").select("*").eq("id", id).single(),
    sb.from("job_postings")
      .select("id, title, location, work_mode, employment_type, seniority, posted_at")
      .eq("company_id", id)
      .eq("is_active", true)
      .order("posted_at", { ascending: false })
      .limit(20),
    sb.from("company_posts")
      .select("id, title, content, post_type, image_urls, created_at, profiles!author_id(full_name, avatar_url)")
      .eq("company_id", id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(10),
    sb.from("company_members")
      .select("*", { count: "exact", head: true })
      .eq("company_id", id),
  ]);

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  return NextResponse.json({
    company,
    jobs: jobs ?? [],
    posts: (posts ?? []).map((p: {
      profiles: unknown;
      [key: string]: unknown;
    }) => ({ ...p, author: p.profiles, profiles: undefined })),
    member_count: memberCount ?? 0,
  });
}
