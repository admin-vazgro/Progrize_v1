"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/types/database";
import { Pencil, Check, X } from "lucide-react";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ExperienceItem = Database["public"]["Tables"]["experience_items"]["Row"];
type EducationItem = Database["public"]["Tables"]["education_items"]["Row"];
type ProfileSkillRow = {
  id: string;
  profile_id: string;
  skill_id: string;
  level: string | null;
  years_used: number | null;
  skills: { name: string; category: string | null } | null;
};

interface Props {
  profile: Profile;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: ProfileSkillRow[];
}

export default function ProfileEditor({ profile, experience, education, skills }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    headline: profile.headline ?? "",
    location: profile.location ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    summary: profile.summary ?? "",
    years_experience: profile.years_experience?.toString() ?? "",
  });

  async function handleSave() {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    await supabase.from("profiles").update({
      full_name: form.full_name || null,
      headline: form.headline || null,
      location: form.location || null,
      email: form.email || null,
      phone: form.phone || null,
      linkedin_url: form.linkedin_url || null,
      summary: form.summary || null,
      years_experience: form.years_experience ? parseFloat(form.years_experience) : null,
    }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Personal info */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Personal</h2>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                <Check className="w-3 h-3" /> {saving ? "Saving…" : saved ? "Saved!" : "Save"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1.5">
                <X className="w-3 h-3" /> Cancel
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "full_name", label: "Full name", key: "full_name" as const },
              { id: "headline", label: "Headline", key: "headline" as const },
              { id: "location", label: "Location", key: "location" as const },
              { id: "email", label: "Email", key: "email" as const },
              { id: "phone", label: "Phone", key: "phone" as const },
              { id: "linkedin_url", label: "LinkedIn URL", key: "linkedin_url" as const },
              { id: "years_experience", label: "Years of experience", key: "years_experience" as const },
            ].map(({ id, label, key }) => (
              <div key={id} className={key === "linkedin_url" || key === "full_name" ? "col-span-2" : ""}>
                <Label htmlFor={id} className="text-xs mb-1.5 block">{label}</Label>
                <Input
                  id={id}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="col-span-2">
              <Label htmlFor="summary" className="text-xs mb-1.5 block">Summary</Label>
              <Textarea
                id="summary"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xl font-semibold">{profile.full_name ?? "—"}</p>
              {profile.headline && <p className="text-sm text-foreground mt-0.5">{profile.headline}</p>}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground">
              {profile.location && <span>{profile.location}</span>}
              {profile.email && <span>{profile.email}</span>}
              {profile.phone && <span>{profile.phone}</span>}
              {profile.years_experience && <span>{profile.years_experience} yrs experience</span>}
            </div>
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline underline-offset-4 text-foreground hover:text-foreground"
              >
                LinkedIn
              </a>
            )}
            {profile.summary && (
              <p className="text-sm leading-relaxed pt-1">{profile.summary}</p>
            )}
          </div>
        )}
      </section>

      <Separator />

      {/* Skills */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">Skills</h2>
        {skills.length === 0 ? (
          <p className="text-sm text-foreground">No skills extracted yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((ps) => (
              <Badge key={ps.id} variant="outline" className="text-xs">
                {ps.skills?.name ?? ps.skill_id}
                {ps.level && <span className="ml-1 text-foreground">· {ps.level}</span>}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Experience */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">Experience</h2>
        {experience.length === 0 ? (
          <p className="text-sm text-foreground">No experience extracted yet.</p>
        ) : (
          <div className="space-y-6">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{exp.job_title}</p>
                    <p className="text-sm text-foreground">{exp.company_name}</p>
                  </div>
                  <p className="text-xs text-foreground shrink-0 ml-4">
                    {formatDate(exp.start_date)} –{" "}
                    {exp.is_current ? "Present" : formatDate(exp.end_date)}
                  </p>
                </div>
                {exp.location && (
                  <p className="text-xs text-foreground mt-0.5">{exp.location}</p>
                )}
                {exp.description && (
                  <p className="text-sm mt-2 leading-relaxed">{exp.description}</p>
                )}
                {Array.isArray(exp.achievements) && exp.achievements.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {(exp.achievements as string[]).map((a, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="shrink-0">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Education */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">Education</h2>
        {education.length === 0 ? (
          <p className="text-sm text-foreground">No education extracted yet.</p>
        ) : (
          <div className="space-y-4">
            {education.map((edu) => (
              <div key={edu.id} className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{edu.institution}</p>
                  {(edu.degree || edu.field_of_study) && (
                    <p className="text-sm text-foreground">
                      {[edu.degree, edu.field_of_study].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                {(edu.start_date || edu.end_date) && (
                  <p className="text-xs text-foreground shrink-0 ml-4">
                    {formatDate(edu.start_date)} – {formatDate(edu.end_date)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
