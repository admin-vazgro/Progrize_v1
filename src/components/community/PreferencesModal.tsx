"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Design",
  "Marketing", "Product", "Engineering", "Data & AI", "Legal",
  "Consulting", "Media", "Retail", "Gaming", "Startups",
];

const TOPICS = [
  "Career Growth", "Job Search", "Interview Tips", "Remote Work",
  "Leadership", "Freelancing", "Networking", "Salary Negotiation",
  "Work-Life Balance", "Side Projects", "Learning & Upskilling",
];

const JOB_ROLES = [
  "Software Engineer", "Product Manager", "UX/UI Designer",
  "Data Scientist", "Marketing Manager", "Business Analyst",
  "DevOps Engineer", "Full Stack Developer", "Engineering Manager",
  "Frontend Developer", "Backend Developer", "Technical Writer",
];

interface Props {
  userId: string;
  onClose: () => void;
}

type Step = "industries" | "topics" | "roles";

const STEPS: Step[] = ["industries", "topics", "roles"];

export default function PreferencesModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("industries");
  const [selections, setSelections] = useState<Record<Step, string[]>>({
    industries: [],
    topics: [],
    roles: [],
  });
  const [saving, setSaving] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  function toggle(key: Step, value: string) {
    setSelections((prev) => {
      const set = new Set(prev[key]);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...prev, [key]: Array.from(set) };
    });
  }

  async function handleFinish() {
    setSaving(true);
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industries: selections.industries,
        topics: selections.topics,
        job_roles: selections.roles,
        onboarding_completed: true,
      }),
    }).catch(() => {});
    setSaving(false);
    onClose();
  }

  const options: Record<Step, string[]> = {
    industries: INDUSTRIES,
    topics: TOPICS,
    roles: JOB_ROLES,
  };

  const labels: Record<Step, { title: string; subtitle: string }> = {
    industries: {
      title: "What industries interest you?",
      subtitle: "We'll personalise your feed based on your choices.",
    },
    topics: {
      title: "What topics do you care about?",
      subtitle: "Pick the conversations you want to see more of.",
    },
    roles: {
      title: "What roles are you exploring?",
      subtitle: "Help us show you the most relevant content and jobs.",
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-xl w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <p className="text-xs font-medium text-primary mb-1">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <h2 className="text-lg font-bold">{labels[step].title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{labels[step].subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 mb-4">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Options */}
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
            {options[step].map((option) => {
              const selected = selections[step].includes(option);
              return (
                <button
                  key={option}
                  onClick={() => toggle(step, option)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selected
                      ? "bg-[#0a2412] text-[#dee2df]"
                      : "bg-[#e8e8e8] text-[#292929]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(STEPS[stepIndex - 1])}
              >
                Back
              </Button>
            )}
            {stepIndex < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(STEPS[stepIndex + 1])}>
                Continue
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish} disabled={saving}>
                {saving && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
                Finish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
