import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseResume } from "@/lib/ai/parse-resume";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let text = "";
    if (file.name.match(/\.pdf$/i)) {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
    }

    const parsed = await parseResume(text);
    return NextResponse.json({ parsed });
  } catch (err) {
    console.error("Import CV error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
