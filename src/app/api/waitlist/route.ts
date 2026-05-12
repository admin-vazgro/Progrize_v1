import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { error } = await sb.from("waitlist").insert({ email: email.toLowerCase().trim() });

  if (error) {
    if (error.code === "23505") {
      // unique violation — already on the list
      return NextResponse.json({ alreadyJoined: true });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
