"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "already" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.alreadyJoined) setState("already");
      else if (data.success) setState("done");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#9eb335]/40 bg-[#c6f46b]/20 px-5 py-3 text-sm font-medium text-[#3d4b16]">
        ✓ You&apos;re on the list. We&apos;ll reach out when your feature ships.
      </div>
    );
  }

  if (state === "already") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#eceae3] bg-white/60 px-5 py-3 text-sm text-[#5f5d54]">
        You&apos;re already on the list.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="min-w-0 flex-1 rounded-lg border border-[#d8d5ca] bg-white px-4 py-3 text-sm text-[#26251f] outline-none transition-colors placeholder:text-[#8a877b] focus:border-[#9eb335]"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#161611] px-5 py-3 text-sm font-bold text-[#fafaf8] transition-colors hover:bg-[#26251f] disabled:opacity-60"
      >
        {state === "loading" ? "Joining…" : <>Join waitlist <ArrowRight className="w-4 h-4" /></>}
      </button>
      {state === "error" && (
        <p className="text-xs text-red-400 mt-1 sm:absolute sm:mt-0 sm:bottom-[-22px]">
          Something went wrong. Try again.
        </p>
      )}
    </form>
  );
}
