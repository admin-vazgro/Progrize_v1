"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Briefcase, GraduationCap, Star, Mail, Calendar } from "lucide-react";

interface Skill {
  name: string;
  category: string | null;
  level: string | null;
  years_used: number | null;
}

interface Experience {
  id: string;
  company_name: string;
  job_title: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  location: string | null;
  description: string | null;
}

interface Education {
  id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  email: string | null;
  avatar_url: string | null;
  years_experience: number | null;
  summary: string | null;
  target_roles: string[] | null;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "#4caf6e" : score >= 45 ? "#c1cc5a" : "#e0c070";
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[60px] h-[60px]">
        <svg className="w-full h-full -rotate-90">
          <circle cx="30" cy="30" r={r} fill="none" stroke="#eceae3" strokeWidth="4" />
          <circle
            cx="30" cy="30" r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-[#0a2412]">
          {score}
        </span>
      </div>
      <p className="text-[10px] text-[#8a877b]">{label}</p>
    </div>
  );
}

const LEVEL_ORDER = ["expert", "advanced", "intermediate", "beginner"];

export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [profileRes, jobRes] = await Promise.all([
      fetch(`/api/recruiter/candidates/${id}`),
      jobId ? fetch(`/api/recruiter/jobs/${jobId}`) : Promise.resolve(null),
    ]);

    if (profileRes.ok) {
      const data = await profileRes.json();
      setProfile(data.profile);
    }

    if (jobRes && jobRes.ok) {
      const data = await jobRes.json();
      setJobTitle(data.job?.title ?? null);
      setRequiredSkills(data.job?.required_skills ?? []);
    }
    setLoading(false);
  }, [id, jobId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#fafaf8]">
        <p className="text-[13px] text-[#8a877b]">Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center bg-[#fafaf8]">
        <p className="text-[13px] text-[#8a877b]">Candidate not found.</p>
      </div>
    );
  }

  const initials = (profile.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  // compute skill match if we have a job context
  const normalise = (s: string) => s.toLowerCase().trim();
  const profileSkillNames = profile.skills.map((s) => normalise(s.name));
  const matchingSkills = requiredSkills.filter((s) => profileSkillNames.includes(normalise(s)));
  const missingSkills = requiredSkills.filter((s) => !profileSkillNames.includes(normalise(s)));
  const fitScore = requiredSkills.length > 0
    ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
    : null;

  // group skills by category
  const skillsByCategory: Record<string, Skill[]> = {};
  const sortedSkills = [...profile.skills].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level ?? "beginner") - LEVEL_ORDER.indexOf(b.level ?? "beginner")
  );
  sortedSkills.forEach((sk) => {
    const cat = sk.category ?? "Other";
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(sk);
  });

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[860px] mx-auto px-8 py-8">

        <div className="mb-6">
          <Link
            href={jobId ? `/recruiter/jobs/${jobId}` : "/recruiter/dashboard"}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#8a877b] hover:text-[#3d3c36] transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {jobId ? "Back to pipeline" : "Back to dashboard"}
          </Link>

          {jobTitle && (
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-2">
              Candidate for: {jobTitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

          {/* Left: Profile */}
          <div className="flex flex-col gap-5">

            {/* Identity */}
            <div className="bg-white rounded-[20px] border border-[#eceae3] p-6">
              <div className="flex items-start gap-4 mb-4">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[18px] font-bold shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-[22px] font-semibold text-[#0a2412] tracking-[-0.4px]">
                    {profile.full_name ?? "Anonymous"}
                  </h1>
                  <p className="text-[14px] text-[#5f5d54] mb-1">{profile.headline ?? "—"}</p>
                  <div className="flex items-center gap-3 text-[12px] text-[#8a877b]">
                    {profile.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</span>
                    )}
                    {profile.years_experience && (
                      <span>{profile.years_experience} yrs exp</span>
                    )}
                  </div>
                </div>
              </div>

              {profile.email && (
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1.5 text-[12px] text-[#5f5d54] hover:text-[#0a2412] transition-colors mb-3">
                  <Mail className="w-3.5 h-3.5" />
                  {profile.email}
                </a>
              )}

              {profile.summary && (
                <p className="text-[13px] text-[#3d3c36] leading-[1.7] border-t border-[#eceae3] pt-4 mt-2">
                  {profile.summary}
                </p>
              )}
            </div>

            {/* Experience */}
            {profile.experience.length > 0 && (
              <div className="bg-white rounded-[20px] border border-[#eceae3] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4 text-[#8a877b]" />
                  <h2 className="text-[14px] font-semibold text-[#26251f]">Experience</h2>
                </div>
                <div className="flex flex-col gap-5">
                  {profile.experience.map((exp) => (
                    <div key={exp.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-[8px] bg-[#f0ede8] flex items-center justify-center shrink-0 mt-0.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#5f5d54]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#0a2412]">{exp.job_title}</p>
                        <p className="text-[12px] text-[#5f5d54]">{exp.company_name}</p>
                        <p className="flex items-center gap-1 text-[11px] text-[#8a877b] mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(exp.start_date)} — {exp.is_current ? "Present" : formatDate(exp.end_date)}
                          {exp.location ? ` · ${exp.location}` : ""}
                        </p>
                        {exp.description && (
                          <p className="text-[12px] text-[#5f5d54] mt-2 leading-[1.6]">{exp.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {profile.education.length > 0 && (
              <div className="bg-white rounded-[20px] border border-[#eceae3] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-4 h-4 text-[#8a877b]" />
                  <h2 className="text-[14px] font-semibold text-[#26251f]">Education</h2>
                </div>
                <div className="flex flex-col gap-4">
                  {profile.education.map((edu) => (
                    <div key={edu.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-[8px] bg-[#f0ede8] flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[#5f5d54]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0a2412]">{edu.institution}</p>
                        {edu.degree && (
                          <p className="text-[12px] text-[#5f5d54]">
                            {edu.degree}{edu.field_of_study ? ` · ${edu.field_of_study}` : ""}
                          </p>
                        )}
                        {(edu.start_date || edu.end_date) && (
                          <p className="text-[11px] text-[#8a877b] mt-0.5">
                            {formatDate(edu.start_date)} — {formatDate(edu.end_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Match + Skills */}
          <div className="flex flex-col gap-5">

            {/* Match scores */}
            {fitScore !== null && (
              <div className="bg-white rounded-[20px] border border-[#eceae3] p-5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Job Match</p>
                <div className="flex justify-center gap-6 mb-4">
                  <ScoreRing score={fitScore} label="Fit Score" />
                </div>
                {matchingSkills.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[#8a877b] mb-1.5">Matches</p>
                    <div className="flex flex-wrap gap-1">
                      {matchingSkills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 bg-[#e8f2eb] text-[#0a2412] text-[10px] rounded-full">{sk}</span>
                      ))}
                    </div>
                  </div>
                )}
                {missingSkills.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[#8a877b] mb-1.5">Missing</p>
                    <div className="flex flex-wrap gap-1">
                      {missingSkills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 bg-[#f5f3ed] text-[#8a877b] text-[10px] rounded-full line-through">{sk}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All skills */}
            {profile.skills.length > 0 && (
              <div className="bg-white rounded-[20px] border border-[#eceae3] p-5">
                <div className="flex items-center gap-1.5 mb-4">
                  <Star className="w-4 h-4 text-[#8a877b]" />
                  <p className="text-[13px] font-semibold text-[#26251f]">Skills</p>
                </div>
                <div className="flex flex-col gap-4">
                  {Object.entries(skillsByCategory).map(([cat, skills]) => (
                    <div key={cat}>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-[#8a877b] mb-1.5">{cat}</p>
                      <div className="flex flex-wrap gap-1">
                        {skills.map((sk) => {
                          const isMatch = requiredSkills.length > 0 && profileSkillNames.includes(normalise(sk.name));
                          return (
                            <span
                              key={sk.name}
                              title={sk.level ?? ""}
                              className={`px-2 py-0.5 text-[11px] rounded-full ${
                                isMatch ? "bg-[#e8f2eb] text-[#0a2412]" : "bg-[#f5f3ed] text-[#5f5d54]"
                              }`}
                            >
                              {sk.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target roles */}
            {(profile.target_roles ?? []).length > 0 && (
              <div className="bg-white rounded-[20px] border border-[#eceae3] p-5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-3">Open To</p>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.target_roles ?? []).map((role) => (
                    <span key={role} className="px-2.5 py-1 bg-[#f5f3ed] text-[#5f5d54] text-[11px] rounded-full">{role}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
