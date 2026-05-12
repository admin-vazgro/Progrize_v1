"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Users, MapPin } from "lucide-react";
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

export default function CandidatesPage() {
  const [suggestions, setSuggestions] = useState<CandidateSuggestion[]>([]);
  const [filtered, setFiltered] = useState<CandidateSuggestion[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruiter/candidates?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setSuggestions(data.suggestions ?? []);
        setFiltered(data.suggestions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(suggestions);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(
      suggestions.filter(
        (s) =>
          s.profile.full_name?.toLowerCase().includes(q) ||
          s.profile.headline?.toLowerCase().includes(q) ||
          s.profile.location?.toLowerCase().includes(q) ||
          s.matching_skills.some((sk) => sk.toLowerCase().includes(q)) ||
          s.job_title.toLowerCase().includes(q)
      )
    );
  }, [query, suggestions]);

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[900px] mx-auto px-8 py-8">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-1">AI Matched</p>
          <h1 className="text-[28px] font-semibold text-[#0a2412] tracking-[-0.6px]">Candidate Suggestions</h1>
          <p className="text-[13px] text-[#8a877b] mt-1">Profiles matched to your active job postings by skill overlap.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a877b]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill, location…"
            className="w-full h-[46px] bg-white border border-[#eceae3] rounded-[12px] pl-11 pr-4 text-[13px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:border-[#c8c5bc] transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px] text-[#8a877b]">Finding matches…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-dashed border-[#d4d0c8] p-16 text-center">
            <Users className="w-10 h-10 text-[#c8c5bc] mx-auto mb-4" />
            <p className="text-[14px] font-medium text-[#3d3c36] mb-2">
              {query ? "No matches for that search" : "No candidate suggestions yet"}
            </p>
            <p className="text-[13px] text-[#8a877b] mb-4">
              {query ? "Try a different keyword or skill." : "Add required skills to your job postings to enable matching."}
            </p>
            {!query && (
              <Link href="/recruiter/jobs/new" className="text-[13px] font-medium text-[#0a2412] hover:underline">
                Post a job with required skills
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((s, i) => {
              const initials = (s.profile.full_name ?? "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <Link
                  key={`${s.profile.id}-${s.job_posting_id}-${i}`}
                  href={`/recruiter/candidates/${s.profile.id}?job=${s.job_posting_id}`}
                  className="group bg-white rounded-[20px] p-5 hover:shadow-sm transition-shadow flex items-start gap-4"
                >
                  {s.profile.avatar_url ? (
                    <img src={s.profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[12px] font-bold shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-semibold text-[#0a2412]">{s.profile.full_name ?? "Anonymous"}</p>
                      <ScoreBadge score={s.fit_score} />
                    </div>
                    <p className="text-[12px] text-[#5f5d54] mb-0.5">{s.profile.headline ?? "—"}</p>
                    <div className="flex items-center gap-3 text-[11px] text-[#8a877b] mb-2">
                      {s.profile.location && (
                        <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{s.profile.location}</span>
                      )}
                      <span>For: <span className="font-medium text-[#5f5d54]">{s.job_title}</span></span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.matching_skills.slice(0, 5).map((sk) => (
                        <span key={sk} className="px-2 py-0.5 bg-[#e8f2eb] text-[#0a2412] text-[10px] rounded-full">{sk}</span>
                      ))}
                      {s.missing_skills.slice(0, 2).map((sk) => (
                        <span key={sk} className="px-2 py-0.5 bg-[#f5f3ed] text-[#8a877b] text-[10px] rounded-full line-through">{sk}</span>
                      ))}
                    </div>
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
