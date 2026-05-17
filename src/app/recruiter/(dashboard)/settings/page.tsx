import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrgSettingsClient from "@/components/recruiter/OrgSettingsClient";
import type { Company, CompanyRole } from "@/types/recruiter";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

export default async function CompanySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions, companies(*)");

  if (!membership) redirect("/recruiter/dashboard");

  return (
    <OrgSettingsClient
      company={membership.companies as Company & { banner_url?: string | null }}
      myRole={membership.role as CompanyRole}
      myPermissions={membership.permissions ?? []}
      currentUserId={user.id}
    />
  );
}
