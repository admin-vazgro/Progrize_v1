import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { parseResume } from "@/lib/ai/parse-resume";

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function ensureBucket(name: string) {
  const admin = adminClient();
  const { error } = await admin.storage.createBucket(name, { public: false });
  // "already exists" is not a real error
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Could not create storage bucket "${name}": ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const storagePath = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

    // Ensure bucket exists, then upload via admin client
    await ensureBucket("resumes");
    const admin = adminClient();

    const { error: uploadError } = await admin.storage
      .from("resumes")
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;

    // Create resume_files row
    const { data: resumeFile, error: dbError } = await sb
      .from("resume_files")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        parse_status: "processing",
      })
      .select()
      .single() as { data: { id: string } | null; error: { message: string } | null };

    if (dbError || !resumeFile) {
      return NextResponse.json({ error: dbError?.message ?? "DB error" }, { status: 500 });
    }

    // Create analysis task
    const { data: task } = await sb
      .from("analysis_tasks")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        task_type: "parse_resume",
        input_payload: { resume_file_id: resumeFile.id, storage_path: storagePath },
        status: "processing",
      })
      .select()
      .single() as { data: { id: string } | null };

    // Run parsing inline (for MVP — move to background worker for production)
    parseAndSaveResume(user.id, resumeFile.id, buffer, file.name, task?.id ?? null, sb).catch(
      console.error
    );

    return NextResponse.json({ taskId: task?.id ?? resumeFile.id, resumeFileId: resumeFile.id });
  } catch (err) {
    console.error("Upload error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Convert "YYYY-MM" or "YYYY" to "YYYY-MM-DD" for PostgreSQL date columns
function toDate(val: string | null | undefined): string | null {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (/^\d{4}-\d{2}$/.test(val)) return `${val}-01`;
  if (/^\d{4}$/.test(val)) return `${val}-01-01`;
  return null;
}

async function parseAndSaveResume(
  userId: string,
  resumeFileId: string,
  buffer: Buffer,
  fileName: string,
  taskId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any
) {
  try {
    let text = "";
    if (fileName.match(/\.pdf$/i)) {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    if (!text.trim()) throw new Error("Could not extract text from file");

    const parsed = await parseResume(text);

    await sb.from("profiles").upsert({
      id: userId,
      full_name: parsed.full_name || null,
      headline: parsed.headline || null,
      location: parsed.location || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      linkedin_url: parsed.linkedin_url || null,
      portfolio_url: parsed.portfolio_url || null,
      summary: parsed.summary || null,
      years_experience: parsed.years_experience || null,
    });

    if (parsed.experience.length > 0) {
      await sb.from("experience_items").delete().eq("user_id", userId);
      await sb.from("experience_items").insert(
        parsed.experience.map((exp: typeof parsed.experience[0], i: number) => ({
          id: crypto.randomUUID(),
          user_id: userId,
          profile_id: userId,
          company_name: exp.company_name,
          job_title: exp.job_title,
          start_date: toDate(exp.start_date),
          end_date: exp.is_current ? null : toDate(exp.end_date),
          is_current: exp.is_current,
          location: exp.location || null,
          description: exp.description || null,
          achievements: exp.achievements,
          sort_order: i,
        }))
      );
    }

    if (parsed.education.length > 0) {
      await sb.from("education_items").delete().eq("user_id", userId);
      await sb.from("education_items").insert(
        parsed.education.map((edu: typeof parsed.education[0]) => ({
          id: crypto.randomUUID(),
          user_id: userId,
          profile_id: userId,
          institution: edu.institution,
          degree: edu.degree || null,
          field_of_study: edu.field_of_study || null,
          start_date: toDate(edu.start_date),
          end_date: toDate(edu.end_date),
        }))
      );
    }

    if (parsed.skills.length > 0) {
      await sb.from("profile_skills").delete().eq("user_id", userId);

      for (const skill of parsed.skills) {
        // upsert into master skills catalog
        const { data: skillRow } = await sb
          .from("skills")
          .upsert(
            { id: crypto.randomUUID(), name: skill.name, category: skill.category || null },
            { onConflict: "name", ignoreDuplicates: false }
          )
          .select("id")
          .single();

        if (skillRow?.id) {
          await sb.from("profile_skills").insert({
            id: crypto.randomUUID(),
            user_id: userId,
            profile_id: userId,
            skill_id: skillRow.id,
            level: skill.level || null,
            years_used: skill.years_used || null,
          });
        }
      }
    }

    await sb
      .from("resume_files")
      .update({ parse_status: "completed", parsed_at: new Date().toISOString() })
      .eq("id", resumeFileId);

    if (taskId) {
      await sb
        .from("analysis_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Parse error:", msg);
    await sb.from("resume_files").update({ parse_status: "failed" }).eq("id", resumeFileId);
    if (taskId) {
      await sb.from("analysis_tasks").update({ status: "failed", error_message: msg }).eq("id", taskId);
    }
  }
}
