import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamClient from "@/components/recruiter/TeamClient";
import type { CompanyRole } from "@/types/recruiter";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions, companies(name)");

  if (!membership) redirect("/recruiter/dashboard");

  return (
    <TeamClient
      companyId={membership.company_id}
      companyName={membership.companies?.name ?? "Your Company"}
      myRole={membership.role as CompanyRole}
      myPermissions={membership.permissions ?? []}
      currentUserId={user.id}
    />
  );
}
