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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "logo" or "banner"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

    const bucket = "company-assets";
    await ensureBucket(bucket);
    const admin = adminClient();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const folder = type === "banner" ? "banners" : "logos";
    const path = `${folder}/${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await admin.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Company asset upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
