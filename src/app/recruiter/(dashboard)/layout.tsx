import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import RecruiterTabBar from "@/components/recruiter/RecruiterTabBar";

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [
    { data: profile },
    { data: memberships },
    { count: trackerCount },
    { count: networkPendingCount },
  ] = await Promise.all([
    sb.from("profiles").select("full_name, avatar_url, headline").eq("id", user.id).single(),
    sb.from("company_members").select("company_id, role, companies(name)").eq("user_id", user.id),
    sb.from("job_applications").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    sb.from("connection_requests").select("*", { count: "exact", head: true }).eq("recipient_id", user.id).eq("status", "pending"),
  ]);

  const companies = (memberships ?? []).map((m: {
    company_id: string;
    role: string;
    companies: { name: string };
  }) => ({
    company_id: m.company_id,
    company_name: m.companies?.name ?? "Unknown",
    role: m.role,
  }));

  // Guard: must have at least one company membership to access recruiter area
  if (companies.length === 0) redirect("/dashboard");

  const userName = profile?.full_name ?? user.email?.split("@")[0] ?? "User";
  const avatarUrl = profile?.avatar_url ?? null;
  const userRole = profile?.headline ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafaf8]">
      <Sidebar
        userName={userName}
        avatarUrl={avatarUrl}
        userRole={userRole}
        trackerCount={trackerCount ?? 0}
        networkPendingCount={networkPendingCount ?? 0}
        companies={companies}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar isRecruiter userEmail={user.email ?? ""} />
        <RecruiterTabBar companyName={companies[0]?.company_name ?? "Your Company"} />
        <main className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
