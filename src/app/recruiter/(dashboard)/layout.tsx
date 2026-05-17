import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecruiterSidebar from "@/components/recruiter/RecruiterSidebar";
import { getActiveCompanyId } from "@/lib/recruiter-active-company";

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    sb.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
    sb.from("company_members").select("company_id, role, permissions, companies(name, logo_url)").eq("user_id", user.id),
  ]);

  type CompanyMembership = {
    company_id: string;
    company_name: string;
    company_logo_url: string | null;
    role: string;
    permissions: string[];
  };

  const companies: CompanyMembership[] = (memberships ?? []).map((m: {
    company_id: string;
    role: string;
    permissions: string[];
    companies: { name: string; logo_url: string | null };
  }) => ({
    company_id: m.company_id,
    company_name: m.companies?.name ?? "Unknown",
    company_logo_url: m.companies?.logo_url ?? null,
    role: m.role,
    permissions: m.permissions ?? [],
  }));

  if (companies.length === 0) redirect("/recruiter/setup");

  const userName = profile?.full_name ?? user.email?.split("@")[0] ?? "User";
  const avatarUrl = profile?.avatar_url ?? null;
  // A job seeker is a real person with a personal profile — org-only accounts have no profile row
  const isJobSeeker = !!profile;
  const activeCompanyId = await getActiveCompanyId();
  const primaryCompany = companies.find((company) => company.company_id === activeCompanyId) ?? companies[0];

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafaf8]">
      <RecruiterSidebar
        userName={userName}
        avatarUrl={avatarUrl}
        companyName={primaryCompany.company_name}
        companyLogoUrl={primaryCompany.company_logo_url}
        companies={companies}
        activeCompanyId={primaryCompany.company_id}
        myRole={primaryCompany.role}
        myPermissions={primaryCompany.permissions}
        isJobSeeker={isJobSeeker}
      />
      <main className="flex-1 min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
