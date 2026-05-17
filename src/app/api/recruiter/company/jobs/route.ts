import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCompanyPermission } from "@/lib/company-permissions";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions");

  if (!membership) return NextResponse.json({ error: "Not a company member" }, { status: 404 });
  if (!hasCompanyPermission(membership.role, membership.permissions, "company.view_pipeline")) {
    return NextResponse.json({ error: "You do not have permission to view company jobs" }, { status: 403 });
  }

  const { data, error } = await sb
    .from("job_postings")
    .select("id, title, location, work_mode, employment_type, seniority, is_active, posted_at, created_at")
    .eq("company_id", membership.company_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs: data ?? [] });
}
