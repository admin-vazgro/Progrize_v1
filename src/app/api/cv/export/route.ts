import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType,
} from "docx";

interface TailoredExp {
  company_name: string;
  job_title: string;
  rewritten_bullets: string[];
}

interface TailoredCV {
  headline?: string;
  summary?: string;
  experience?: TailoredExp[];
  skills_to_highlight?: string[];
  skills_to_add?: string[];
}

interface ExpItem {
  company_name: string;
  job_title: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  location: string | null;
  achievements: string[] | null;
  description: string | null;
}

interface EduItem {
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
}

function dateRange(start: string | null, end: string | null, current: boolean) {
  const s = start ? start.slice(0, 7) : "";
  const e = current ? "Present" : end ? end.slice(0, 7) : "";
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  return "";
}

function buildDocx(opts: {
  name: string;
  headline: string;
  summary: string;
  experience: (ExpItem & { bullets: string[] })[];
  education: EduItem[];
  skills: string[];
  jobTitle: string;
  company: string;
}) {
  const { name, headline, summary, experience, education, skills, jobTitle, company } = opts;

  const children: Paragraph[] = [];

  const hr = () =>
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "eceae3" } },
      spacing: { after: 160 },
      children: [],
    });

  const sectionLabel = (text: string) =>
    new Paragraph({
      spacing: { before: 240, after: 80 },
      children: [
        new TextRun({
          text: text.toUpperCase(),
          size: 18,
          color: "8a877b",
          characterSpacing: 100,
          font: "Helvetica Neue",
        }),
      ],
    });

  // Name
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 40 },
      children: [new TextRun({ text: name, size: 52, bold: true, color: "0a2412", font: "Georgia" })],
    })
  );

  // Headline
  if (headline) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: headline, size: 24, color: "5f5d54", font: "Georgia" })],
      })
    );
  }

  children.push(hr());

  // Summary
  if (summary) {
    children.push(sectionLabel("Summary"));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: summary, size: 22, color: "3d3c36", font: "Georgia" })],
      })
    );
    children.push(hr());
  }

  // Experience
  if (experience.length > 0) {
    children.push(sectionLabel("Experience"));
    for (const exp of experience) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 40 },
          children: [
            new TextRun({ text: exp.job_title, size: 24, bold: true, color: "0a2412", font: "Georgia" }),
            new TextRun({ text: `  ·  ${exp.company_name}`, size: 22, color: "5f5d54", font: "Georgia" }),
          ],
        })
      );
      const range = dateRange(exp.start_date, exp.end_date, exp.is_current);
      if (range || exp.location) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: [range, exp.location].filter(Boolean).join("  ·  "),
                size: 20,
                color: "8a877b",
                font: "Georgia",
              }),
            ],
          })
        );
      }
      for (const bullet of exp.bullets) {
        if (!bullet.trim()) continue;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: bullet, size: 21, color: "3d3c36", font: "Georgia" })],
          })
        );
      }
    }
    children.push(hr());
  }

  // Skills
  if (skills.length > 0) {
    children.push(sectionLabel("Skills"));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: skills.join("  ·  "), size: 21, color: "3d3c36", font: "Georgia" })],
      })
    );
    children.push(hr());
  }

  // Education
  if (education.length > 0) {
    children.push(sectionLabel("Education"));
    for (const edu of education) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({ text: edu.institution, size: 24, bold: true, color: "0a2412", font: "Georgia" }),
          ],
        })
      );
      const degreeText = [edu.degree, edu.field_of_study].filter(Boolean).join(", ");
      if (degreeText) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: degreeText, size: 22, color: "5f5d54", font: "Georgia" })],
          })
        );
      }
      const eduRange = dateRange(edu.start_date, edu.end_date, false);
      if (eduRange) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: eduRange, size: 20, color: "8a877b", font: "Georgia" })],
          })
        );
      }
    }
  }


  return new Document({
    styles: {
      default: {
        document: {
          run: { font: "Georgia", size: 22, color: "3d3c36" },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

function buildHtml(opts: {
  name: string;
  headline: string;
  summary: string;
  experience: (ExpItem & { bullets: string[] })[];
  education: EduItem[];
  skills: string[];
  jobTitle: string;
  company: string;
}) {
  const { name, headline, summary, experience, education, skills, jobTitle, company } = opts;

  const expHtml = experience.map((exp) => {
    const range = dateRange(exp.start_date, exp.end_date, exp.is_current);
    return `<div class="exp">
      <div class="exp-head">
        <strong>${exp.job_title}</strong><span class="muted"> · ${exp.company_name}</span>
        ${range || exp.location ? `<span class="date">${[range, exp.location].filter(Boolean).join(" · ")}</span>` : ""}
      </div>
      ${exp.bullets.length > 0 ? `<ul>${exp.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
    </div>`;
  }).join("");

  const eduHtml = education.map((edu) => {
    const deg = [edu.degree, edu.field_of_study].filter(Boolean).join(", ");
    const range = dateRange(edu.start_date, edu.end_date, false);
    return `<div class="edu">
      <strong>${edu.institution}</strong>${deg ? `<br><span class="muted">${deg}</span>` : ""}
      ${range ? `<br><span class="date">${range}</span>` : ""}
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${name} — ${jobTitle}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Georgia,serif;color:#1a1a16;background:#fff;padding:56px 72px;max-width:860px;margin:0 auto;font-size:13px;line-height:1.65}
  h1{font-size:28px;font-weight:700;color:#0a2412;margin-bottom:4px;letter-spacing:-.02em}
  .headline{font-size:15px;color:#5f5d54;margin-bottom:24px}
  hr{border:none;border-top:1px solid #eceae3;margin:20px 0}
  .label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#8a877b;margin-bottom:10px;font-family:monospace}
  .summary{color:#3d3c36;line-height:1.7}
  .exp{margin-bottom:20px}
  .exp-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-bottom:6px}
  .exp-head strong{font-size:14px;color:#0a2412}
  .date{color:#8a877b;font-size:12px;margin-left:auto}
  .muted{color:#5f5d54}
  ul{padding-left:18px;margin-top:4px}
  li{margin-bottom:3px;color:#3d3c36}
  .edu{margin-bottom:16px}
  .skills-list{color:#3d3c36}
  .footer{margin-top:48px;font-size:11px;color:#b0ae9f;font-style:italic}
  @media print{body{padding:0}@page{margin:2cm}}
</style>
<script>window.onload=()=>{window.print()}</script>
</head>
<body>
<h1>${name}</h1>
${headline ? `<p class="headline">${headline}</p>` : ""}
<hr>
${summary ? `<div class="label">Summary</div><p class="summary">${summary}</p><hr>` : ""}
${experience.length > 0 ? `<div class="label">Experience</div>${expHtml}<hr>` : ""}
${skills.length > 0 ? `<div class="label">Skills</div><p class="skills-list">${skills.join(" · ")}</p><hr>` : ""}
${education.length > 0 ? `<div class="label">Education</div>${eduHtml}` : ""}
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const tailoredResumeId = searchParams.get("tailoredResumeId");
    const format = searchParams.get("format") ?? "docx";

    if (!tailoredResumeId) return new NextResponse("tailoredResumeId required", { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const [
      { data: tailoredRaw },
      { data: profileRaw },
      { data: experienceRaw },
      { data: educationRaw },
      { data: skillsRaw },
    ] = await Promise.all([
      sb.from("tailored_resumes").select("*, jobs(title, company_name)").eq("id", tailoredResumeId).eq("user_id", user.id).single(),
      sb.from("profiles").select("*").eq("id", user.id).single(),
      sb.from("experience_items").select("*").eq("user_id", user.id).order("sort_order"),
      sb.from("education_items").select("*").eq("user_id", user.id),
      sb.from("profile_skills").select("*, skills(name)").eq("user_id", user.id),
    ]);

    if (!tailoredRaw) return new NextResponse("Not found", { status: 404 });

    const tailored = tailoredRaw.content_json as TailoredCV;
    const profile = profileRaw as { full_name: string | null; headline: string | null; summary: string | null; email: string | null; location: string | null } | null;
    const experience: ExpItem[] = experienceRaw ?? [];
    const education: EduItem[] = educationRaw ?? [];
    const existingSkills: string[] = (skillsRaw ?? []).map((ps: { skills: { name: string } | null }) => ps.skills?.name ?? "").filter(Boolean);

    const jobTitle = tailoredRaw.jobs?.title ?? "Role";
    const companyName = tailoredRaw.jobs?.company_name ?? "Company";

    // Merge tailored bullets into existing experience — only overwrites bullets
    const mergedExp = experience.map((exp) => {
      const tailoredExp = (tailored.experience ?? []).find(
        (te) =>
          te.company_name?.toLowerCase() === exp.company_name?.toLowerCase() &&
          te.job_title?.toLowerCase() === exp.job_title?.toLowerCase()
      );
      const origBullets = Array.isArray(exp.achievements) ? (exp.achievements as string[]) : [];
      return {
        ...exp,
        bullets: tailoredExp?.rewritten_bullets?.length ? tailoredExp.rewritten_bullets : origBullets,
      };
    });

    const allSkills = [
      ...(tailored.skills_to_highlight ?? []),
      ...(tailored.skills_to_add ?? []),
      ...existingSkills,
    ].filter((s, i, a) => s && a.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);

    const buildOpts = {
      name: profile?.full_name ?? "Your Name",
      headline: tailored.headline || profile?.headline || "",
      summary: tailored.summary || profile?.summary || "",
      experience: mergedExp,
      education,
      skills: allSkills,
      jobTitle,
      company: companyName,
    };

    if (format === "pdf") {
      const html = buildHtml(buildOpts);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    const doc = buildDocx(buildOpts);
    const buffer = await Packer.toBuffer(doc);
    const safeName = `CV — ${jobTitle} at ${companyName}`.replace(/[/\\?%*:|"<>]/g, "-");
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}.docx"`,
      },
    });
  } catch (err) {
    console.error("CV export error:", err);
    return new NextResponse("Export failed", { status: 500 });
  }
}

// POST: inline export — accepts tailored content directly (no tailored_resumes record needed)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json() as {
      tailored: TailoredCV;
      jobTitle: string;
      company: string;
      format?: string;
    };
    const { tailored, jobTitle, company, format = "docx" } = body;
    if (!tailored) return new NextResponse("tailored required", { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const [{ data: profileRaw }, { data: experienceRaw }, { data: educationRaw }, { data: skillsRaw }] =
      await Promise.all([
        sb.from("profiles").select("*").eq("id", user.id).single(),
        sb.from("experience_items").select("*").eq("user_id", user.id).order("sort_order"),
        sb.from("education_items").select("*").eq("user_id", user.id),
        sb.from("profile_skills").select("*, skills(name)").eq("user_id", user.id),
      ]);

    const profile = profileRaw as { full_name: string | null; headline: string | null; summary: string | null } | null;
    const experience: ExpItem[] = experienceRaw ?? [];
    const education: EduItem[] = educationRaw ?? [];
    const existingSkills: string[] = (skillsRaw ?? []).map((ps: { skills: { name: string } | null }) => ps.skills?.name ?? "").filter(Boolean);

    const mergedExp = experience.map((exp) => {
      const te = (tailored.experience ?? []).find(
        (t) =>
          t.company_name?.toLowerCase() === exp.company_name?.toLowerCase() &&
          t.job_title?.toLowerCase() === exp.job_title?.toLowerCase()
      );
      const origBullets = Array.isArray(exp.achievements) ? (exp.achievements as string[]) : [];
      return { ...exp, bullets: te?.rewritten_bullets?.length ? te.rewritten_bullets : origBullets };
    });

    const allSkills = [
      ...(tailored.skills_to_highlight ?? []),
      ...(tailored.skills_to_add ?? []),
      ...existingSkills,
    ].filter((s, i, a) => s && a.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);

    const buildOpts = {
      name: profile?.full_name ?? "Your Name",
      headline: tailored.headline || profile?.headline || "",
      summary: tailored.summary || profile?.summary || "",
      experience: mergedExp,
      education,
      skills: allSkills,
      jobTitle,
      company,
    };

    if (format === "pdf") {
      const html = buildHtml(buildOpts);
      return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    const doc = buildDocx(buildOpts);
    const buffer = await Packer.toBuffer(doc);
    const safeName = `CV — ${jobTitle} at ${company}`.replace(/[/\\?%*:|"<>]/g, "-");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}.docx"`,
      },
    });
  } catch (err) {
    console.error("CV export (inline) error:", err);
    return new NextResponse("Export failed", { status: 500 });
  }
}
