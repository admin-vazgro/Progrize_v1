import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PublicProfilePage from "@/components/profile/PublicProfilePage";
import type { Relationship } from "@/components/network/ConnectButton";

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function PublicProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = adminClient() as any;

  const [
    { data: profile },
    { data: experience },
    { data: education },
    { data: profileSkills },
  ] = await Promise.all([
    sb.from("profiles").select("full_name, headline, location, summary, avatar_url, cover_url, portfolio_url, linkedin_url, phone, connection_count, follower_count, following_count").eq("id", id).single(),
    sb.from("experience_items").select("*").eq("user_id", id).order("sort_order"),
    sb.from("education_items").select("*").eq("user_id", id).order("start_date", { ascending: false }),
    sb.from("profile_skills").select("*, skills(name)").eq("user_id", id),
  ]);

  if (!profile) notFound();

  const skills = (profileSkills ?? [])
    .map((ps: { skills: { name: string } | null }) => ps.skills?.name)
    .filter(Boolean) as string[];

  // Check if the viewer is authenticated and not viewing own profile
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  let viewerState: {
    currentUserId: string;
    relationship: Relationship;
    requestId?: string;
    following: boolean;
  } | undefined;

  if (user && user.id !== id) {
    const [a, b] = [user.id, id].sort();
    const [
      { data: connection },
      { data: pendingReq },
      { data: follow },
    ] = await Promise.all([
      sb.from("connections").select("id, request_id").eq("user_id_a", a).eq("user_id_b", b).single(),
      sb.from("connection_requests")
        .select("id, sender_id")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`)
        .eq("status", "pending")
        .single(),
      sb.from("follows").select("id").eq("follower_id", user.id).eq("following_id", id).single(),
    ]);

    let relationship: Relationship = "none";
    let requestId: string | undefined;

    if (connection) {
      relationship = "connected";
      requestId = connection.request_id;
    } else if (pendingReq) {
      relationship = pendingReq.sender_id === user.id ? "pending_sent" : "pending_received";
      requestId = pendingReq.id;
    }

    viewerState = { currentUserId: user.id, relationship, requestId, following: !!follow };
  }

  return (
    <PublicProfilePage
      profile={{ ...profile, connection_count: profile.connection_count ?? 0, follower_count: profile.follower_count ?? 0 }}
      experience={experience ?? []}
      education={education ?? []}
      skills={skills}
      viewerState={viewerState}
      profileUserId={id}
    />
  );
}
