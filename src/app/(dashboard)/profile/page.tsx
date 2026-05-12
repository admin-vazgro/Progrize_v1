import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfilePage from "@/components/profile/ProfilePage";

export default async function Profile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [
    { data: profile },
    { data: experience },
    { data: education },
    { data: profileSkills },
    { data: resumeFiles },
    { data: rooms },
  ] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).single(),
    sb.from("experience_items").select("*").eq("user_id", user.id).order("sort_order"),
    sb.from("education_items").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
    sb.from("profile_skills").select("*, skills(name, category)").eq("user_id", user.id),
    sb.from("resume_files").select("id, file_name, file_size_bytes, parse_status, uploaded_at, parsed_at").eq("user_id", user.id).order("uploaded_at", { ascending: false }),
    sb.from("room_members").select("rooms(id, name, slug, member_count)").eq("user_id", user.id).limit(5),
  ]);

  const skills = (profileSkills ?? []).map((ps: { skills: { name: string } | null }) => ps.skills?.name).filter(Boolean) as string[];
  const userRooms = (rooms ?? []).map((r: { rooms: { id: string; name: string; slug: string; member_count: number } | null }) => r.rooms).filter(Boolean);
  const isProfileComplete = !!(profile?.full_name && profile?.headline && (experience ?? []).length > 0);

  return (
    <ProfilePage
      profile={profile}
      experience={experience ?? []}
      education={education ?? []}
      skills={skills}
      rooms={userRooms}
      resumeFiles={resumeFiles ?? []}
      hasCV={(resumeFiles ?? []).length > 0}
      isProfileComplete={isProfileComplete}
      userId={user.id}
    />
  );
}
