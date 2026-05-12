import Groq from "groq-sdk";
import { z } from "zod";
import type { ParsedResume } from "@/types/profile";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Coerce null/undefined to "" so the schema never rejects missing string fields
const str = z.string().nullable().optional().transform((v) => v ?? "");
const num = z.number().nullable().optional().transform((v) => v ?? 0);
const bool = z.boolean().nullable().optional().transform((v) => v ?? false);
const strArr = z.array(z.string().nullable().optional().transform((v) => v ?? "")).optional().default([]);

const ParsedResumeSchema = z.object({
  full_name: str,
  headline: str,
  email: str,
  phone: str,
  location: str,
  linkedin_url: str,
  portfolio_url: str,
  summary: str,
  years_experience: num,
  experience: z.array(z.object({
    company_name: str,
    job_title: str,
    start_date: str,
    end_date: str,
    is_current: bool,
    location: str,
    description: str,
    achievements: strArr,
  })).optional().default([]),
  education: z.array(z.object({
    institution: str,
    degree: str,
    field_of_study: str,
    start_date: str,
    end_date: str,
  })).optional().default([]),
  skills: z.array(z.object({
    name: str,
    category: str,
    level: str,
    years_used: num,
  })).optional().default([]),
  certifications: z.array(z.object({
    name: str,
    issuer: str,
    issue_date: str,
  })).optional().default([]),
});

export async function parseResume(text: string): Promise<ParsedResume> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You are a resume parser. Extract every detail from the resume and return a single JSON object.

IMPORTANT: Never return null for string fields — use "" instead. Never omit array fields — use [] instead.

Date format: YYYY-MM (e.g. "2021-03"). If only a year is given, use YYYY-01. If unknown, use "".

Return exactly this JSON structure:
{
  "full_name": "",
  "headline": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin_url": "",
  "portfolio_url": "",
  "summary": "",
  "years_experience": 0,
  "experience": [
    {
      "company_name": "",
      "job_title": "",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or empty if current",
      "is_current": false,
      "location": "",
      "description": "",
      "achievements": ["bullet 1", "bullet 2"]
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field_of_study": "",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM"
    }
  ],
  "skills": [
    {
      "name": "",
      "category": "technical|tool|framework|language|soft|domain",
      "level": "beginner|intermediate|advanced|expert",
      "years_used": 0
    }
  ],
  "certifications": [
    { "name": "", "issuer": "", "issue_date": "YYYY-MM" }
  ]
}`,
      },
      {
        role: "user",
        content: `Parse this resume and extract ALL experience, education, and skills:\n\n${text}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  // Validate and coerce — schema defaults handle missing/null fields
  return ParsedResumeSchema.parse(raw) as ParsedResume;
}
