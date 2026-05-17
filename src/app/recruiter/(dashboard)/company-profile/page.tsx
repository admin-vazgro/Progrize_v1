import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CompanyProfileClient from "@/components/recruiter/CompanyProfileClient";
import type { CompanyRole } from "@/types/recruiter";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

export default async function CompanyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Use join pattern (same as settings page) — direct SELECT on companies is blocked by RLS
  const { data: membership } = await getActiveCompanyMembership(
    sb,
    user.id,
    "company_id, role, permissions, companies(id, name, description, location, industry, size, website, logo_url, banner_url)"
  );

  if (!membership?.companies) redirect("/recruiter/dashboard");

  return (
    <CompanyProfileClient
      company={membership.companies}
      companyId={membership.company_id as string}
      myRole={membership.role as CompanyRole}
      myPermissions={membership.permissions ?? []}
    />
  );
}
