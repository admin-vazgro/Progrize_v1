import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrgCommunityClient from "@/components/recruiter/OrgCommunityClient";
import type { CompanyRole } from "@/types/recruiter";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, permissions, companies(name)");

  if (!membership) redirect("/recruiter/dashboard");

  const companyName = membership.companies?.name ?? "Your Organisation";
  const companyInitial = companyName[0]?.toUpperCase() ?? "O";

  return (
    <OrgCommunityClient
      companyName={companyName}
      companyInitial={companyInitial}
      myRole={membership.role as CompanyRole}
      myPermissions={membership.permissions ?? []}
      currentUserId={user.id}
    />
  );
}
