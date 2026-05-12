const COMPANY_COLORS = [
  "#0a2412", "#2d6a4f", "#1b4332", "#40916c",
  "#4b4b4b", "#292929", "#6b705c", "#3d405b",
];

export function companyColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % COMPANY_COLORS.length;
  return COMPANY_COLORS[h];
}
