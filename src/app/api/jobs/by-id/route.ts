import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const apiKey = process.env.REED_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  const res = await fetch(`https://www.reed.co.uk/api/1.0/jobs/${jobId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const d = await res.json();

  return NextResponse.json({
    job: {
      jobId: d.jobId,
      employerName: d.employerName ?? "",
      jobTitle: d.jobTitle ?? "",
      locationName: d.locationName ?? "",
      minimumSalary: d.minimumSalary ?? null,
      maximumSalary: d.maximumSalary ?? null,
      currency: d.currency ?? null,
      date: d.date ?? new Date().toISOString(),
      jobDescription: d.jobDescription ?? "",
      jobUrl: d.jobUrl ?? "",
      contractType: d.contractType ?? null,
      partTime: d.partTime ?? false,
    },
  });
}
