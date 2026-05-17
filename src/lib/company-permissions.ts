import type { CompanyRole } from "@/types/recruiter";

export const COMPANY_PERMISSIONS = [
  "company.manage_profile",
  "company.manage_members",
  "company.manage_teams",
  "company.create_posts",
  "company.manage_posts",
  "company.create_jobs",
  "company.manage_recruitments",
  "company.view_pipeline",
] as const;

export type CompanyPermission = (typeof COMPANY_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<CompanyRole, CompanyPermission[]> = {
  owner: [...COMPANY_PERMISSIONS],
  admin: [...COMPANY_PERMISSIONS],
  hr: [
    "company.create_jobs",
    "company.manage_recruitments",
    "company.view_pipeline",
    "company.create_posts",
  ],
  social: ["company.create_posts", "company.manage_posts"],
  recruiter: [
    "company.create_jobs",
    "company.manage_recruitments",
    "company.view_pipeline",
  ],
};

export function permissionsForRole(role: CompanyRole): CompanyPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasCompanyPermission(
  role: string | null | undefined,
  permissions: string[] | null | undefined,
  permission: CompanyPermission
): boolean {
  if (role === "owner" || role === "admin") return true;
  return permissions?.includes(permission) ?? false;
}
