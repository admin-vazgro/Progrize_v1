import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: file } = await sb
    .from("resume_files")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single() as { data: { storage_path: string } | null };

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = adminClient();
  await admin.storage.from("resumes").remove([file.storage_path]);

  await sb.from("resume_files").delete().eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
