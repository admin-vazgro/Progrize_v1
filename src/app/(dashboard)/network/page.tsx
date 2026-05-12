import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NetworkClient from "@/components/network/NetworkClient";

export default async function NetworkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Get pending received request count for badge
  const { count: pendingCount } = await sb
    .from("connection_requests")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("status", "pending");

  return <NetworkClient pendingCount={pendingCount ?? 0} />;
}
