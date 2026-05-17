import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CompanyPostsClient from "@/components/recruiter/CompanyPostsClient";
import type { CompanyRole } from "@/types/recruiter";
import { hasCompanyPermission } from "@/lib/company-permissions";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

export default async function CompanyPostsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions, companies(name)");

  if (!membership) redirect("/recruiter/dashboard");

  const role = membership.role as CompanyRole;
  const permissions = membership.permissions ?? [];
  if (!hasCompanyPermission(role, permissions, "company.create_posts")) redirect("/recruiter/dashboard");

  return (
    <CompanyPostsClient
      companyName={membership.companies?.name ?? "Your Company"}
      myRole={role}
      myPermissions={permissions}
      currentUserId={user.id}
    />
  );
}
