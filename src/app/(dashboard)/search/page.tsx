import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SearchClient from "@/components/search/SearchClient";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;

  return <SearchClient query={q ?? ""} />;
}
