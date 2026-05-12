"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Briefcase, LayoutDashboard, MessageSquare, Zap,
  LogOut, Users, Building2,
} from "lucide-react";

interface CompanyMembership {
  company_id: string;
  company_name: string;
  role: string;
}

interface Props {
  userName: string;
  userRole?: string | null;
  avatarUrl?: string | null;
  trackerCount?: number;
  networkPendingCount?: number;
  companies?: CompanyMembership[];
}

export default function Sidebar({
  userName, userRole, avatarUrl,
  trackerCount, networkPendingCount,
  companies = [],
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [activeCompany, setActiveCompany] = useState<CompanyMembership | null>(null);

  // restore active company from localStorage, fall back to first membership
  useEffect(() => {
    if (companies.length === 0) return;
    const stored = localStorage.getItem("recruiter_company_id");
    const match = companies.find((c) => c.company_id === stored);
    setActiveCompany(match ?? companies[0]);
  }, [companies]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navItems = [
    { href: "/dashboard", label: "home", Icon: Home, count: null },
    { href: "/jobs", label: "jobs", Icon: Briefcase, count: null },
    { href: "/tracker", label: "tracker", Icon: LayoutDashboard, count: trackerCount ?? null },
    { href: "/community", label: "community", Icon: MessageSquare, count: null },
    { href: "/network", label: "network", Icon: Users, count: networkPendingCount ?? null },
  ];

  const isRecruiter = companies.length > 0;

  return (
    <aside className="w-[240px] shrink-0 h-screen flex flex-col bg-[#fafaf8] border-r border-[#eceae3] px-[32px] py-[20px] overflow-y-auto overflow-x-hidden">

      {/* Logo */}
      <div className="flex items-center gap-[10px] pb-[16px] h-[56px] shrink-0 ml-[6px]">
        <div className="flex items-end gap-[2px] shrink-0">
          <div className="w-[8px] h-[11px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
          <div className="w-[11px] h-[22px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
          <div className="w-[16px] h-[32px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
        </div>
      </div>

      {/* Main nav */}
      <div className="flex flex-col gap-[2px] shrink-0">
        {navItems.map(({ href, label, Icon, count }) => {
          const isActive = active(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-[10px] px-[10px] py-[13px] rounded-[6px] transition-colors ${
                isActive ? "bg-[#e8f2eb]" : "hover:bg-[#f0ede8]"
              }`}
            >
              <div className={`w-[28px] h-[28px] rounded-[6px] flex items-center justify-center shrink-0 ${isActive ? "bg-[#c6f46b]/30" : "bg-[#eceae3]"}`}>
                <Icon className={`w-[15px] h-[15px] ${isActive ? "text-[#0a2412]" : "text-[#5f5d54]"}`} />
              </div>
              <span className={`flex-1 text-[13px] leading-[18px] min-w-0 ${isActive ? "font-medium text-[#0a2412]" : "font-normal text-[#3d3c36]"}`}>
                {label}
              </span>
              {count !== null && count !== undefined && count > 0 && (
                <span className="font-mono text-[10px] text-[#8a877b] leading-[14px] shrink-0">{count}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* YOU section */}
      <div className="mt-[16px] shrink-0">
        <p className="text-[10px] font-semibold text-[#8a877b] tracking-[0.8px] uppercase leading-[14px] mb-[8px]">
          you
        </p>
        {[
          { href: "/profile", label: "my profile", Icon: Zap },
          { href: "/dashboard", label: "dashboard", Icon: LayoutDashboard },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-[10px] px-[10px] py-[13px] rounded-[6px] transition-colors ${
              active(href) ? "bg-[#e8f2eb]" : "hover:bg-[#f0ede8]"
            }`}
          >
            <div className={`w-[28px] h-[28px] rounded-[6px] flex items-center justify-center shrink-0 ${active(href) ? "bg-[#c6f46b]/30" : "bg-[#eceae3]"}`}>
              <Icon className={`w-[15px] h-[15px] ${active(href) ? "text-[#0a2412]" : "text-[#5f5d54]"}`} />
            </div>
            <span className={`flex-1 text-[13px] leading-[18px] ${active(href) ? "font-medium text-[#0a2412]" : "font-normal text-[#3d3c36]"}`}>
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* RECRUITING section — only if user has company memberships */}
      {isRecruiter && (
        <div className="mt-[20px] shrink-0">
          <p className="text-[10px] font-semibold text-[#8a877b] tracking-[0.8px] uppercase leading-[14px] mb-[8px]">
            managed companies
          </p>

          {companies.map((c) => {
            const isActive = pathname.startsWith("/recruiter") && activeCompany?.company_id === c.company_id;
            return (
              <Link
                key={c.company_id}
                href="/recruiter/dashboard"
                onClick={() => {
                  setActiveCompany(c);
                  localStorage.setItem("recruiter_company_id", c.company_id);
                  localStorage.setItem("recruiter_company_name", c.company_name);
                }}
                className={`flex items-center gap-[8px] px-[10px] py-[8px] rounded-[6px] transition-colors ${
                  isActive ? "bg-[#e8f2eb]" : "hover:bg-[#f0ede8]"
                }`}
              >
                <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 ${isActive ? "bg-[#c6f46b]/40" : "bg-[#e8f2eb]"}`}>
                  <Building2 className="w-3 h-3 text-[#0a2412]" />
                </div>
                <span className={`flex-1 text-[12px] truncate min-w-0 ${isActive ? "font-medium text-[#0a2412]" : "font-normal text-[#3d3c36]"}`}>
                  {c.company_name}
                </span>
              </Link>
            );
          })}
        </div>
      )}

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
          <p className="text-[11px] text-[#8a877b] leading-[14px] truncate">
            {isRecruiter ? "job seeker & recruiter" : (userRole ?? "member")}
          </p>
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
