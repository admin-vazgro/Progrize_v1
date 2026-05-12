import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CommunityClient from "@/components/community/CommunityClient";

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: profileRaw }, { data: allRooms }, { data: memberships }] = await Promise.all([
    sb.from("profiles").select("full_name, headline, avatar_url").eq("id", user.id).single(),
    sb.from("rooms")
      .select("id, name, slug, description, member_count, is_private")
      .eq("is_private", false)
      .order("member_count", { ascending: false })
      .limit(30),
    sb.from("room_members").select("room_id").eq("user_id", user.id),
  ]);

  const joinedIds = new Set((memberships ?? []).map((m: { room_id: string }) => m.room_id));
  const rooms = allRooms ?? [];
  const joinedRooms = rooms.filter((r: { id: string }) => joinedIds.has(r.id));
  const discoverRooms = rooms.filter((r: { id: string }) => !joinedIds.has(r.id)).slice(0, 8);

  const profile = profileRaw as { full_name: string | null; headline: string | null; avatar_url: string | null } | null;

  return (
    <CommunityClient
      userId={user.id}
      userName={profile?.full_name ?? user.email?.split("@")[0] ?? "You"}
      userHeadline={profile?.headline ?? ""}
      userAvatarUrl={profile?.avatar_url ?? null}
      joinedRooms={joinedRooms}
      discoverRooms={discoverRooms}
    />
  );
}
