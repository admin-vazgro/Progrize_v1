"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecruiterSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, user_type: "recruiter", company_name: companyName },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;

      await sb.from("profiles").upsert({
        id: data.user.id,
        full_name: name,
        email,
        headline: "Recruiter",
        user_type: "recruiter",
        updated_at: new Date().toISOString(),
      });

      const { data: company } = await sb
        .from("companies")
        .insert({ name: companyName, created_by: data.user.id })
        .select("id")
        .single();

      if (company?.id) {
        await sb.from("company_members").insert({
          company_id: company.id,
          user_id: data.user.id,
          role: "admin",
        });
      }
    }

    setSuccess(true);
    setLoading(false);
    if (data.session) {
      setTimeout(() => router.push("/recruiter/dashboard"), 1000);
    }
  }

  return (
    <div className="relative h-screen overflow-hidden" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
      <img src="/sign_up.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.32) 100%)" }} />

      <div className="absolute left-[10%] top-[40%] -translate-y-1/2 max-w-[460px] hidden lg:block">
        <p className="text-white text-[42px] font-light leading-[1.1] tracking-[-1.5px]">
          Hire the right people, faster.
        </p>
        <p className="text-white/60 text-[16px] leading-[1.6] mt-4">
          AI-powered candidate matching built for modern recruiting teams.
        </p>
      </div>

      {/* Floating white card */}
      <div className="absolute right-[36px] top-[36px] w-[417px] bg-white rounded-[30px] overflow-hidden pb-10" style={{ minHeight: 820 }}>
        <Link
          href="/"
          className="absolute top-[23px] right-[23px] w-[44px] h-[44px] bg-[#e8e8e8] rounded-[12px] flex items-center justify-center hover:bg-[#dddbd2] transition-colors"
          aria-label="Back to home"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="#26251f" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </Link>

        <div className="absolute top-[188px] left-[39px] w-[337px] flex flex-col gap-[12px]">
          <div className="relative" style={{ height: 39, width: 48 }}>
            <div className="bg-[#26251f] absolute rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 12, height: 14, left: 0, top: 25 }} />
            <div className="bg-[#26251f] absolute rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 14, height: 28, left: 13, top: 11 }} />
            <div className="bg-[#26251f] absolute rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 20, height: 39, left: 28, top: 0 }} />
          </div>
          <p className="text-black font-normal" style={{ fontSize: 32, letterSpacing: "-1px", lineHeight: 1 }}>
            Recruiter account
          </p>
          <p className="text-[13px] leading-[19px] text-[#3d3c36]">
            Already have an account?{" "}
            <Link href="/recruiter/login" className="font-bold text-[#0a2412] hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {success ? (
          <div className="absolute top-[337px] left-[39px] w-[337px] flex flex-col gap-[16px]">
            <div className="w-10 h-10 rounded-full bg-[#e8f2eb] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4 4 8-8" stroke="#0a2412" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[20px] font-semibold text-[#26251f]" style={{ letterSpacing: "-0.6px" }}>
              Check your email
            </p>
            <p className="text-[13px] leading-[19px] text-[#3d3c36]">
              We sent a confirmation link to{" "}
              <span className="font-bold text-[#26251f]">{email}</span>.
              Click it to activate your account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="absolute top-[337px] left-[39px] w-[337px] flex flex-col gap-[32px]">
            <div className="flex flex-col gap-[16px]">
              <div className="flex flex-col gap-[12px]">
                <label className="text-[14px] leading-[20px] text-black font-normal">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                  className="w-full h-[48px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[12px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border-0"
                />
              </div>

              <div className="flex flex-col gap-[12px]">
                <label className="text-[14px] leading-[20px] text-black font-normal">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  required
                  className="w-full h-[48px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[12px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border-0"
                />
              </div>

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
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              {loading ? "Creating account…" : "Create Recruiter Account"}
            </button>

            <p className="text-[13px] leading-[19px] text-[#5f5d54]">
              Looking for a job instead?{" "}
              <Link href="/signup" className="underline text-[#5f5d54] hover:text-[#26251f] transition-colors">
                Job seeker signup
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
