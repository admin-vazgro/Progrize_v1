import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { scoreLabel } from "@/lib/utils";
import TailorButton from "@/components/jobs/TailorButton";
import type { Database } from "@/types/database";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type MatchRow = Database["public"]["Tables"]["job_matches"]["Row"];

export default async function JobResultPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: jobRaw } = await (supabase as any).from("jobs").select("*").eq("id", jobId).single();
  const job = jobRaw as JobRow | null;
  if (!job) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: matchRaw } = await (supabase as any)
    .from("job_matches")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", user.id)
    .single();
  const match = matchRaw as MatchRow | null;

  if (!match) redirect("/analyze");

  type Explanation = {
    fit?: Record<string, number>;
    ats?: Record<string, number>;
    recommendations?: string[];
  };

  const explanation = (match.explanation ?? {}) as Explanation;
  const fit = explanation.fit ?? {};
  const ats = explanation.ats ?? {};
  const recommendations = explanation.recommendations ?? [];
  const missingSkills = (match.missing_skills ?? []) as string[];
  const missingKeywords = (match.missing_keywords ?? []) as string[];
  const matchingSkills = (match.strengths ?? []) as string[];

  const fitLabel = scoreLabel(match.fit_score);
  const atsLabel = scoreLabel(match.ats_score);

  return (
    <div className="p-8 max-w-3xl">
      {/* Back */}
      <Link href="/analyze" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> New analysis
      </Link>

      {/* Job header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <p className="text-muted-foreground mt-0.5">{job.company_name}</p>
          </div>
          <TailorButton jobId={job.id} jobTitle={job.title} />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {job.location && <Badge variant="outline">{job.location}</Badge>}
          {job.work_mode && <Badge variant="outline" className="capitalize">{job.work_mode}</Badge>}
          {job.employment_type && <Badge variant="outline" className="capitalize">{job.employment_type}</Badge>}
          {job.seniority && job.seniority !== "unknown" && (
            <Badge variant="outline" className="capitalize">{job.seniority}</Badge>
          )}
          {job.salary_min && (
            <Badge variant="outline">
              {job.salary_currency ?? "$"}{(job.salary_min / 1000).toFixed(0)}k
              {job.salary_max ? `–${(job.salary_max / 1000).toFixed(0)}k` : "+"}
            </Badge>
          )}
        </div>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Fit Score</p>
            <span className="text-xs text-muted-foreground">{fitLabel}</span>
          </div>
          <p className="text-5xl font-bold tracking-tight mb-3">{Math.round(match.fit_score)}</p>
          <Progress value={match.fit_score} className="h-1.5" />
        </div>

        <div className="rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Est. ATS</p>
            <span className="text-xs text-muted-foreground">{atsLabel}</span>
          </div>
          <p className="text-5xl font-bold tracking-tight mb-3">{Math.round(match.ats_score)}</p>
          <Progress value={match.ats_score} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-2">Estimated compatibility — not guaranteed</p>
        </div>
      </div>

      {/* Fit breakdown */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Fit breakdown</h2>
        <div className="space-y-3">
          {[
            { label: "Skill overlap", key: "skill_overlap" },
            { label: "Experience relevance", key: "experience_relevance" },
            { label: "Title similarity", key: "title_similarity" },
            { label: "Location match", key: "location_match" },
          ].map(({ label, key }) => {
            const val = Math.round((fit[key] as number | undefined) ?? 0);
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span>{label}</span>
                  <span className="font-mono text-xs">{val}</span>
                </div>
                <Progress value={val} className="h-1" />
              </div>
            );
          })}
        </div>
      </section>

      <Separator className="mb-8" />

      {/* ATS breakdown */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Estimated ATS breakdown</h2>
          <p className="text-xs text-muted-foreground">Estimates only</p>
        </div>
        <div className="space-y-3">
          {[
            { label: "Keyword coverage", key: "keyword_coverage" },
            { label: "Required skill coverage", key: "required_skill_coverage" },
            { label: "Section completeness", key: "section_completeness" },
            { label: "Measurable impact", key: "measurable_impact" },
            { label: "Role title alignment", key: "role_title_alignment" },
          ].map(({ label, key }) => {
            const val = Math.round((ats[key] as number | undefined) ?? 0);
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span>{label}</span>
                  <span className="font-mono text-xs">{val}</span>
                </div>
                <Progress value={val} className="h-1" />
              </div>
            );
          })}
        </div>
      </section>

      <Separator className="mb-8" />

      {/* Skills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {matchingSkills.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <h2 className="text-sm font-semibold">Matching skills</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchingSkills.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          </section>
        )}

        {missingSkills.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Missing required skills</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingSkills.map((s) => (
                <Badge key={s} variant="outline" className="text-xs text-muted-foreground">{s}</Badge>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Missing keywords */}
      {missingKeywords.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Missing keywords</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These keywords appear in the job description but are absent from your CV.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingKeywords.map((k) => (
              <Badge key={k} variant="outline" className="text-xs text-muted-foreground">{k}</Badge>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Recommendations</h2>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-muted-foreground shrink-0 mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Separator className="mb-8" />

      {/* Job description */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Job description</h2>
        <div className="rounded-lg p-4 max-h-80 overflow-y-auto scrollbar-thin">
          <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
            {job.description_raw}
          </pre>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-3">
        <TailorButton jobId={job.id} jobTitle={job.title} />
        <Link href="/analyze">
          <Button variant="outline" size="sm">Analyse another job</Button>
        </Link>
      </div>
    </div>
  );
}
