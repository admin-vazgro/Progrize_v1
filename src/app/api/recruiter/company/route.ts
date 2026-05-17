import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCompanyPermission } from "@/lib/company-permissions";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data, error } = await getActiveCompanyMembership(sb, user.id, "role, permissions, companies(*)");

  if (error) return NextResponse.json({ company: null });
  return NextResponse.json({
    company: data?.companies,
    role: data?.role,
    permissions: data?.permissions ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const body = await req.json();

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions");

  if (!membership) return NextResponse.json({ error: "No company found" }, { status: 404 });
  if (!hasCompanyPermission(membership.role, membership.permissions, "company.manage_profile")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await sb
    .from("companies")
    .update({
      name: body.name,
      website: body.website,
      industry: body.industry,
      size: body.size,
      location: body.location,
      description: body.description,
      logo_url: body.logo_url,
      banner_url: body.banner_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.company_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data });
}
