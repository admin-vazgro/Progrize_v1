import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface ReedJob {
  jobId: number;
  employerName: string;
  jobTitle: string;
  locationName: string;
  minimumSalary: number | null;
  maximumSalary: number | null;
  currency: string | null;
  date: string;
  jobDescription: string;
  jobUrl: string;
  contractType: string | null;
  partTime: boolean;
}

async function searchReed(keywords: string, location: string, take = 20): Promise<ReedJob[]> {
  const apiKey = process.env.REED_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    keywords,
    resultsToTake: String(take),
    ...(location ? { locationName: location } : {}),
  });

  const res = await fetch(
    `https://www.reed.co.uk/api/1.0/search?${params}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // cache 5 min
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []) as ReedJob[];
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const keywords = searchParams.get("keywords") ?? "";
    const location = searchParams.get("location") ?? "";

    if (!keywords.trim()) {
      return NextResponse.json({ error: "keywords required" }, { status: 400 });
    }

    const jobs = await searchReed(keywords, location);
    return NextResponse.json({ jobs, source: "reed", total: jobs.length });
  } catch (err) {
    console.error("Job search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
