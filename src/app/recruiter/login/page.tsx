"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecruiterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }
    router.push("/recruiter/dashboard");
    router.refresh();
  }

  return (
    <div className="relative h-screen overflow-hidden" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
      <img src="/sign_in.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.32) 100%)" }} />

      <div className="absolute left-[10%] top-[40%] -translate-y-1/2 max-w-[460px] hidden lg:block">
        <p className="text-white text-[42px] font-light leading-[1.1] tracking-[-1.5px]">
          Your next great hire is waiting.
        </p>
        <p className="text-white/60 text-[16px] leading-[1.6] mt-4">
          Sign in to access your recruiting dashboard and candidate pipeline.
        </p>
      </div>

      {/* Floating white card */}
      <div className="absolute right-[36px] top-[36px] w-[417px] h-[700px] bg-white rounded-[30px] overflow-hidden">
        <Link
          href="/"
          className="absolute top-[23px] right-[23px] w-[44px] h-[44px] bg-[#e8e8e8] rounded-[12px] flex items-center justify-center hover:bg-[#dddbd2] transition-colors"
          aria-label="Back to home"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="#26251f" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </Link>

        <div className="absolute top-[212px] left-[40px] w-[337px] flex flex-col gap-[12px]">
          <div className="relative" style={{ height: 39, width: 48 }}>
            <div className="bg-[#26251f] absolute rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 12, height: 14, left: 0, top: 25 }} />
            <div className="bg-[#26251f] absolute rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 14, height: 28, left: 13, top: 11 }} />
            <div className="bg-[#26251f] absolute rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 20, height: 39, left: 28, top: 0 }} />
          </div>
          <p className="text-black font-normal" style={{ fontSize: 32, letterSpacing: "-1px", lineHeight: 1 }}>
            Recruiter sign in
          </p>
          <p className="text-[13px] leading-[19px] text-[#3d3c36]">
            No account yet?{" "}
            <Link href="/recruiter/signup" className="font-bold text-[#0a2412] hover:underline">
              Create one
            </Link>
          </p>
        </div>

        <form onSubmit={handleLogin} className="absolute top-[360px] left-[40px] w-[337px] flex flex-col gap-[32px]">
          <div className="flex flex-col gap-[16px]">
            <div className="flex flex-col gap-[12px]">
              <label className="text-[14px] leading-[20px] text-black font-normal">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full h-[48px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[12px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border-0"
              />
            </div>

            <div className="flex flex-col gap-[12px]">
              <label className="text-[14px] leading-[20px] text-black font-normal">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
                className="w-full h-[48px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[12px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border-0"
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-[#161611] rounded-[49px] text-[#fafaf8] text-[13px] font-bold tracking-[-0.065px] hover:bg-[#26251f] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <p className="text-[13px] leading-[19px] text-[#3d3c36] text-center">
            Looking for a job?{" "}
            <Link href="/login" className="font-bold text-[#3d3c36] hover:text-[#0a2412] transition-colors">
              Job seeker login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
