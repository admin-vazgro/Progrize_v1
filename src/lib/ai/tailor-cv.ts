import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const str = z.string().nullable().optional().transform((v) => v ?? "");
const bool = z.union([z.boolean(), z.array(z.unknown()), z.null(), z.undefined()])
  .transform((v) => (typeof v === "boolean" ? v : false));
const strArr = z.array(z.string().nullable().optional().transform((v) => v ?? ""))
  .optional()
  .default([]);

const TailoredCVSchema = z.object({
  headline: str,
  summary: str,
  experience: z.array(z.object({
    company_name: str,
    job_title: str,
    start_date: str,
    end_date: str,
    is_current: bool,
    rewritten_bullets: strArr,
    original_kept: bool,
  })).optional().default([]),
  skills_to_highlight: strArr,
  skills_to_add: strArr,
  missing_skills_gap: strArr,
  key_changes: strArr,
});

export type TailoredCV = z.infer<typeof TailoredCVSchema>;

interface JobDetailsContext {
  required_skills?: string[];
  nice_to_have?: string[];
  responsibilities?: string[];
  qualifications?: string[];
  seniority?: string;
  employment_type?: string;
}

interface TailorInput {
  profileJson: object;
  jobDescription: string;
  parsedJobJson: object;
  jobDetails?: JobDetailsContext | null;
}

function buildStructuredTargets(d: JobDetailsContext): string {
  const lines: string[] = [];

  if (d.seniority) {
    lines.push(`SENIORITY LEVEL: ${d.seniority}`);
    lines.push(`- Calibrate scope and tone to match this level. A Senior role needs strategic language; a Mid-level role needs ownership language; Junior needs enthusiasm and learning.`);
  }

  if (d.required_skills?.length) {
    lines.push(`\nREQUIRED SKILLS CHECKLIST — must appear in bullets where genuinely demonstrated:`);
    d.required_skills.forEach((s) => lines.push(`  • ${s}`));
    lines.push(`For each skill the candidate genuinely has, ensure at least one bullet uses that skill's exact terminology.`);
  }

  if (d.responsibilities?.length) {
    lines.push(`\nRESPONSIBILITIES LANGUAGE — mirror this phrasing in rewritten bullets:`);
    d.responsibilities.slice(0, 8).forEach((r) => lines.push(`  – ${r}`));
    lines.push(`Use the verbs and domain terms from the above when rewriting bullets — this is what the ATS will scan.`);
  }

  if (d.nice_to_have?.length) {
    lines.push(`\nNICE-TO-HAVE — surface in bullets if genuinely present in the candidate's history:`);
    d.nice_to_have.slice(0, 6).forEach((s) => lines.push(`  ○ ${s}`));
  }

  if (d.qualifications?.length) {
    lines.push(`\nQUALIFICATIONS EXPECTED:`);
    d.qualifications.slice(0, 4).forEach((q) => lines.push(`  ✓ ${q}`));
    lines.push(`Reference matching credentials in the summary if the candidate has them.`);
  }

  return lines.join("\n");
}

export async function tailorCV(input: TailorInput): Promise<TailoredCV> {
  const structuredBlock = input.jobDetails
    ? `\n\n--- STRUCTURED JOB REQUIREMENTS (extracted from job posting) ---\n${buildStructuredTargets(input.jobDetails)}\n---`
    : "";

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert CV tailoring assistant. Given a candidate profile and a target job description, rewrite the CV so it speaks directly to that role — without inventing anything.

HEADLINE rules (most important):
- The headline MUST reference or lean toward the target job title. Bridge the candidate's actual background to what the employer is hiring for.
- Format: "[Candidate's genuine role] | [Angle toward target role]"
- Examples: if target is "Salesforce Developer" and candidate is "Product Designer", write "Product Designer | CRM & Business Solution Design" — not just "Product Designer".
- NEVER copy the headline from the profile unchanged if it doesn't mention the target role or domain.

SUMMARY rules:
- Rewrite to lead with the skills and experience most relevant to the target role.
- Mention the target role domain (e.g. "Salesforce", "cloud infrastructure", "data engineering") using only the candidate's real background.
- Keep it honest: don't claim the candidate IS a [target role] if they're not — but position their strengths toward it.
- If qualifications match those expected, reference them in the summary.

EXPERIENCE rules:
- NEVER invent experience, skills, certifications, or metrics not in the original profile.
- Use the required skills' EXACT terminology in bullets wherever the candidate genuinely has that experience.
- Mirror the job's responsibility language — same verbs, same domain terms — the ATS scans for these.
- Reorder bullets within each role to lead with the most relevant to the target job.
- Quantify impact wherever the original has numbers or hints at scale.
- skills_to_add: only skills genuinely demonstrated in their experience.
- missing_skills_gap: skills truly absent from the candidate's background (be honest).
- key_changes: concise list of what changed and why, including the headline repositioning.

Return a JSON object with exactly these fields:
headline, summary,
experience (array of: company_name, job_title, start_date, end_date, is_current, rewritten_bullets[], original_kept),
skills_to_highlight[], skills_to_add[], missing_skills_gap[], key_changes[]`,
      },
      {
        role: "user",
        content: `Candidate profile:\n${JSON.stringify(input.profileJson, null, 2)}\n\nJob description:\n${input.jobDescription}\n\nParsed job data:\n${JSON.stringify(input.parsedJobJson, null, 2)}${structuredBlock}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");

  const parsed = JSON.parse(content);
  return TailoredCVSchema.parse(parsed);
}
