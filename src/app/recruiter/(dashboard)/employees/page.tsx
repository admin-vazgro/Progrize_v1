import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Users2, Crown, ShieldCheck, Briefcase, Megaphone, UserCircle2 } from "lucide-react";
import type { CompanyRole } from "@/types/recruiter";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

const ROLE_META: Record<CompanyRole, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  owner:     { label: "Owner",     color: "text-[#7c3aed]", bg: "bg-[#f3ecff]", Icon: Crown },
  admin:     { label: "Admin",     color: "text-[#0a2412]", bg: "bg-[#e8f2eb]", Icon: ShieldCheck },
  hr:        { label: "HR",        color: "text-[#b45309]", bg: "bg-[#fef3c7]", Icon: Briefcase },
  social:    { label: "Social",    color: "text-[#0369a1]", bg: "bg-[#e0f2fe]", Icon: Megaphone },
  recruiter: { label: "Recruiter", color: "text-[#374151]", bg: "bg-[#f3f4f6]", Icon: UserCircle2 },
};

type Member = {
  id: string;
  user_id: string;
  role: CompanyRole;
  profile: {
    full_name: string | null;
    headline: string | null;
    avatar_url: string | null;
  };
};

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, companies(name)");

  if (!membership) redirect("/recruiter/dashboard");
  const companyName: string = membership.companies?.name ?? "Your Company";

  const { data: membersData } = await sb
    .from("company_members")
    .select("id, user_id, role")
    .eq("company_id", membership.company_id)
    .order("role");

  const memberRows = (membersData ?? []) as { id: string; user_id: string; role: CompanyRole }[];
  const userIds = memberRows.map((m) => m.user_id);

  type ProfileRow = { id: string; full_name: string | null; headline: string | null; avatar_url: string | null };
  const profilesMap: Record<string, ProfileRow> = {};
  if (userIds.length > 0) {
    // Use the service client here so team cards do not show Unknown because of profile RLS.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = await createServiceClient() as any;
    const { data: profilesData } = await admin
      .from("profiles")
      .select("id, full_name, headline, avatar_url")
      .in("id", userIds);
    (profilesData ?? []).forEach((p: ProfileRow) => { profilesMap[p.id] = p; });
  }

  const members: Member[] = memberRows.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    profile: profilesMap[m.user_id] ?? { full_name: null, headline: null, avatar_url: null },
  }));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fafaf8]">
      <div className="px-8 pt-7 pb-5 flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">
            Employees
          </h1>
          <p className="text-[15px] text-[#5f5d54] mt-[8px]">
            <span className="font-bold">{members.length}</span> member{members.length !== 1 ? "s" : ""} on {companyName}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-6 pt-2">
        {members.length === 0 ? (
          <div className="bg-white rounded-[20px] p-16 text-center">
            <Users2 className="w-10 h-10 text-[#c8c5bc] mx-auto mb-4" />
            <p className="text-[16px] font-semibold text-[#3d3c36] mb-2">No team members yet</p>
            <p className="text-[13px] text-[#8a877b]">Add members from the Teams page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[16px]">
            {members.map((m) => {
              const { label, color, bg, Icon } = ROLE_META[m.role] ?? ROLE_META.recruiter;
              const displayName: string = m.profile.full_name ?? (m.role === "owner" ? companyName : "Team member");
              const displayHeadline: string = m.profile.headline ?? (m.role === "owner" ? "Company account" : "");
              const initials = displayName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <Link
                  key={m.id}
                  href={`/u/${m.user_id}`}
                  className="bg-white rounded-[14px] p-[20px] flex flex-col gap-[16px] ring-1 ring-[#e8f2eb] hover:ring-[#b8dfc4] hover:-translate-y-[2px] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-[12px]">
                    {m.profile.avatar_url ? (
                      <img
                        src={m.profile.avatar_url}
                        alt=""
                        className="w-[44px] h-[44px] rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-[44px] h-[44px] rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[14px] font-bold shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[#0a2412] leading-[19px] truncate">
                        {displayName}
                      </p>
                      {displayHeadline && (
                        <p className="text-[12px] text-[#5f5d54] leading-[16px] truncate mt-[3px]">
                          {displayHeadline}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 px-[9px] py-[4px] rounded-full text-[11px] font-semibold ${bg} ${color}`}>
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                    <span className="text-[11px] text-[#b0ae9f]">View profile →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
