import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasCompanyPermission, permissionsForRole } from "@/lib/company-permissions";
import type { CompanyRole } from "@/types/recruiter";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions");

  if (!membership) return NextResponse.json({ error: "Not a company member" }, { status: 404 });

  const { data, error } = await sb
    .from("company_members")
    .select("id, user_id, role, roles, permissions, verified_by, joined_at")
    .eq("company_id", membership.company_id)
    .order("joined_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const memberRows = (data ?? []) as Array<{
    id: string;
    user_id: string;
    role: string;
    roles: string[];
    permissions: string[];
    verified_by: string;
    joined_at: string;
  }>;

  const profileMap = new Map<string, { full_name: string | null; email: string | null; headline: string | null; avatar_url: string | null }>();
  const userIds = memberRows.map((member) => member.user_id);
  if (userIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = await createServiceClient() as any;
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email, headline, avatar_url")
      .in("id", userIds);

    for (const profile of (profiles ?? []) as Array<{ id: string; full_name: string | null; email: string | null; headline: string | null; avatar_url: string | null }>) {
      profileMap.set(profile.id, profile);
    }
  }

  const members = memberRows.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    company_id: membership.company_id,
    role: m.role,
    roles: m.roles?.length ? m.roles : [m.role],
    permissions: m.permissions ?? [],
    verified_by: m.verified_by,
    joined_at: m.joined_at,
    profile: profileMap.get(m.user_id) ?? { full_name: null, email: null, headline: null, avatar_url: null },
  }));

  return NextResponse.json({ members, my_role: membership.role, my_permissions: membership.permissions ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions");

  if (!membership) return NextResponse.json({ error: "Not a company member" }, { status: 404 });
  if (!hasCompanyPermission(membership.role, membership.permissions, "company.manage_members")) {
    return NextResponse.json({ error: "Only admins can add team members" }, { status: 403 });
  }

  const body = await req.json();
  const { target_user_id, role } = body;

  const validRoles: CompanyRole[] = ["admin", "hr", "social", "recruiter"];
  if (!target_user_id || !role || !validRoles.includes(role)) {
    return NextResponse.json({ error: "target_user_id and a valid role are required" }, { status: 400 });
  }

  // Check if user exists
  const { data: profile } = await sb
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", target_user_id)
    .single();

  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check not already a member
  const { data: existing } = await sb
    .from("company_members")
    .select("id")
    .eq("company_id", membership.company_id)
    .eq("user_id", target_user_id)
    .single();

  if (existing) return NextResponse.json({ error: "User is already a team member" }, { status: 409 });

  const { error } = await sb.from("company_members").insert({
    company_id: membership.company_id,
    user_id: target_user_id,
    role,
    permissions: permissionsForRole(role as CompanyRole),
    verified_by: "manual",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
