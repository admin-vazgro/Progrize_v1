"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X, Briefcase, Users, UserCheck, Heart, MessageCircle,
  TrendingUp, ChevronRight, FileText, Upload, Plus, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import ProfileSetupModal from "./ProfileSetupModal";

interface Profile {
  full_name: string | null;
  headline: string | null;
  avatar_url: string | null;
  location: string | null;
  follower_count: number;
  following_count: number;
  connection_count: number;
  target_roles: string[] | null;
  salary_preferences: { min?: number; max?: number; currency?: string } | null;
}

interface Application {
  id: string;
  job_title: string;
  company_name: string;
  status: string;
  applied_at: string | null;
  salary_range: string | null;
  location: string | null;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface JobMatch {
  fit_score: number;
  ats_score: number;
  jobs: { title: string; company_name: string; salary_min: number | null; salary_max: number | null; salary_currency: string | null } | null;
}

interface Person {
  id: string;
  full_name: string | null;
  headline: string | null;
  avatar_url: string | null;
}

interface CV {
  id: string;
  file_name: string;
  parse_status: string;
  uploaded_at: string;
}

interface Room {
  id: string;
  name: string;
  slug: string;
  member_count: number;
}

interface Props {
  userName: string;
  profile: Profile | null;
  applications: Application[];
  totalApplications: number;
  posts: Post[];
  jobMatches: JobMatch[];
  statusCounts: Record<string, number>;
  skillsCount: number;
  experienceCount: number;
  cvCount: number;
  cvs: CV[];
  rooms: Room[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  saved:        { label: "Saved",        color: "#8a877b", bg: "#f5f4f0" },
  applied:      { label: "Applied",      color: "#0a2412", bg: "#e8f2eb" },
  interviewing: { label: "Interviewing", color: "#1a4fd6", bg: "#e8eeff" },
  offer:        { label: "Offer",        color: "#0a7854", bg: "#d1fae5" },
  rejected:     { label: "Rejected",     color: "#b91c1c", bg: "#fee2e2" },
};

function Avatar({ name, url, size = 36 }: { name: string | null; url: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (url) return <img src={url} alt={name ?? ""} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  return (
    <div className="rounded-full bg-[#0a2412] text-[#c6f46b] flex items-center justify-center font-bold shrink-0" style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {initials}
    </div>
  );
}

function PeopleModal({ title, endpoint, onClose }: { title: string; endpoint: string; onClose: () => void }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => setPeople(d.people ?? []))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-t-[24px] sm:rounded-[24px] w-full sm:max-w-[420px] mx-0 sm:mx-4 shadow-2xl max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#eceae3] shrink-0">
          <h2 className="text-[15px] font-bold text-[#0a2412]">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f0ede8] text-[#8a877b] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col gap-3 p-5">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-[#f5f4f0] rounded-[10px] animate-pulse" />)}
            </div>
          ) : !people?.length ? (
            <div className="py-16 text-center">
              <Users className="w-8 h-8 text-[#b0ae9f] mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-[#292929]">Nobody here yet</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#f5f4f0]">
              {people.map((p) => (
                <Link key={p.id} href={`/u/${p.id}`} onClick={onClose} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#fafaf8] transition-colors">
                  <Avatar name={p.full_name} url={p.avatar_url} size={38} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0a2412] truncate">{p.full_name ?? "Unknown"}</p>
                    {p.headline && <p className="text-[11px] text-[#8a877b] truncate">{p.headline}</p>}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#b0ae9f] shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({
  userName, profile, applications, totalApplications,
  posts, jobMatches, statusCounts,
  skillsCount, experienceCount, cvCount, cvs, rooms,
}: Props) {
  const [modal, setModal] = useState<"followers" | "following" | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupInitialStage, setSetupInitialStage] = useState<"intro" | "manual">("intro");

  const firstName = userName.split(" ")[0];
  const initials = userName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const steps = [
    {
      key: "headline",
      title: "Add your headline",
      description: "Tell recruiters who you are in one line.",
      href: "/profile",
      action: "Add now",
      done: !!profile?.headline,
    },
    {
      key: "location",
      title: "Add your location",
      description: "Helps match you with jobs in your area.",
      href: "/profile",
      action: "Add now",
      done: !!profile?.location,
    },
    {
      key: "skills",
      title: "Add your skills",
      description: "Powers AI job matching and fit scoring.",
      href: "/profile",
      action: "Add skills",
      done: skillsCount > 0,
    },
    {
      key: "experience",
      title: "Add work experience",
      description: "Builds credibility for recruiters viewing your profile.",
      href: "/profile",
      action: "Add experience",
      done: experienceCount > 0,
    },
    {
      key: "cv",
      title: "Upload your CV",
      description: "Apply to jobs directly from Progrize.",
      href: "/upload",
      action: "Upload CV",
      done: cvCount > 0,
    },
    {
      key: "roles",
      title: "Set target roles",
      description: "Get personalised job recommendations.",
      href: "/profile",
      action: "Set roles",
      done: (profile?.target_roles?.length ?? 0) > 0,
    },
  ];

  const completedSteps = steps.filter((s) => s.done).length;
  const totalSteps = steps.length;
  const profileIncomplete = completedSteps < totalSteps;

  useEffect(() => {
    if (profileIncomplete && !sessionStorage.getItem("setup_dismissed")) {
      setShowSetup(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salary insights
  const jobsWithSalary = jobMatches.filter((m) => m.jobs?.salary_min || m.jobs?.salary_max);
  const avgSalaryMin = jobsWithSalary.length
    ? Math.round(jobsWithSalary.reduce((s, m) => s + (m.jobs?.salary_min ?? 0), 0) / jobsWithSalary.length)
    : null;
  const avgSalaryMax = jobsWithSalary.length
    ? Math.round(jobsWithSalary.reduce((s, m) => s + (m.jobs?.salary_max ?? 0), 0) / jobsWithSalary.length)
    : null;
  const currency = jobsWithSalary[0]?.jobs?.salary_currency ?? "USD";
  const avgFit = jobMatches.length
    ? Math.round(jobMatches.reduce((s, m) => s + m.fit_score, 0) / jobMatches.length)
    : null;

  function formatSalary(n: number) {
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
    return `$${n}`;
  }

  const PIPELINE = ["saved", "applied", "interviewing", "offer", "rejected"] as const;
  const totalPipeline = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-[#fafaf8]">
      <div className="px-8 pt-8 pb-12 max-w-[1200px] mx-auto">

        {/* Greeting */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-[#0a2412] text-[#c6f46b] flex items-center justify-center text-[11px] font-bold shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={userName} className="w-full h-full rounded-full object-cover" />
                : initials}
            </div>
            <p className="text-[13px] text-[#8a877b]">
              {profile?.headline ?? "Welcome back"}
            </p>
          </div>
          <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">
            Hey, {firstName}!
          </h1>
        </div>

        {/* Compact profile completion banner */}
        {profileIncomplete && (
          <div className="bg-white rounded-[16px] px-5 py-4 mb-6 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[13px] font-medium text-[#0a2412]">Complete your profile</p>
                <span className="text-[11px] text-[#8a877b]">{completedSteps}/{totalSteps} steps</span>
              </div>
              <div className="w-full h-[3px] rounded-full bg-[#f0ede8] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#c6f46b] transition-all duration-500"
                  style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => { setSetupInitialStage("manual"); setShowSetup(true); }}
              className="h-[28px] px-3 rounded-[8px] bg-[#0a2412] text-white text-[11px] font-medium hover:bg-[#0a2412]/90 transition-colors flex items-center gap-1 shrink-0"
            >
              Continue
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/tracker" className="bg-white rounded-[20px] p-5 hover:shadow-sm transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-[8px] bg-[#e8f2eb] flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-[#0a2412]" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#b0ae9f] group-hover:text-[#0a2412] transition-colors" />
            </div>
            <p className="text-[32px] font-normal tracking-[-0.03em] text-[#0a2412] leading-none">{totalApplications}</p>
            <p className="text-[11px] text-[#8a877b] mt-1">Jobs Applied</p>
          </Link>

          <button onClick={() => setModal("followers")} className="bg-white rounded-[20px] p-5 hover:shadow-sm transition-shadow text-left group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-[8px] bg-[#f2fcda] flex items-center justify-center">
                <Users className="w-4 h-4 text-[#0a2412]" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#b0ae9f] group-hover:text-[#0a2412] transition-colors" />
            </div>
            <p className="text-[32px] font-normal tracking-[-0.03em] text-[#0a2412] leading-none">{profile?.follower_count ?? 0}</p>
            <p className="text-[11px] text-[#8a877b] mt-1">Followers</p>
          </button>

          <button onClick={() => setModal("following")} className="bg-white rounded-[20px] p-5 hover:shadow-sm transition-shadow text-left group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-[8px] bg-[#e8eeff] flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-[#1a4fd6]" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#b0ae9f] group-hover:text-[#0a2412] transition-colors" />
            </div>
            <p className="text-[32px] font-normal tracking-[-0.03em] text-[#0a2412] leading-none">{profile?.following_count ?? 0}</p>
            <p className="text-[11px] text-[#8a877b] mt-1">Following</p>
          </button>

          <Link href="/network" className="bg-white rounded-[20px] p-5 hover:shadow-sm transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-[8px] bg-[#fff0e8] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#c05200]" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#b0ae9f] group-hover:text-[#0a2412] transition-colors" />
            </div>
            <p className="text-[32px] font-normal tracking-[-0.03em] text-[#0a2412] leading-none">{profile?.connection_count ?? 0}</p>
            <p className="text-[11px] text-[#8a877b] mt-1">Connections</p>
          </Link>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">

          {/* Left column */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* Recent Applications */}
            <div className="bg-white rounded-[20px] p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none">Recent Applications</h2>
                <Link href="/tracker" className="text-[12px] font-medium text-[#5f5d54] hover:text-[#0a2412] transition-colors">
                  View all →
                </Link>
              </div>
              {applications.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-[#e8f2eb] to-[#c6dece] shadow-[0_4px_12px_rgba(10,36,18,0.12),0_1px_3px_rgba(10,36,18,0.08)] flex items-center justify-center mx-auto mb-4 text-2xl select-none">
                    💼
                  </div>
                  <p className="text-[14px] font-semibold text-[#292929] mb-1">No applications yet</p>
                  <p className="text-[12px] text-[#8a877b]">Track jobs you apply to in the tracker.</p>
                  <Link href="/tracker" className="mt-4 inline-flex h-[32px] px-4 items-center rounded-[8px] bg-[#0a2412] text-[#fafaf8] text-[12px] font-medium hover:bg-[#0a2412]/90 transition-colors">
                    Open Tracker
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col">
                  {applications.map((app, i) => {
                    const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.saved;
                    return (
                      <div key={app.id} className={`flex items-center gap-4 py-3.5 ${i < applications.length - 1 ? "border-b border-[#f5f4f0]" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#0a2412] truncate">{app.job_title}</p>
                          <p className="text-[12px] text-[#5f5d54] truncate mt-0.5">
                            {app.company_name}{app.location ? ` · ${app.location}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {app.salary_range && (
                            <span className="text-[11px] text-[#8a877b]">{app.salary_range}</span>
                          )}
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
                            style={{ color: cfg.color, backgroundColor: cfg.bg }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-[11px] text-[#b0ae9f]">{formatDistanceToNow(app.applied_at ?? app.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Posts */}
            <div className="bg-white rounded-[20px] p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none">Recent Posts</h2>
                <Link href="/community" className="text-[12px] font-medium text-[#5f5d54] hover:text-[#0a2412] transition-colors">
                  Go to community →
                </Link>
              </div>
              {posts.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-[#e8eeff] to-[#c4cef7] shadow-[0_4px_12px_rgba(26,79,214,0.12),0_1px_3px_rgba(26,79,214,0.08)] flex items-center justify-center mx-auto mb-4 text-2xl select-none">
                    💬
                  </div>
                  <p className="text-[14px] font-semibold text-[#292929] mb-1">No posts yet</p>
                  <p className="text-[12px] text-[#8a877b]">Share something with your community.</p>
                  <Link href="/community" className="mt-4 inline-flex h-[32px] px-4 items-center rounded-[8px] bg-[#0a2412] text-[#fafaf8] text-[12px] font-medium hover:bg-[#0a2412]/90 transition-colors">
                    Open Community
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col">
                  {posts.map((post, i) => (
                    <div key={post.id} className={`py-4 ${i < posts.length - 1 ? "border-b border-[#f5f4f0]" : ""}`}>
                      <p className="text-[13px] text-[#292929] leading-relaxed line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-[11px] text-[#8a877b]">
                          <Heart className="w-3 h-3" /> {post.like_count}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[#8a877b]">
                          <MessageCircle className="w-3 h-3" /> {post.comment_count}
                        </span>
                        <span className="text-[11px] text-[#b0ae9f] ml-auto">{formatDistanceToNow(post.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="w-[277px] shrink-0 hidden lg:flex flex-col gap-6">

            {/* CVs */}
            <div className="bg-white rounded-[20px] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-semibold text-[#0a2412] tracking-[-0.02em] leading-none">CVs</h3>
                <Link href="/upload" className="w-7 h-7 rounded-[8px] bg-[#f5f4f0] flex items-center justify-center hover:bg-[#e8f2eb] transition-colors">
                  <Plus className="w-3.5 h-3.5 text-[#0a2412]" />
                </Link>
              </div>
              {cvs.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[12px] text-[#8a877b] mb-3">No CVs uploaded yet</p>
                  <Link href="/upload" className="inline-flex h-[32px] px-4 items-center rounded-[8px] bg-[#0a2412] text-[#fafaf8] text-[12px] font-medium hover:bg-[#0a2412]/90 transition-colors">
                    Upload CV
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {cvs.map((cv) => {
                    const statusColor: Record<string, string> = {
                      completed: "text-[#0a7854] bg-[#d1fae5]",
                      failed: "text-[#b91c1c] bg-[#fee2e2]",
                      processing: "text-[#854d0e] bg-[#fef9c3]",
                      pending: "text-[#5f5d54] bg-[#f5f4f0]",
                    };
                    return (
                      <div key={cv.id} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[7px] bg-[#f5f4f0] flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-[#5f5d54]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-[#0a2412] truncate">{cv.file_name}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor[cv.parse_status] ?? statusColor.pending}`}>
                            {cv.parse_status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <Link href="/upload" className="flex items-center gap-1.5 text-[11px] text-[#8a877b] hover:text-[#0a2412] transition-colors mt-1">
                    <Upload className="w-3 h-3" /> Upload another
                  </Link>
                </div>
              )}
            </div>

            {/* Boards */}
            <div className="bg-white rounded-[20px] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-semibold text-[#0a2412] tracking-[-0.02em] leading-none">Boards</h3>
                <Link href="/community" className="w-7 h-7 rounded-[8px] bg-[#f5f4f0] flex items-center justify-center hover:bg-[#e8f2eb] transition-colors">
                  <Plus className="w-3.5 h-3.5 text-[#0a2412]" />
                </Link>
              </div>
              {rooms.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[12px] text-[#8a877b] mb-3">No boards joined yet</p>
                  <Link href="/community" className="inline-flex h-[32px] px-4 items-center rounded-[8px] bg-[#0a2412] text-[#fafaf8] text-[12px] font-medium hover:bg-[#0a2412]/90 transition-colors">
                    Browse rooms
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col">
                  {rooms.map((room, i) => (
                    <Link
                      key={room.id}
                      href={`/community/rooms/${room.slug}`}
                      className={`flex items-center justify-between py-2.5 hover:opacity-80 transition-opacity ${i < rooms.length - 1 ? "border-b border-[#f5f4f0]" : ""}`}
                    >
                      <span className="text-[13px] text-[#0a2412] font-medium truncate">{room.name}</span>
                      <span className="text-[11px] text-[#8a877b] shrink-0 ml-2">{room.member_count}</span>
                    </Link>
                  ))}
                  <Link href="/community" className="flex items-center gap-1 text-[11px] text-[#8a877b] hover:text-[#0a2412] transition-colors mt-3">
                    <ExternalLink className="w-3 h-3" /> Browse more
                  </Link>
                </div>
              )}
            </div>

            {/* Application Pipeline */}
            <div className="bg-white rounded-[20px] p-6">
              <h3 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none mb-5">Pipeline</h3>
              {totalPipeline === 0 ? (
                <p className="text-[13px] text-[#8a877b]">No applications tracked yet.</p>
              ) : (
                <div className="flex flex-col gap-0">
                  {PIPELINE.map((status, i) => {
                    const count = statusCounts[status] ?? 0;
                    const pct = totalPipeline > 0 ? Math.round((count / totalPipeline) * 100) : 0;
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <div key={status} className={`flex items-center gap-3 py-2.5 ${i < PIPELINE.length - 1 ? "border-b border-[#f5f4f0]" : ""}`}>
                        <span className="flex-1 text-[13px] text-[#292929]">{cfg.label}</span>
                        <div className="flex items-center gap-2">
                          {count > 0 && (
                            <div className="w-[60px] h-[4px] rounded-full bg-[#f0ede8] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                            </div>
                          )}
                          <span className="text-[12px] font-medium text-[#0a2412] w-5 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Salary Insights */}
            <div className="bg-white rounded-[20px] p-6">
              <h3 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none mb-5">Salary Insights</h3>
              {avgSalaryMin || avgSalaryMax ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[11px] text-[#8a877b] mb-1">Market range (from analysed jobs)</p>
                    <p className="text-[24px] font-normal tracking-[-0.03em] text-[#0a2412]">
                      {avgSalaryMin ? formatSalary(avgSalaryMin) : "–"}
                      <span className="text-[#8a877b] text-[18px]"> – </span>
                      {avgSalaryMax ? formatSalary(avgSalaryMax) : "–"}
                    </p>
                    <p className="text-[10px] text-[#b0ae9f] mt-1">
                      Avg. across {jobsWithSalary.length} analysed job{jobsWithSalary.length !== 1 ? "s" : ""} · {currency}
                    </p>
                  </div>
                  {profile?.salary_preferences?.min && (
                    <div className="border-t border-[#f5f4f0] pt-4">
                      <p className="text-[11px] text-[#8a877b] mb-1">Your target</p>
                      <p className="text-[18px] font-normal text-[#0a2412]">
                        {formatSalary(profile.salary_preferences.min)}
                        {profile.salary_preferences.max ? ` – ${formatSalary(profile.salary_preferences.max)}` : "+"}
                      </p>
                    </div>
                  )}
                </div>
              ) : profile?.salary_preferences?.min ? (
                <div>
                  <p className="text-[11px] text-[#8a877b] mb-1">Your target salary</p>
                  <p className="text-[24px] font-normal tracking-[-0.03em] text-[#0a2412]">
                    {formatSalary(profile.salary_preferences.min)}
                    {profile.salary_preferences.max ? ` – ${formatSalary(profile.salary_preferences.max)}` : "+"}
                  </p>
                  <p className="text-[11px] text-[#b0ae9f] mt-2">Analyse more jobs to see market data.</p>
                </div>
              ) : (
                <p className="text-[13px] text-[#8a877b]">
                  Analyse jobs or set a target salary in your profile to see insights.
                </p>
              )}
            </div>

            {/* Job Market */}
            <div className="bg-white rounded-[20px] p-6">
              <h3 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none mb-5">Job Market</h3>
              {jobMatches.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {avgFit !== null && (
                    <div>
                      <p className="text-[11px] text-[#8a877b] mb-1">Avg. fit score</p>
                      <div className="flex items-end gap-2">
                        <p className="text-[32px] font-normal tracking-[-0.03em] text-[#0a2412] leading-none">{avgFit}</p>
                        <p className="text-[13px] text-[#8a877b] mb-1">/ 100</p>
                      </div>
                      <div className="w-full h-[4px] rounded-full bg-[#f0ede8] mt-2 overflow-hidden">
                        <div className="h-full rounded-full bg-[#0a2412]" style={{ width: `${avgFit}%` }} />
                      </div>
                    </div>
                  )}
                  {profile?.target_roles && profile.target_roles.length > 0 && (
                    <div className="border-t border-[#f5f4f0] pt-4">
                      <p className="text-[11px] text-[#8a877b] mb-2">Targeting</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.target_roles.slice(0, 4).map((role) => (
                          <span key={role} className="text-[10px] font-medium px-2 py-0.5 rounded-[6px] bg-[#e8f2eb] text-[#0a2412]">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="border-t border-[#f5f4f0] pt-4">
                    <p className="text-[11px] text-[#8a877b] mb-1">Roles analysed</p>
                    <div className="flex flex-col gap-2">
                      {jobMatches.slice(0, 3).map((m, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-[#292929] truncate">{m.jobs?.title ?? "—"}</p>
                          </div>
                          <span className="text-[10px] font-mono text-[#8a877b] shrink-0">{Math.round(m.fit_score)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[13px] text-[#8a877b] mb-3">Analyse jobs to see how you stack up in the market.</p>
                  <Link href="/analyze" className="inline-flex h-[32px] px-4 items-center rounded-[8px] border border-[#dddbd2] text-[12px] font-medium text-[#0a2412] hover:bg-[#f5f4f0] transition-colors">
                    Analyse a job
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <PeopleModal
          title={modal === "followers" ? "Followers" : "Following"}
          endpoint={`/api/dashboard/${modal}`}
          onClose={() => setModal(null)}
        />
      )}

      {showSetup && (
        <ProfileSetupModal
          steps={steps}
          initialStage={setupInitialStage}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
