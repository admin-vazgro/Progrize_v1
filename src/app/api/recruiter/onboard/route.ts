import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "icloud.com", "live.com", "msn.com", "aol.com",
]);

function extractEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const body = await req.json();
  const { action, company_id, name, industry, size, website, location, domain, type, user_email } = body;

  const userEmail: string = user_email ?? user.email ?? "";
  const userDomain = extractEmailDomain(userEmail);
  const isPersonalEmail = PERSONAL_DOMAINS.has(userDomain);

  if (action === "join") {
    if (!company_id) return NextResponse.json({ error: "company_id required" }, { status: 400 });

    // Check if already a member
    const { data: existing } = await sb
      .from("company_members")
      .select("id")
      .eq("company_id", company_id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      const { data: company } = await sb.from("companies").select("*").eq("id", company_id).single();
      return NextResponse.json({ company, already_member: true });
    }

    // Fetch company to check domain
    const { data: company } = await sb
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .single();

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    // Domain mismatch — block the join
    if (company.domain && userDomain && company.domain !== userDomain) {
      return NextResponse.json({
        error: `Your email (@${userDomain}) doesn't match this company's domain (@${company.domain}). Ask your company admin for an invite link.`,
      }, { status: 403 });
    }

    const verifiedBy = company.domain && userDomain && company.domain === userDomain ? "domain" : "manual";

    const { error: joinError } = await sb.from("company_members").insert({
      company_id,
      user_id: user.id,
      role: "recruiter",
      verified_by: verifiedBy,
    });

    if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 });
    return NextResponse.json({ company });
  }

  if (action === "create") {
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const companyType = type === "agency" ? "agency" : "employer";

    // For employers: derive domain from work email if not explicitly provided
    let companyDomain: string | null = domain ?? null;
    if (companyType === "employer" && !companyDomain && userDomain && !isPersonalEmail) {
      companyDomain = userDomain;
    }

    const verifiedBy = companyDomain && userDomain && companyDomain === userDomain ? "domain" : "manual";

    const { data: company, error } = await sb
      .from("companies")
      .insert({
        name: name.trim(),
        industry: industry ?? null,
        size: size ?? null,
        website: website ?? null,
        location: location ?? null,
        domain: companyDomain,
        type: companyType,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { error: memberError } = await sb.from("company_members").insert({
      company_id: company.id,
      user_id: user.id,
      role: "admin",
      verified_by: verifiedBy,
    });

    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

    return NextResponse.json({ company }, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
