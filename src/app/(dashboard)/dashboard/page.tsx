import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [
    { data: profileRaw },
    { data: applicationsRaw },
    { count: totalApplications },
    { data: postsRaw },
    { data: matchesRaw },
    { data: statusRaw },
    { count: skillsCount },
    { count: experienceCount },
    { data: cvsRaw },
    { data: roomsRaw },
    { count: liveFollowerCount },
    { count: liveFollowingCount },
    { count: liveConnectionCount },
  ] = await Promise.all([
    sb.from("profiles")
      .select("full_name, headline, avatar_url, location, follower_count, following_count, connection_count, target_roles, salary_preferences")
      .eq("id", user.id)
      .single(),

    sb.from("job_applications")
      .select("id, job_title, company_name, status, applied_at, salary_range, location, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),

    sb.from("job_applications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),

    sb.from("posts")
      .select("id, content, like_count, comment_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),

    sb.from("job_matches")
      .select("fit_score, ats_score, jobs(title, company_name, salary_min, salary_max, salary_currency)")
      .eq("user_id", user.id)
      .order("computed_at", { ascending: false })
      .limit(10),

    sb.from("job_applications")
      .select("status")
      .eq("user_id", user.id),

    sb.from("profile_skills")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),

    sb.from("experience_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),

    sb.from("resume_files")
      .select("id, file_name, parse_status, uploaded_at")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false }),

    sb.from("room_members")
      .select("rooms(id, name, slug, member_count)")
      .eq("user_id", user.id)
      .limit(5),

    sb.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    sb.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
    sb.from("connections").select("*", { count: "exact", head: true })
      .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`),
  ]);

  // Build status counts map
  const statusCounts: Record<string, number> = {};
  for (const row of (statusRaw ?? []) as { status: string }[]) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  const profile = profileRaw as {
    full_name: string | null;
    headline: string | null;
    avatar_url: string | null;
    location: string | null;
    follower_count: number;
    following_count: number;
    connection_count: number;
    target_roles: string[] | null;
    salary_preferences: { min?: number; max?: number; currency?: string } | null;
  } | null;

  if (profile) {
    profile.follower_count = liveFollowerCount ?? 0;
    profile.following_count = liveFollowingCount ?? 0;
    profile.connection_count = liveConnectionCount ?? 0;
  }

  const userName = profile?.full_name ?? user.email?.split("@")[0] ?? "there";

  const cvs = (cvsRaw ?? []) as { id: string; file_name: string; parse_status: string; uploaded_at: string }[];
  const rooms = ((roomsRaw ?? []) as Array<{ rooms: { id: string; name: string; slug: string; member_count: number } | null }>)
    .map((r) => r.rooms).filter(Boolean) as { id: string; name: string; slug: string; member_count: number }[];

  return (
    <DashboardClient
      userName={userName}
      profile={profile}
      applications={applicationsRaw ?? []}
      totalApplications={totalApplications ?? 0}
      posts={postsRaw ?? []}
      jobMatches={matchesRaw ?? []}
      statusCounts={statusCounts}
      skillsCount={skillsCount ?? 0}
      experienceCount={experienceCount ?? 0}
      cvCount={cvs.length}
      cvs={cvs}
      rooms={rooms}
    />
  );
}
