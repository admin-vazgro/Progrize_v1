import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCompanyPermission } from "@/lib/company-permissions";
import { normalizePostContent, richTextToPlainText, sanitizeRichText } from "@/lib/rich-text";

function sharedPostContent(title: string | null, content: string) {
  const parts: string[] = [];
  if (title) parts.push(`<h3>${title}</h3>`);
  parts.push(normalizePostContent(content));
  return sanitizeRichText(parts.join(""));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { id } = await params;

  const { data: post } = await sb
    .from("company_posts")
    .select("author_id, company_id")
    .eq("id", id)
    .single();

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { data: membership } = await sb
    .from("company_members")
    .select("role, permissions")
    .eq("company_id", post.company_id)
    .eq("user_id", user.id)
    .single();

  const isAuthor = post.author_id === user.id;
  const canManagePosts = hasCompanyPermission(membership?.role, membership?.permissions, "company.manage_posts");
  if (!isAuthor && !canManagePosts) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, post_type, is_published } = body;
  const safeContent = content !== undefined ? sanitizeRichText(content ?? "") : undefined;

  if (safeContent !== undefined && !richTextToPlainText(safeContent)) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("company_posts")
    .update({
      ...(title !== undefined && { title: title?.trim() || null }),
      ...(safeContent !== undefined && { content: safeContent }),
      ...(post_type !== undefined && { post_type }),
      ...(is_published !== undefined && { is_published }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data.is_published) {
    const { data: sharedPost } = await sb
      .from("posts")
      .select("id")
      .eq("company_post_id", id)
      .maybeSingle();

    const sharedPayload = {
      user_id: data.author_id,
      company_id: data.company_id,
      company_post_id: data.id,
      company_post_type: data.post_type,
      content: sharedPostContent(data.title, data.content),
      media_urls: Array.isArray(data.image_urls) ? data.image_urls : [],
      visibility: "public",
      updated_at: new Date().toISOString(),
    };

    if (sharedPost?.id) {
      await sb.from("posts").update(sharedPayload).eq("id", sharedPost.id);
    } else {
      await sb.from("posts").insert({ id: crypto.randomUUID(), ...sharedPayload });
    }
  } else {
    await sb.from("posts").delete().eq("company_post_id", id);
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { id } = await params;

  const { data: post } = await sb
    .from("company_posts")
    .select("author_id, company_id")
    .eq("id", id)
    .single();

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { data: membership } = await sb
    .from("company_members")
    .select("role, permissions")
    .eq("company_id", post.company_id)
    .eq("user_id", user.id)
    .single();

  const isAuthor = post.author_id === user.id;
  const canManagePosts = hasCompanyPermission(membership?.role, membership?.permissions, "company.manage_posts");
  if (!isAuthor && !canManagePosts) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await sb.from("posts").delete().eq("company_post_id", id);

  const { error } = await sb.from("company_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
