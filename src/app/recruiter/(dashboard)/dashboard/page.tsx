import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MoreHorizontal, Megaphone, Users2, Briefcase, Building2 } from "lucide-react";
import { getActiveCompanyMembership } from "@/lib/recruiter-active-company";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Admin",
  admin: "Admin",
  hr: "Human Resource",
  social: "Social Media",
  recruiter: "Recruiter",
};

export default async function OrgDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/recruiter/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: membership } = await getActiveCompanyMembership(sb, user.id, "company_id, role, companies(*)");

  if (!membership) redirect("/recruiter/setup");

  const company = membership.companies as {
    id: string; name: string; logo_url: string | null; banner_url: string | null;
    industry: string | null; size: string | null; location: string | null;
    website: string | null; description: string | null;
  };
  const companyId = membership.company_id;

  // Profile completion (6 fields beyond name)
  const profileFields = [company.industry, company.size, company.location, company.website, company.description, company.logo_url];
  const completedSteps = profileFields.filter(Boolean).length;

  const [
    { count: activeJobCount },
    { count: communityPostCount },
    { data: recentJobs },
    { data: recentPosts },
    { data: teamRows },
  ] = await Promise.all([
    sb.from("job_postings").select("*", { count: "exact", head: true })
      .eq("company_id", companyId).eq("is_active", true),
    sb.from("company_posts").select("*", { count: "exact", head: true })
      .eq("company_id", companyId).eq("is_published", true),
    sb.from("job_postings")
      .select("id, title, location, work_mode, required_skills, employment_type, created_at")
      .eq("company_id", companyId).eq("is_active", true)
      .order("created_at", { ascending: false }).limit(2),
    sb.from("company_posts")
      .select("id, title, content, post_type, created_at, image_urls, author_id")
      .eq("company_id", companyId).eq("is_published", true)
      .order("created_at", { ascending: false }).limit(2),
    sb.from("company_members")
      .select("user_id, role, profiles(full_name, avatar_url, headline)")
      .eq("company_id", companyId)
      .order("joined_at", { ascending: true }).limit(6),
  ]);

  // Two-step author profile fetch (author_id → auth.users, not directly to profiles)
  type PostRow = { id: string; title: string | null; content: string; post_type: string; created_at: string; image_urls: string[] | null; author_id: string };
  type AuthorProfile = { id: string; full_name: string | null; avatar_url: string | null };
  const postRows = (recentPosts ?? []) as PostRow[];
  const authorIds = [...new Set(postRows.map((p) => p.author_id))];
  const profilesMap: Record<string, AuthorProfile> = {};
  if (authorIds.length > 0) {
    const { data: profilesData } = await sb.from("profiles").select("id, full_name, avatar_url").in("id", authorIds);
    (profilesData ?? []).forEach((p: AuthorProfile) => { profilesMap[p.id] = p; });
  }
  const postsWithAuthors = postRows.map((p) => ({ ...p, profiles: profilesMap[p.author_id] ?? null }));

  const stats: { label: string; value: string | number; iconBg: string; Icon: React.ElementType; href: string }[] = [
    { label: "Community Posts", value: communityPostCount ?? 0,     iconBg: "bg-[#e8f2eb]", Icon: Megaphone, href: "/recruiter/community" },
    { label: "Team Members",    value: (teamRows ?? []).length,      iconBg: "bg-[#f7fcca]", Icon: Users2,    href: "/recruiter/team" },
    { label: "Active Jobs",     value: activeJobCount ?? 0,          iconBg: "bg-[#fceee4]", Icon: Briefcase, href: "/recruiter/jobs" },
    { label: "Company Size",    value: company.size ?? "—",          iconBg: "bg-[#e8edff]", Icon: Building2, href: "/recruiter/company-profile" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="px-8 py-8 max-w-[1320px]">

        {/* ── Welcome header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            {company.logo_url ? (
              <img src={company.logo_url} alt="" className="w-[42px] h-[42px] rounded-[10px] object-cover shrink-0" />
            ) : (
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#e8f2eb] flex items-center justify-center shrink-0">
                <span className="text-[20px] font-semibold text-[#0a2412]">{company.name[0]}</span>
              </div>
            )}
            <p className="text-[15px] text-[#97948a] italic">Welcome back</p>
          </div>
          <h1 className="text-[64px] font-normal leading-[67px] tracking-[-0.045em] text-[#0a2412]">
            {company.name}
          </h1>
          <p className="text-[15px] text-[#5f5d54] mt-2">Your organisation updates are here!</p>
        </div>

        {/* ── Profile completion bar ── */}
        {completedSteps < 6 && (
          <div className="bg-white rounded-[18px] px-6 py-[19px] mb-6 flex items-center gap-5">
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-center gap-3 whitespace-nowrap">
                <p className="text-[16px] font-medium text-[#0a2412]">Complete your organisation profile</p>
                <p className="text-[14px] text-[#97948a] italic">{completedSteps}/6 steps</p>
              </div>
              <div className="h-[3px] bg-[#eceae3] rounded-full w-full overflow-hidden">
                <div
                  className="h-full bg-[#0a2412] rounded-full transition-all"
                  style={{ width: `${(completedSteps / 6) * 100}%` }}
                />
              </div>
            </div>
            <Link
              href="/recruiter/settings"
              className="flex items-center justify-center h-[42px] px-5 bg-[#0a2412] text-white text-[14px] font-medium rounded-[8px] whitespace-nowrap hover:bg-[#142e1c] transition-colors shrink-0"
            >
              Continue ›
            </Link>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="flex gap-4 items-start">

          {/* Left column */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4">
              {stats.map(({ label, value, iconBg, Icon, href }) => (
                <Link key={label} href={href} className="bg-white rounded-[20px] px-6 pt-6 pb-5 group hover:shadow-sm transition-shadow flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className={`w-[32px] h-[32px] rounded-[8px] ${iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className="w-[15px] h-[15px] text-[#0a2412]" />
                    </div>
                    <span className="text-[24px] text-[#97948a] group-hover:text-[#0a2412] transition-colors leading-none">›</span>
                  </div>
                  <div>
                    <p className="text-[36px] font-normal text-[#0a2412] leading-none tabular-nums">{value}</p>
                    <p className="text-[14px] text-[#0a2412] mt-1">{label}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Recent job posts */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[20px] font-normal text-[#0a2412] tracking-[-0.2px]">Recent job posts</p>
                <Link href="/recruiter/jobs" className="text-[14px] text-[#504e46] hover:text-[#0a2412] transition-colors">View all →</Link>
              </div>

              <div className="bg-white rounded-[22px] p-6">
                {(recentJobs ?? []).length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-[13px] text-[#8a877b] mb-2">No active job posts yet</p>
                    <Link href="/recruiter/jobs/new" className="text-[13px] font-medium text-[#0a2412] hover:underline">Post your first job</Link>
                  </div>
                ) : (
                  <div className="flex gap-[10px]">
                    {(recentJobs ?? []).map((job: {
                      id: string; title: string; location: string | null;
                      work_mode: string | null; required_skills: string[] | null;
                      employment_type: string | null; created_at: string;
                    }) => (
                      <div key={job.id} className="flex-1 bg-[#fafaf8] border border-[#fefefe] rounded-[14px] p-5 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center gap-3 overflow-hidden">
                          {company.logo_url ? (
                            <img src={company.logo_url} alt="" className="w-[41px] h-[41px] rounded-[10px] object-cover shrink-0" />
                          ) : (
                            <div className="w-[41px] h-[41px] rounded-[10px] bg-[#e8f2eb] flex items-center justify-center shrink-0">
                              <span className="text-[16px] font-semibold text-[#0a2412]">{company.name[0]}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[17px] font-semibold text-[#0a2412] leading-[20px] truncate">{job.title}</p>
                            <p className="text-[12px] text-[#5f5d54] leading-[16px] truncate">
                              {[company.name, job.location, job.employment_type].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </div>
                        {/* Tags */}
                        {(job.required_skills ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-[6px]">
                            {(job.required_skills ?? []).slice(0, 3).map((skill: string) => (
                              <span key={skill} className="border border-[#eceae3] px-[9px] py-[3px] rounded-full text-[11px] font-medium text-[#5f5d54]">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Divider */}
                        <div className="h-px bg-[#eceae3]" />
                        {/* Footer */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-[#8a877b]">· {timeAgo(job.created_at)}</span>
                          <div className="flex-1" />
                          <Link
                            href={`/recruiter/jobs/${job.id}`}
                            className="bg-white border border-[#dddbd2] h-[33px] px-3 rounded-[10px] text-[12px] font-medium text-[#0a2412] hover:bg-[#f5f3ed] transition-colors"
                          >
                            view
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent community posts */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[20px] font-normal text-[#0a2412] tracking-[-0.2px]">Recent community posts</p>
                <Link href="/recruiter/community" className="text-[14px] text-[#504e46] hover:text-[#0a2412] transition-colors">View all →</Link>
              </div>

              <div className="bg-white rounded-[22px] p-6">
                {postsWithAuthors.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-[13px] text-[#8a877b] mb-2">No posts yet</p>
                    <Link href="/recruiter/community" className="text-[13px] font-medium text-[#0a2412] hover:underline">Create your first post</Link>
                  </div>
                ) : (
                  <div className="flex gap-[10px]">
                    {postsWithAuthors.map((post) => (
                      <div key={post.id} className="flex-1 bg-[#fafaf8] border border-[#fefefe] rounded-[14px] p-5 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center gap-3 overflow-hidden">
                          {company.logo_url ? (
                            <img src={company.logo_url} alt="" className="w-[41px] h-[41px] rounded-[10px] object-cover shrink-0" />
                          ) : (
                            <div className="w-[41px] h-[41px] rounded-[10px] bg-[#e8f2eb] flex items-center justify-center shrink-0">
                              <span className="text-[16px] font-semibold text-[#0a2412]">{company.name[0]}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[17px] font-semibold text-[#0a2412] leading-[20px] truncate">{company.name}</p>
                            <p className="text-[13px] text-[#5f5d54] leading-[19px]">{company.industry ?? "Organisation"}</p>
                          </div>
                          <button className="w-[30px] h-[30px] bg-white border border-[#eceae3] rounded-[10px] flex items-center justify-center shrink-0 hover:bg-[#f5f3ed] transition-colors">
                            <MoreHorizontal className="w-[15px] h-[15px] text-[#8a877b]" />
                          </button>
                        </div>
                        {/* Content */}
                        <p className="text-[13px] text-[#5f5d54] leading-[19px] line-clamp-4">{post.content}</p>
                        {/* Image */}
                        {(post.image_urls ?? []).length > 0 && (
                          <img
                            src={(post.image_urls ?? [])[0]}
                            alt=""
                            className="w-full aspect-video object-cover rounded-[14px]"
                          />
                        )}
                        {/* Divider */}
                        <div className="h-px bg-[#eceae3]" />
                        {/* Footer */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-[#8a877b]">{timeAgo(post.created_at)}</span>
                          {post.profiles?.full_name && (
                            <span className="text-[11px] font-mono text-[#8a877b]">
                              posted by <span className="underline">{post.profiles.full_name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="w-[284px] shrink-0 flex flex-col gap-8">

            {/* Analytics */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <p className="flex-1 text-[20px] font-normal text-[#0a2412] tracking-[-0.2px]">Analytics</p>
                <span className="text-[14px] text-[#504e46]">View all →</span>
              </div>
              <div className="bg-white rounded-[20px] px-6 pt-5 pb-5 flex flex-col">
                {[
                  { label: "Active jobs",     value: activeJobCount ?? 0 },
                  { label: "Posts published", value: communityPostCount ?? 0 },
                  { label: "Team members",    value: (teamRows ?? []).length },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} className={`flex items-center justify-between py-[14px] ${i < arr.length - 1 ? "border-b border-[#f5f4f0]" : ""}`}>
                    <p className="text-[13px] text-[#504e46]">{label}</p>
                    <p className="text-[17px] font-semibold text-[#0a2412] tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin / Team */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <p className="flex-1 text-[20px] font-normal text-[#0a2412] tracking-[-0.2px]">Admin</p>
                <Link href="/recruiter/team" className="text-[14px] text-[#504e46] hover:text-[#0a2412] transition-colors">View all →</Link>
              </div>
              <div className="bg-white rounded-[20px] px-6 py-5 flex flex-col">
                {/* Current account row */}
                <div className="flex items-center gap-[10px] pb-[14px]">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="" className="w-[33px] h-[33px] rounded-[10px] object-cover shrink-0" />
                  ) : (
                    <div className="w-[33px] h-[33px] rounded-[10px] bg-[#e8f2eb] flex items-center justify-center shrink-0">
                      <span className="text-[13px] font-semibold text-[#0a2412]">{company.name[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#0a2412] leading-[16px] truncate">
                      {company.name} <span className="font-normal text-[#8a877b]">( This Account )</span>
                    </p>
                    <p className="text-[11px] text-[#8a877b] leading-[14px]">Admin</p>
                  </div>
                </div>
                {/* Team members */}
                {(teamRows ?? []).map((m: {
                  user_id: string;
                  role: string;
                  profiles: { full_name: string | null; avatar_url: string | null; headline: string | null } | null;
                }) => {
                  if (["owner", "admin"].includes(m.role) && m.user_id === user.id) return null;
                  const name = m.profiles?.full_name ?? "Team member";
                  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                  return (
                    <div key={m.user_id} className="flex items-center gap-[10px] border-t border-[#eceae3] pt-[14px] pb-[0px] mt-[0px] first:mt-0 mb-[14px] last:mb-0">
                      {m.profiles?.avatar_url ? (
                        <img src={m.profiles.avatar_url} alt="" className="w-[33px] h-[33px] rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-[33px] h-[33px] rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[11px] font-bold shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#0a2412] leading-[16px] truncate">{name}</p>
                        <p className="text-[11px] text-[#8a877b] leading-[14px] truncate">{ROLE_LABEL[m.role] ?? m.role}</p>
                      </div>
                    </div>
                  );
                })}
                {(teamRows ?? []).filter((m: { user_id: string; role: string }) =>
                  !(["owner", "admin"].includes(m.role) && m.user_id === user.id)
                ).length === 0 && (
                  <div className="border-t border-[#eceae3] pt-[14px]">
                    <p className="text-[12px] text-[#8a877b] text-center py-2">No team members yet</p>
                    <Link href="/recruiter/settings" className="block text-center text-[12px] font-medium text-[#0a2412] hover:underline">
                      Add team members →
                    </Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
