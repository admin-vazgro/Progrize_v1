"use client";

import { MapPin, Briefcase, Link2, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import ConnectButton, { type Relationship } from "@/components/network/ConnectButton";

interface Experience {
  id: string;
  job_title: string;
  company_name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  achievements: unknown;
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
  full_name: string | null;
  headline: string | null;
  location: string | null;
  summary: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  phone: string | null;
  connection_count?: number;
  follower_count?: number;
}

interface ViewerState {
  currentUserId: string;
  relationship: Relationship;
  requestId?: string;
  following: boolean;
}

interface Props {
  profile: Profile;
  experience: Experience[];
  education: Education[];
  skills: string[];
  viewerState?: ViewerState;
  profileUserId?: string;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function PublicProfilePage({ profile, experience, education, skills, viewerState, profileUserId }: Props) {
  const name = profile.full_name ?? "Unknown";
  const currentRole = experience.find((e) => e.is_current) ?? experience[0];

  return (
    <div className="min-h-screen bg-[#f8fafb]">
      {/* Minimal top bar */}
      <header className="sticky top-0 z-40 bg-[#f8fafb] px-4 md:px-8 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <svg width="28" height="22" viewBox="0 0 57 45" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 43C0 36.3726 5.37258 31 12 31V31V45H1.11111C0.497461 45 0 44.5025 0 43.8889V43Z" fill="#1C1C1C"/>
              <path d="M14 30C14 21.1634 21.1634 14 30 14V14V45H16.4603C15.1015 45 14 43.8985 14 42.5397V30Z" fill="#1C1C1C"/>
              <path d="M32 24C32 11.8497 41.8497 2 54 2V2V45H35.4127C33.5279 45 32 43.4721 32 41.5873V24Z" fill="#1C1C1C"/>
            </svg>
          </Link>
          {!viewerState ? (
            <Link
              href="/login"
              className="px-4 py-2 rounded-[10px] bg-[#0a2412] text-[#dee2df] text-sm font-medium hover:bg-[#0a2412]/90 transition-colors"
            >
              Sign up free
            </Link>
          ) : (
            <Link
              href="/network"
              className="px-4 py-2 rounded-[10px] border border-[#eceae3] text-[#0a2412] text-sm font-medium hover:border-[#c0bdb4] transition-colors"
            >
              ← Network
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 flex gap-5 items-start">

        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Hero card */}
          <div className="bg-white rounded-[20px] overflow-hidden">
            <div
              className="h-[200px]"
              style={profile.cover_url
                ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: "linear-gradient(135deg, #1c5030 0%, #0a2412 100%)" }}
            />
            <div className="px-7 pb-8">
              <div className="flex items-end justify-between -mt-[54px] mb-5">
                <div
                  className="w-[108px] h-[108px] rounded-full border-4 border-[#c1cc5a] flex items-center justify-center text-white text-2xl font-bold shrink-0 overflow-hidden"
                  style={profile.avatar_url
                    ? { backgroundImage: `url(${profile.avatar_url})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#2d6a4f" }
                    : { backgroundColor: "#2d6a4f" }}
                >
                  {!profile.avatar_url && getInitials(profile.full_name)}
                </div>

                {/* Action buttons for authenticated viewers */}
                {viewerState && profileUserId && (
                  <div className="pt-[60px]">
                    <ConnectButton
                      targetUserId={profileUserId}
                      initialRelationship={viewerState.relationship}
                      initialRequestId={viewerState.requestId}
                      initialFollowing={viewerState.following}
                    />
                  </div>
                )}
              </div>

              <h1 className="text-[22px] font-bold text-[#0a2412] tracking-tight leading-none">{name}</h1>
              {profile.headline && (
                <p className="text-[16px] font-medium text-[#292929] mt-2">{profile.headline}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                {currentRole && (
                  <span className="flex items-center gap-1.5 text-sm text-[#4b4b4b]">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    {currentRole.job_title} · {currentRole.company_name}
                  </span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1 text-sm text-[#808080]">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />{profile.location}
                  </span>
                )}
                {profile.portfolio_url && (
                  <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-[#808080] hover:text-[#0a2412] transition-colors">
                    <Link2 className="w-3.5 h-3.5" />
                    {profile.portfolio_url.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>

              {/* Social counts */}
              {((profile.connection_count ?? 0) > 0 || (profile.follower_count ?? 0) > 0) && (
                <div className="flex gap-4 mt-4">
                  {(profile.connection_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-[#4b4b4b]">
                      <Users className="w-3.5 h-3.5 text-[#8a877b]" />
                      <span className="font-semibold text-[#0a2412]">{profile.connection_count}</span> connections
                    </span>
                  )}
                  {(profile.follower_count ?? 0) > 0 && (
                    <span className="text-sm text-[#4b4b4b]">
                      <span className="font-semibold text-[#0a2412]">{profile.follower_count}</span> followers
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* About */}
          {profile.summary && (
            <div className="bg-white rounded-[20px] px-7 py-6">
              <h2 className="text-xs font-bold text-[#808080] uppercase tracking-wider mb-3">About</h2>
              <p className="text-sm text-[#4b4b4b] leading-relaxed whitespace-pre-wrap">{profile.summary}</p>
            </div>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div className="bg-white rounded-[20px] overflow-hidden">
              <div className="px-7 pt-6 pb-4 border-b border-[#f5f5f5]">
                <h2 className="text-xs font-bold text-[#808080] uppercase tracking-wider">Experience</h2>
              </div>
              <div className="px-7 pb-4 divide-y divide-[#f5f5f5]">
                {experience.map((exp) => {
                  const achievements = Array.isArray(exp.achievements) ? exp.achievements as string[] : [];
                  return (
                    <div key={exp.id} className="py-5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-base font-bold text-[#1c1c1c] leading-snug">{exp.job_title}</p>
                        {exp.is_current && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-[4px] bg-[#f7fcca] text-[#0a2412] uppercase tracking-wide">Now</span>
                        )}
                      </div>
                      <p className="text-sm text-[#4b4b4b] mt-0.5">
                        {exp.company_name}
                        {exp.location && <span className="text-[#a0a0a0]"> · {exp.location}</span>}
                      </p>
                      <p className="text-xs text-[#a0a0a0] mt-0.5">
                        {fmtDate(exp.start_date)} – {exp.is_current ? "Present" : fmtDate(exp.end_date)}
                      </p>
                      {exp.description && (
                        <p className="text-sm text-[#4b4b4b] mt-2.5 leading-relaxed">{exp.description}</p>
                      )}
                      {achievements.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {achievements.map((bullet, i) => (
                            <li key={i} className="text-sm text-[#4b4b4b] flex gap-2 leading-relaxed">
                              <span className="shrink-0 text-[#c1cc5a] font-bold mt-[1px] select-none">·</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className="bg-white rounded-[20px] overflow-hidden">
              <div className="px-7 pt-6 pb-4 border-b border-[#f5f5f5]">
                <h2 className="text-xs font-bold text-[#808080] uppercase tracking-wider">Education</h2>
              </div>
              <div className="px-7 pb-4 divide-y divide-[#f5f5f5]">
                {education.map((edu) => (
                  <div key={edu.id} className="py-5">
                    <p className="text-base font-bold text-[#1c1c1c] leading-snug">{edu.degree ?? edu.institution}</p>
                    {edu.degree && (
                      <p className="text-sm text-[#4b4b4b] mt-0.5">
                        {edu.institution}{edu.field_of_study ? ` · ${edu.field_of_study}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-[#a0a0a0] mt-0.5">
                      {fmtDate(edu.start_date)} – {fmtDate(edu.end_date) || "Present"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-[280px] shrink-0 space-y-3 hidden lg:block">

          {skills.length > 0 && (
            <div className="bg-white rounded-[20px] px-5 py-4">
              <h3 className="text-[11px] font-semibold text-[#808080] uppercase tracking-wider mb-3">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span key={skill} className="text-[13px] px-3 py-1.5 rounded-[8px] bg-[#f7fcca] text-[#0a2412] font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(profile.linkedin_url || profile.portfolio_url) && (
            <div className="bg-white rounded-[20px] px-5 py-4">
              <h3 className="text-[11px] font-semibold text-[#808080] uppercase tracking-wider mb-3">Links</h3>
              <div className="space-y-2">
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#292929] hover:text-[#0a2412] transition-colors">
                    <div className="w-6 h-6 rounded-full bg-[#0077b5] flex items-center justify-center text-white text-[10px] font-bold shrink-0">in</div>
                    LinkedIn
                    <ExternalLink className="w-3 h-3 ml-auto text-[#a0a0a0]" />
                  </a>
                )}
                {profile.portfolio_url && (
                  <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#292929] hover:text-[#0a2412] transition-colors">
                    <div className="w-6 h-6 rounded-full bg-[#292929] flex items-center justify-center text-white text-[10px] font-bold shrink-0">↗</div>
                    Portfolio
                    <ExternalLink className="w-3 h-3 ml-auto text-[#a0a0a0]" />
                  </a>
                )}
              </div>
            </div>
          )}

          {!viewerState && (
            <div className="bg-[#0a2412] rounded-[20px] px-5 py-5 text-center">
              <p className="text-sm font-bold text-white mb-1">Join the platform</p>
              <p className="text-xs text-[#dee2df]/70 mb-4">Build your profile and match with jobs using AI.</p>
              <Link
                href="/login"
                className="block px-4 py-2 rounded-[10px] bg-[#c1cc5a] text-[#0a2412] text-sm font-semibold hover:bg-[#c1cc5a]/90 transition-colors"
              >
                Sign up free
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
