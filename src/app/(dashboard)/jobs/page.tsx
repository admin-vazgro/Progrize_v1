import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JobsClient from "@/components/jobs/JobsClient";

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: profileRaw }, { data: skillsRaw }] = await Promise.all([
    sb.from("profiles").select("headline, location, target_roles, years_experience").eq("id", user.id).single(),
    sb.from("profile_skills").select("skills(name, category)").eq("user_id", user.id),
  ]);

  const profile = profileRaw as {
    headline: string | null;
    location: string | null;
    target_roles: string[] | null;
    years_experience: number | null;
  } | null;

  const skills = ((skillsRaw ?? []) as Array<{ skills: { name: string; category: string | null } | null }>)
    .map((ps) => ps.skills?.name ?? "")
    .filter(Boolean);

  // Default keywords: target_roles (explicit preference) → headline → first skill
  const defaultKeywords =
    profile?.target_roles?.length
      ? profile.target_roles[0]
      : profile?.headline?.trim()
        ? profile.headline.trim()
        : skills[0] ?? "";

  const defaultLocation = profile?.location?.split(/[,(]/)[0]?.trim() ?? "";

  return (
    <JobsClient
      skills={skills}
      defaultKeywords={defaultKeywords}
      defaultLocation={defaultLocation}
      hasProfile={skills.length > 0}
    />
  );
}
