import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Building2, Globe, MapPin, Users2, Briefcase, ExternalLink,
  Heart, Bell, ArrowRight, Megaphone,
} from "lucide-react";
import type { Company, CompanyPost } from "@/types/recruiter";

const POST_TYPE_META = {
  update:       { label: "Update",       Icon: Globe,      color: "text-[#0369a1]", bg: "bg-[#e0f2fe]" },
  hiring:       { label: "We're hiring", Icon: Briefcase,  color: "text-[#b45309]", bg: "bg-[#fef3c7]" },
  culture:      { label: "Culture",      Icon: Heart,      color: "text-[#be185d]", bg: "bg-[#fce7f3]" },
  announcement: { label: "Announcement", Icon: Bell,       color: "text-[#7c3aed]", bg: "bg-[#f3ecff]" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Job {
  id: string;
  title: string;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  seniority: string | null;
  posted_at: string;
}

export default async function PublicCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { id } = await params;

  const [
    { data: company },
    { data: jobs },
    { data: posts },
    { count: memberCount },
  ] = await Promise.all([
    sb.from("companies").select("*").eq("id", id).single(),
    sb.from("job_postings")
      .select("id, title, location, work_mode, employment_type, seniority, posted_at")
      .eq("company_id", id)
      .eq("is_active", true)
      .order("posted_at", { ascending: false })
      .limit(20),
    sb.from("company_posts")
      .select("id, company_id, author_id, title, content, image_urls, post_type, is_published, created_at, updated_at")
      .eq("company_id", id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(10),
    sb.from("company_members")
      .select("*", { count: "exact", head: true })
      .eq("company_id", id),
  ]);

  if (!company) redirect("/jobs");

  const typedCompany = company as Company;
  const typedJobs = (jobs ?? []) as Job[];

  type PostRow = Omit<CompanyPost, "author">;
  type AuthorProfile = { id: string; full_name: string | null; avatar_url: string | null };
  const postsData = (posts ?? []) as PostRow[];
  const authorIds = [...new Set(postsData.map((p) => p.author_id))] as string[];
  const profilesMap: Record<string, AuthorProfile> = {};
  if (authorIds.length > 0) {
    const { data: profilesData } = await sb.from("profiles").select("id, full_name, avatar_url").in("id", authorIds);
    (profilesData ?? []).forEach((p: AuthorProfile) => { profilesMap[p.id] = p; });
  }
  const typedPosts = postsData.map((p) => ({ ...p, author: profilesMap[p.author_id] ?? null })) as CompanyPost[];

  return (
    <div className="min-h-screen bg-[#fafaf8]" style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}>
      <div className="max-w-[1100px] mx-auto px-6 py-8">

        {/* Back */}
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-[12px] text-[#8a877b] hover:text-[#3d3c36] transition-colors mb-6">
          ← Back to jobs
        </Link>

        {/* Company hero */}
        <div className="bg-white rounded-[24px] p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-[16px] bg-[#e8f2eb] flex items-center justify-center shrink-0">
              {typedCompany.logo_url ? (
                <img src={typedCompany.logo_url} alt={typedCompany.name} className="w-full h-full object-cover rounded-[16px]" />
              ) : (
                <Building2 className="w-9 h-9 text-[#0a2412]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[30px] font-semibold text-[#0a2412] tracking-[-0.6px] mb-2">{typedCompany.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-3">
                {typedCompany.industry && (
                  <span className="text-[13px] text-[#5f5d54] bg-[#f5f3ed] px-3 py-1 rounded-full">{typedCompany.industry}</span>
                )}
                {typedCompany.location && (
                  <span className="flex items-center gap-1.5 text-[13px] text-[#8a877b]">
                    <MapPin className="w-3.5 h-3.5" /> {typedCompany.location}
                  </span>
                )}
                {typedCompany.size && (
                  <span className="flex items-center gap-1.5 text-[13px] text-[#8a877b]">
                    <Users2 className="w-3.5 h-3.5" /> {typedCompany.size} employees
                  </span>
                )}
                {memberCount && memberCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[13px] text-[#8a877b]">
                    <Users2 className="w-3.5 h-3.5" /> {memberCount} on platform
                  </span>
                )}
              </div>
              {typedCompany.website && (
                <a
                  href={typedCompany.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-[#0a2412] hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {typedCompany.website.replace(/^https?:\/\/(www\.)?/, "")}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {typedCompany.description && (
            <div className="mt-6 pt-6 border-t border-[#f5f3ed]">
              <p className="text-[14px] text-[#3d3c36] leading-[1.8]">{typedCompany.description}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* Posts feed */}
          <div>
            <h2 className="text-[16px] font-semibold text-[#0a2412] tracking-[-0.3px] mb-4">Company Updates</h2>

            {typedPosts.length === 0 ? (
              <div className="bg-white rounded-[20px] border border-dashed border-[#d4d0c8] p-10 text-center">
                <Megaphone className="w-7 h-7 text-[#c8c5bc] mx-auto mb-2" />
                <p className="text-[13px] text-[#8a877b]">No posts yet from this company.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {typedPosts.map((post) => {
                  const typeMeta = POST_TYPE_META[post.post_type] ?? POST_TYPE_META.update;
                  return (
                    <div key={post.id} className="bg-white rounded-[20px] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {post.author?.avatar_url ? (
                            <img src={post.author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#0a2412] flex items-center justify-center text-[#dee2df] text-[11px] font-bold">
                              {(post.author?.full_name ?? "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-[13px] font-semibold text-[#0a2412]">{post.author?.full_name ?? typedCompany.name}</p>
                            <p className="text-[11px] text-[#8a877b]">{formatDate(post.created_at)}</p>
                          </div>
                        </div>
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${typeMeta.bg} ${typeMeta.color}`}>
                          <typeMeta.Icon className="w-3 h-3" />
                          {typeMeta.label}
                        </span>
                      </div>
                      {post.title && (
                        <h3 className="text-[15px] font-semibold text-[#0a2412] tracking-[-0.3px] mb-2">{post.title}</h3>
                      )}
                      <p className="text-[13px] text-[#3d3c36] leading-[1.7] whitespace-pre-wrap">{post.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Open jobs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-[#0a2412] tracking-[-0.3px]">Open Roles</h2>
              <span className="text-[12px] text-[#8a877b]">{typedJobs.length} open</span>
            </div>

            {typedJobs.length === 0 ? (
              <div className="bg-white rounded-[20px] border border-dashed border-[#d4d0c8] p-8 text-center">
                <Briefcase className="w-6 h-6 text-[#c8c5bc] mx-auto mb-2" />
                <p className="text-[13px] text-[#8a877b]">No open positions right now.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {typedJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs?job=${job.id}`}
                    className="group bg-white rounded-[16px] p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#0a2412] leading-[18px] group-hover:underline">{job.title}</p>
                      <ArrowRight className="w-3.5 h-3.5 text-[#c8c5bc] shrink-0 mt-0.5 group-hover:text-[#0a2412] transition-colors" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {job.location && <span className="text-[11px] text-[#8a877b]">{job.location}</span>}
                      {job.work_mode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f5f3ed] text-[#5f5d54] capitalize">{job.work_mode}</span>
                      )}
                      {job.employment_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f5f3ed] text-[#5f5d54] capitalize">{job.employment_type}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
