import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCompanyPermission } from "@/lib/company-permissions";
import type { CompanyRole } from "@/types/recruiter";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { userId } = await params;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions");

  if (!membership) return NextResponse.json({ error: "Not a company member" }, { status: 404 });
  if (!hasCompanyPermission(membership.role, membership.permissions, "company.manage_members")) {
    return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
  }

  const body = await req.json();
  const validRoles: CompanyRole[] = ["admin", "hr", "social", "recruiter"];

  // Accept either a single `role` or a `roles` array
  const roles: CompanyRole[] = Array.isArray(body.roles)
    ? body.roles.filter((r: string) => validRoles.includes(r as CompanyRole))
    : body.role && validRoles.includes(body.role) ? [body.role] : [];

  if (roles.length === 0) {
    return NextResponse.json({ error: "At least one valid role required" }, { status: 400 });
  }

  // Prevent demoting the owner
  const { data: target } = await sb
    .from("company_members")
    .select("role")
    .eq("company_id", membership.company_id)
    .eq("user_id", userId)
    .single();

  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 403 });
  }

  // The DB trigger computes permissions and primary role from the roles array
  const { error } = await sb
    .from("company_members")
    .update({ roles })
    .eq("company_id", membership.company_id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { userId } = await params;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions");

  if (!membership) return NextResponse.json({ error: "Not a company member" }, { status: 404 });

  // Allow self-removal or admin removal
  const isSelf = userId === user.id;
  const canManageMembers = hasCompanyPermission(membership.role, membership.permissions, "company.manage_members");
  if (!isSelf && !canManageMembers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot remove the owner
  const { data: target } = await sb
    .from("company_members")
    .select("role")
    .eq("company_id", membership.company_id)
    .eq("user_id", userId)
    .single();

  if (target?.role === "owner") {
    return NextResponse.json({ error: "Cannot remove the company owner" }, { status: 403 });
  }

  const { error } = await sb
    .from("company_members")
    .delete()
    .eq("company_id", membership.company_id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
