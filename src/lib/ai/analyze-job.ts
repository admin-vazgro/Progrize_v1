import Groq from "groq-sdk";
import { z } from "zod";
import type { ParsedJob } from "@/types/job";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ParsedJobSchema = z.object({
  company_name: z.string(),
  title: z.string(),
  location: z.string(),
  work_mode: z.string(),
  employment_type: z.string(),
  seniority: z.string(),
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
  salary_currency: z.string().nullable(),
  summary: z.string(),
  requirements: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  required_skills: z.array(z.string()).default([]),
  optional_skills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  years_experience_required: z.number().nullable(),
  education_required: z.string().nullable(),
});

export async function analyzeJobDescription(description: string): Promise<ParsedJob> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a precise job description parser. Extract all structured information and return valid JSON only.

Rules:
- work_mode: "remote" | "hybrid" | "onsite" | "unknown"
- employment_type: "full-time" | "part-time" | "contract" | "freelance" | "unknown"
- seniority: "intern" | "junior" | "mid" | "senior" | "lead" | "principal" | "director" | "executive" | "unknown"
- required_skills: must-have technical skills explicitly stated
- optional_skills: nice-to-have skills
- keywords: important domain terms, tools, methodologies (ATS-relevant)
- salary_min/max: null if not mentioned
- years_experience_required: null if not mentioned
- Use empty arrays [] where data is absent, never null for arrays

Return a JSON object with exactly these fields:
company_name, title, location, work_mode, employment_type, seniority,
salary_min, salary_max, salary_currency, summary, requirements[], responsibilities[],
required_skills[], optional_skills[], keywords[], benefits[],
years_experience_required, education_required`,
      },
      {
        role: "user",
        content: `Parse this job description:\n\n${description}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");

  const parsed = JSON.parse(content);
  return ParsedJobSchema.parse(parsed);
}
