"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { TailoredCV } from "@/lib/ai/tailor-cv";

interface Props {
  jobId: string;
  jobTitle: string;
}

export default function TailorButton({ jobId, jobTitle }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TailoredCV | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function handleTailor() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to tailor CV");
      setResult(data.tailored);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <div className="flex flex-col gap-1">
        <Button onClick={handleTailor} disabled={loading} size="sm" className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Generating…" : "Generate tailored CV"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full mt-8 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold hover:bg-accent transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Tailored CV — {jobTitle}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-5 space-y-6">
          {/* Headline + summary */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Suggested headline</p>
            <p className="font-semibold">{result.headline}</p>
          </div>

          {result.summary && (
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Tailored summary</p>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>
          )}

          {/* Experience rewrites */}
          {result.experience.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Rewritten experience bullets</p>
              <div className="space-y-4">
                {result.experience.map((exp, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium">{exp.job_title} — {exp.company_name}</p>
                    <ul className="mt-1.5 space-y-1">
                      {exp.rewritten_bullets.map((b, j) => (
                        <li key={j} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills to highlight */}
          {result.skills_to_highlight.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Skills to highlight</p>
              <p className="text-sm text-muted-foreground">{result.skills_to_highlight.join(", ")}</p>
            </div>
          )}

          {/* Skills gap */}
          {result.missing_skills_gap.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Skills gap (honest)</p>
              <p className="text-sm text-muted-foreground">{result.missing_skills_gap.join(", ")}</p>
            </div>
          )}

          {/* Key changes */}
          {result.key_changes.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">What changed</p>
              <ul className="space-y-1">
                {result.key_changes.map((c, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="shrink-0">→</span><span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-4">
            This tailored CV is based solely on your actual profile. No experience or metrics were invented.
          </p>
        </div>
      )}
    </div>
  );
}
