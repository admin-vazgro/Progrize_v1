import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: task } = await sb
    .from("analysis_tasks")
    .select("status, error_message")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single() as { data: { status: string; error_message: string | null } | null };

  if (task) {
    return NextResponse.json({ status: task.status, error: task.error_message });
  }

  const { data: file } = await sb
    .from("resume_files")
    .select("parse_status")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single() as { data: { parse_status: string } | null };

  if (file) {
    return NextResponse.json({ status: file.parse_status });
  }

  return NextResponse.json({ error: "Task not found" }, { status: 404 });
}
