import { cookies } from "next/headers";

export async function getActiveCompanyId() {
  return (await cookies()).get("recruiter_company_id")?.value ?? null;
}

export async function getActiveCompanyMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  userId: string,
  select: string
) {
  const activeCompanyId = await getActiveCompanyId();

  async function queryMembership(companyId?: string | null) {
    let query = sb
      .from("company_members")
      .select(select)
      .eq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1);

    if (companyId) query = query.eq("company_id", companyId);
    return query.maybeSingle();
  }

  const activeResult = await queryMembership(activeCompanyId);
  if (activeResult.data || !activeCompanyId) return activeResult;

  return queryMembership();
}
