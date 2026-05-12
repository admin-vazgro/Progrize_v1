"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/recruiter/dashboard", label: "Overview" },
  { href: "/recruiter/jobs", label: "Jobs" },
  { href: "/recruiter/pipeline", label: "Pipeline" },
  { href: "/recruiter/candidates", label: "Candidates" },
];

interface Props {
  companyName: string;
}

export default function RecruiterTabBar({ companyName }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/recruiter/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="shrink-0 bg-[rgba(250,250,248,0.95)] border-b border-[#eceae3] px-[32px]">
      <div className="flex items-center gap-0">
        <span className="text-[11px] text-[#8a877b] mr-4 shrink-0">{companyName}</span>
        {TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-3 text-[13px] border-b-2 -mb-px transition-colors ${
              isActive(href)
                ? "border-[#0a2412] text-[#0a2412] font-medium"
                : "border-transparent text-[#8a877b] hover:text-[#3d3c36]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
