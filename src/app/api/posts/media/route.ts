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

async function ensureBucket(name: string) {
  const admin = adminClient();
  const { error } = await admin.storage.createBucket(name, { public: true });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Could not create bucket "${name}": ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureBucket("post-images");
    const admin = adminClient();

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

    const urls: string[] = [];
    for (const file of files.slice(0, 4)) {
      if (!file.type.startsWith("image/")) continue;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await admin.storage
        .from("post-images")
        .upload(path, buffer, { contentType: file.type, upsert: false });

      if (error) { console.error("Image upload error:", error); continue; }

      const { data: { publicUrl } } = admin.storage.from("post-images").getPublicUrl(path);
      urls.push(publicUrl);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    console.error("Media upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
