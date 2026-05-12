import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const strArr = z
  .array(z.string().nullable().optional().transform((v) => v ?? ""))
  .optional()
  .default([]);

const JobDetailsSchema = z.object({
  responsibilities: strArr,
  required_skills: strArr,
  nice_to_have: strArr,
  qualifications: strArr,
  benefits: strArr,
  about_company: z.string().nullable().optional().transform((v) => v ?? ""),
  seniority: z.string().nullable().optional().transform((v) => v ?? ""),
  employment_type: z.string().nullable().optional().transform((v) => v ?? ""),
});

export type JobDetails = z.infer<typeof JobDetailsSchema>;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#[0-9]+;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchReedDetail(jobId: string): Promise<string | null> {
  const apiKey = process.env.REED_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`https://www.reed.co.uk/api/1.0/jobs/${jobId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.jobDescription ?? null;
}

async function parseWithAI(description: string): Promise<JobDetails> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract structured sections from a job description. Return JSON with exactly these fields:
- responsibilities: string[] (key duties, what you will do day-to-day, max 8 items)
- required_skills: string[] (must-have skills and experience, max 10 items)
- nice_to_have: string[] (preferred/bonus skills, max 6 items)
- qualifications: string[] (education, certifications, years of experience, max 6 items)
- benefits: string[] (perks, salary info, remote/hybrid, pension, holiday, max 8 items)
- about_company: string (1–2 sentence company overview, empty string if not mentioned)
- seniority: string (one of: Junior, Mid-level, Senior, Lead, Principal, Executive, or empty string)
- employment_type: string (one of: Permanent, Contract, Freelance, Internship, or empty string)

Rules:
- Extract ONLY what is explicitly stated — do not infer or invent
- Each item should be a concise phrase (not a full sentence)
- If a section has no content, return an empty array or empty string
- Strip bullet characters (•, -, *) from items`,
      },
      {
        role: "user",
        content: description,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return JobDetailsSchema.parse(JSON.parse(content));
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const jobId = req.nextUrl.searchParams.get("jobId");
    const rawDescription = req.nextUrl.searchParams.get("description") ?? "";

    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    // Try Reed detail endpoint first for full description
    const reedHtml = await fetchReedDetail(jobId);
    const description = reedHtml
      ? stripHtml(reedHtml)
      : stripHtml(rawDescription);

    if (!description.trim()) {
      return NextResponse.json({ error: "No job description available" }, { status: 400 });
    }

    const details = await parseWithAI(description);
    return NextResponse.json({ details });
  } catch (err) {
    console.error("Job details error:", err);
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
  }
}
