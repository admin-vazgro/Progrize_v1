"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Briefcase, Users, GitBranch, LogOut, Building2 } from "lucide-react";

interface Props {
  userName: string;
  companyName: string;
  avatarUrl?: string | null;
  jobCount?: number;
}

export default function RecruiterSidebar({ userName, companyName, avatarUrl, jobCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/recruiter/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navItems = [
    { href: "/recruiter/dashboard", label: "dashboard", Icon: LayoutDashboard },
    { href: "/recruiter/jobs", label: "jobs", Icon: Briefcase, count: jobCount },
    { href: "/recruiter/pipeline", label: "pipeline", Icon: GitBranch },
    { href: "/recruiter/candidates", label: "candidates", Icon: Users },
  ];

  return (
    <aside className="w-[240px] shrink-0 h-screen flex flex-col bg-[#fafaf8] border-r border-[#eceae3] px-[32px] py-[20px] overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-[8px] pb-[16px] h-[46px] shrink-0">
        <div className="flex items-end gap-px shrink-0">
          <div className="w-[5px] h-[6px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
          <div className="w-[6px] h-[12px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
          <div className="w-[9px] h-[17px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
        </div>
        <span className="text-[16px] font-semibold tracking-[-0.09em] text-[#0a2412] leading-[20px]">
          Progrize
        </span>
      </div>

      {/* Company badge */}
      <div className="mb-[20px] shrink-0">
        <div className="flex items-center gap-[8px] px-[10px] py-[8px] bg-[#f0ede8] rounded-[8px]">
          <Building2 className="w-[13px] h-[13px] text-[#5f5d54] shrink-0" />
          <span className="text-[12px] font-medium text-[#3d3c36] truncate">{companyName}</span>
        </div>
      </div>

      {/* Main nav */}
      <div className="flex flex-col gap-[4px] shrink-0">
        <p className="text-[10px] font-semibold text-[#8a877b] tracking-[0.8px] uppercase leading-[14px] mb-[8px]">
          recruiting
        </p>
        {navItems.map(({ href, label, Icon, count }) => {
          const isActive = active(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-[10px] px-[10px] py-[8px] rounded-[6px] transition-colors ${
                isActive ? "bg-[#e8f2eb]" : "hover:bg-[#f0ede8]"
              }`}
            >
              <Icon className={`w-[14px] h-[14px] shrink-0 ${isActive ? "text-[#0a2412]" : "text-[#3d3c36]"}`} />
              <span className={`flex-1 text-[13px] leading-[18px] min-w-0 ${isActive ? "font-medium text-[#0a2412]" : "font-normal text-[#3d3c36]"}`}>
                {label}
              </span>
              {count !== undefined && count !== null && count > 0 && (
                <span className="font-mono text-[10px] text-[#8a877b] leading-[14px] shrink-0">{count}</span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex-1 min-h-0" />

      {/* User footer */}
      <div className="border-t border-[#eceae3] pt-[14px] flex items-center gap-[10px] shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={userName} className="w-[33px] h-[33px] rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-[33px] h-[33px] rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[11px] font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-[12px] font-semibold text-[#0a2412] leading-[16px] truncate">{userName}</p>
          <p className="text-[11px] text-[#8a877b] leading-[14px] truncate">recruiter</p>
        </div>
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="text-[#b0ae9f] hover:text-[#5f5d54] transition-colors shrink-0 p-1"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
