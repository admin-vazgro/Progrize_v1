"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";

export default function AnalyzePage() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!jobDescription.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: jobDescription,
          job_url: jobUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      router.push(`/analyze/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Analyze a job</h1>
        <p className="text-sm text-muted-foreground">
          Paste a job description below. We&apos;ll score your fit and estimate ATS compatibility instantly.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="url">Job URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="url"
            type="url"
            placeholder="https://company.com/careers/role"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jd">
            Job description <span className="text-muted-foreground font-normal">*</span>
          </Label>
          <Textarea
            id="jd"
            placeholder="Paste the full job description here. Include the role title, requirements, responsibilities, and any skills listed…"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={14}
            required
            className="font-mono text-xs leading-relaxed resize-y"
          />
          <p className="text-xs text-muted-foreground">
            {jobDescription.length > 0
              ? `${jobDescription.length} characters`
              : "Paste the complete posting for the best results"}
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading || !jobDescription.trim()} className="gap-2">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</>
          ) : (
            <><Search className="w-4 h-4" /> Analyse job</>
          )}
        </Button>
      </form>

      <div className="mt-10 pt-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          What you&apos;ll get
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Overall fit score (skill overlap, experience, title match, location)</li>
          <li>• Estimated ATS compatibility score with breakdown</li>
          <li>• Missing required skills and keywords</li>
          <li>• Matching skills to emphasise</li>
          <li>• Recommendations to improve your application</li>
          <li>• Option to generate a tailored CV version</li>
        </ul>
      </div>
    </div>
  );
}
