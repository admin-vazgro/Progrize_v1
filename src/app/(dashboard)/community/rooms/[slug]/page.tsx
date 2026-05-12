import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import RoomPageClient from "@/components/community/RoomPageClient";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: room }, { data: profileRaw }, { data: memberships }] = await Promise.all([
    sb.from("rooms")
      .select("id, name, slug, description, is_private, member_count, post_count, creator_id")
      .eq("slug", slug)
      .single(),
    sb.from("profiles").select("full_name").eq("id", user.id).single(),
    sb.from("room_members")
      .select("room_id, role, rooms(id, name, slug)")
      .eq("user_id", user.id),
  ]);

  if (!room) notFound();

  const myMembership = (memberships ?? []).find(
    (m: { room_id: string }) => m.room_id === room.id
  );
  const joinedRooms = (memberships ?? [])
    .map((m: { rooms: { id: string; name: string; slug: string } | null }) => m.rooms)
    .filter(Boolean);

  return (
    <RoomPageClient
      room={room}
      userId={user.id}
      userName={profileRaw?.full_name ?? user.email?.split("@")[0] ?? "You"}
      userRole={myMembership?.role ?? null}
      joinedRooms={joinedRooms}
    />
  );
}
