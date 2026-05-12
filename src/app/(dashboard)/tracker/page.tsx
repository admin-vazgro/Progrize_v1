import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TrackerClient from "@/components/tracker/TrackerClient";

export default async function TrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TrackerClient />;
}
