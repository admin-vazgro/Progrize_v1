import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCompanyPermission } from "@/lib/company-permissions";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";
import { normalizePostContent, richTextToPlainText, sanitizeRichText } from "@/lib/rich-text";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions");

  if (!membership) return NextResponse.json({ error: "Not a company member" }, { status: 404 });

  const { data: company } = await sb
    .from("companies")
    .select("name, logo_url")
    .eq("id", membership.company_id)
    .single();

  const { data: postsData, error } = await sb
    .from("company_posts")
    .select("*")
    .eq("company_id", membership.company_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch author profiles separately (author_id → auth.users, not directly to profiles)
  const authorIds = [...new Set((postsData ?? []).map((p: { author_id: string }) => p.author_id))] as string[];
  type Profile = { id: string; full_name: string | null; avatar_url: string | null; headline: string | null };
  const profilesMap: Record<string, Profile> = {};
  if (authorIds.length > 0) {
    const { data: profilesData } = await sb
      .from("profiles")
      .select("id, full_name, avatar_url, headline")
      .in("id", authorIds);
    (profilesData ?? []).forEach((p: Profile) => { profilesMap[p.id] = p; });
  }

  const posts = (postsData ?? []).map((p: { author_id: string; [key: string]: unknown }) => ({
    ...p,
    author: profilesMap[p.author_id] ?? {
      full_name: company?.name ?? "Company",
      avatar_url: company?.logo_url ?? null,
      headline: null,
    },
  }));

  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions");

  if (!membership) return NextResponse.json({ error: "Not a company member" }, { status: 404 });

  if (!hasCompanyPermission(membership.role, membership.permissions, "company.create_posts")) {
    return NextResponse.json({ error: "Only social team members can create posts" }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, post_type, is_published, image_urls } = body;

  const safeContent = sanitizeRichText(content ?? "");

  if (!richTextToPlainText(safeContent)) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const validTypes = ["update", "hiring", "culture", "announcement"];
  const type = validTypes.includes(post_type) ? post_type : "update";

  const { data, error } = await sb
    .from("company_posts")
    .insert({
      company_id: membership.company_id,
      author_id: user.id,
      title: title?.trim() || null,
      content: safeContent,
      post_type: type,
      is_published: is_published ?? true,
      image_urls: image_urls ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data?.is_published) {
    const parts: string[] = [];
    if (data.title) parts.push(`<h3>${data.title}</h3>`);
    parts.push(normalizePostContent(String(data.content ?? "")));

    await sb
      .from("posts")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        company_id: membership.company_id,
        company_post_id: data.id,
        company_post_type: data.post_type,
        content: sanitizeRichText(parts.join("")),
        media_urls: data.image_urls ?? [],
        visibility: "public",
      });
  }

  return NextResponse.json({ post: data }, { status: 201 });
}
