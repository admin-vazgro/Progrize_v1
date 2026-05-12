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
      <div className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#c1cc5a]/20 border border-[#c1cc5a]/40 text-[#c1cc5a] text-sm font-medium">
        ✓ You&apos;re on the list. We&apos;ll reach out when your feature ships.
      </div>
    );
  }

  if (state === "already") {
    return (
      <div className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#dee2df]/10 border border-[#dee2df]/20 text-[#dee2df]/70 text-sm">
        You&apos;re already on the list.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-[#dee2df]/40 text-sm outline-none focus:border-[#c1cc5a]/60 transition-colors"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#c1cc5a] text-[#0a2412] text-sm font-bold hover:bg-[#c1cc5a]/90 transition-colors disabled:opacity-60 whitespace-nowrap"
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
