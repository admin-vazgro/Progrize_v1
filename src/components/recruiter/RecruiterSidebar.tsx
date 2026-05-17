"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Megaphone, Users2, Briefcase, UserCircle2,
  LogOut, Building2, ArrowLeft,
} from "lucide-react";

interface Props {
  userName: string;
  companyName: string;
  avatarUrl?: string | null;
  companyLogoUrl?: string | null;
  companies?: Array<{ company_id: string; company_name: string; company_logo_url: string | null }>;
  activeCompanyId?: string | null;
  myRole?: string | null;
  myPermissions?: string[];
  isJobSeeker?: boolean;
}

const ORG_NAV = [
  { href: "/recruiter/dashboard",       label: "Home",        Icon: Home,        requiredAny: [] as string[] },
  { href: "/recruiter/company-profile", label: "Company",     Icon: Building2,   requiredAny: ["company.manage_profile"] },
  { href: "/recruiter/community",       label: "Community",   Icon: Megaphone,   requiredAny: ["company.create_posts", "company.manage_posts"] },
  { href: "/recruiter/team",            label: "Teams",       Icon: Users2,      requiredAny: ["company.manage_members", "company.manage_teams"] },
  { href: "/recruiter/jobs",            label: "Recruitment", Icon: Briefcase,   requiredAny: ["company.create_jobs", "company.manage_recruitments", "company.view_pipeline"] },
  { href: "/recruiter/employees",       label: "Employees",   Icon: UserCircle2, requiredAny: [] as string[] },
];


export default function RecruiterSidebar({
  userName,
  avatarUrl,
  companyName,
  companyLogoUrl,
  companies = [],
  activeCompanyId,
  myRole,
  myPermissions = [],
  isJobSeeker = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/recruiter/login");
    router.refresh();
  }

  function active(href: string) {
    if (href === "/recruiter/dashboard") return pathname === href;
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  function canSeeNav(requiredAny: string[]) {
    if (!requiredAny.length) return true;
    if (myRole === "owner" || myRole === "admin") return true;
    return requiredAny.some((p) => myPermissions.includes(p));
  }

  const userInitials = (userName ?? "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="w-[240px] shrink-0 h-screen flex flex-col bg-[#fafaf8] border-r border-[#eceae3] px-[32px] py-[20px] overflow-y-auto overflow-x-hidden">

      {/* Logo */}
      <div className="flex items-center gap-px pb-[16px] h-[56px] shrink-0">
        <div className="flex items-end gap-px shrink-0">
          <div className="w-[9px] h-[11px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
          <div className="w-[11px] h-[21px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
          <div className="w-[16px] h-[31px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
        </div>
      </div>

      {/* Main org nav */}
      <div className="flex flex-col gap-[2px] shrink-0">
        {ORG_NAV.filter(({ requiredAny }) => canSeeNav(requiredAny)).map(({ href, label, Icon }) => {
          const isActive = active(href);
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-[10px] px-[10px] py-[13px] rounded-[6px] transition-colors ${
                isActive ? "bg-[#e8f2eb]" : "hover:bg-[#f0ede8]"
              }`}
            >
              <div className={`w-[28px] h-[28px] rounded-[6px] flex items-center justify-center shrink-0 ${
                isActive ? "bg-[#c6f46b]/30" : "bg-[#eceae3]"
              }`}>
                <Icon className={`w-[15px] h-[15px] ${isActive ? "text-[#0a2412]" : "text-[#5f5d54]"}`} />
              </div>
              <span className={`text-[13px] leading-[18px] ${
                isActive ? "font-medium text-[#0a2412]" : "font-normal text-[#3d3c36]"
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex-1 min-h-0" />

      {companies.length > 1 && (
        <div className="mb-[16px] shrink-0">
          <p className="text-[10px] font-semibold text-[#8a877b] tracking-[0.8px] uppercase leading-[14px] mb-[8px]">
            companies
          </p>
          <div className="flex flex-col gap-[4px]">
            {companies.map((company) => {
              const selected = company.company_id === activeCompanyId;
              return (
                <button
                  key={company.company_id}
                  onClick={() => {
                    document.cookie = `recruiter_company_id=${company.company_id}; path=/; max-age=31536000; SameSite=Lax`;
                    router.push("/recruiter/dashboard");
                    router.refresh();
                  }}
                  className={`flex items-center gap-[8px] px-[10px] py-[8px] rounded-[6px] transition-colors w-full text-left ${
                    selected ? "bg-[#e8f2eb]" : "hover:bg-[#f0ede8]"
                  }`}
                >
                  {company.company_logo_url ? (
                    <img src={company.company_logo_url} alt="" className="w-5 h-5 rounded-[4px] object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-[4px] bg-[#e8f2eb] flex items-center justify-center text-[10px] font-semibold text-[#0a2412] shrink-0">
                      {company.company_name[0]?.toUpperCase() ?? "O"}
                    </div>
                  )}
                  <span className={`text-[12px] truncate ${selected ? "font-medium text-[#0a2412]" : "text-[#3d3c36]"}`}>
                    {company.company_name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Personal account footer */}
      <div className="border-t border-[#eceae3] pt-[14px] flex items-center gap-[10px] shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={userName} className="w-[33px] h-[33px] rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-[33px] h-[33px] rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[11px] font-bold shrink-0">
            {userInitials}
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-[12px] font-semibold text-[#0a2412] leading-[16px] truncate">{userName}</p>
          <p className="text-[11px] text-[#8a877b] leading-[14px] mt-[1px] truncate">Organisation</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isJobSeeker && (
            <Link
              href="/dashboard"
              title="Back to personal account"
              className="text-[#b0ae9f] hover:text-[#5f5d54] transition-colors p-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          )}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-[#b0ae9f] hover:text-[#5f5d54] transition-colors p-1"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
