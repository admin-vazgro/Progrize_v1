"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import type { CandidateSuggestion } from "@/types/recruiter";

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 75 ? "bg-[#e8f2eb] text-[#0a2412]" :
    score >= 50 ? "bg-[#f7fcca] text-[#3a3a00]" :
    "bg-[#f5f3ed] text-[#5f5d54]";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}>
      {score}%
    </span>
  );
}

export default function CandidateSuggestions() {
  const [suggestions, setSuggestions] = useState<CandidateSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruiter/candidates?limit=6")
      .then((r) => r.ok ? r.json() : { suggestions: [] })
      .then((d) => setSuggestions(d.suggestions ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[#26251f] tracking-[-0.3px]">Top Candidate Matches</h2>
        {suggestions.length > 0 && (
          <p className="text-[12px] text-[#8a877b]">Matched to your active jobs</p>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-[16px] border border-[#eceae3] p-10 text-center">
          <div className="w-6 h-6 rounded-full border-2 border-[#eceae3] border-t-[#0a2412] animate-spin mx-auto" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-[#eceae3] p-10 text-center">
          <Users className="w-8 h-8 text-[#c8c5bc] mx-auto mb-3" />
          <p className="text-[14px] font-medium text-[#3d3c36] mb-1">No suggestions yet</p>
          <p className="text-[13px] text-[#8a877b] mb-4">
            Post a job with required skills to see matched candidates.
          </p>
          <Link href="/recruiter/jobs/new" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0a2412] hover:underline">
            Post your first job <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((s, i) => {
            const initials = (s.profile.full_name ?? "?")
              .split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <Link
                key={`${s.profile.id}-${s.job_posting_id}-${i}`}
                href={`/recruiter/candidates/${s.profile.id}?job=${s.job_posting_id}`}
                className="group bg-white rounded-[16px] border border-[#eceae3] p-5 hover:border-[#d4d0c8] transition-colors flex items-start gap-4"
              >
                {s.profile.avatar_url ? (
                  <img src={s.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[12px] font-bold shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[14px] font-semibold text-[#0a2412] truncate">{s.profile.full_name ?? "Anonymous"}</p>
                    <ScoreBadge score={s.fit_score} />
                  </div>
                  <p className="text-[12px] text-[#5f5d54] truncate mb-1">{s.profile.headline ?? "—"}</p>
                  <p className="text-[11px] text-[#8a877b] mb-2">For: {s.job_title}</p>
                  <div className="flex flex-wrap gap-1">
                    {s.matching_skills.slice(0, 4).map((sk) => (
                      <span key={sk} className="px-2 py-0.5 bg-[#e8f2eb] text-[#0a2412] text-[10px] rounded-full">{sk}</span>
                    ))}
                    {s.missing_skills.slice(0, 2).map((sk) => (
                      <span key={sk} className="px-2 py-0.5 bg-[#f5f3ed] text-[#8a877b] text-[10px] rounded-full line-through">{sk}</span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#c8c5bc] group-hover:text-[#8a877b] shrink-0 mt-1 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
