"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
    if (data.session) {
      setTimeout(() => router.push("/dashboard"), 1000);
    }
  }

  return (
    <div className="relative h-screen overflow-hidden" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>

      {/* Full-bleed background image */}
      <img
        src="/sign_up.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.32) 100%)" }} />

      {/* Floating white card — right side */}
      <div className="absolute right-[36px] top-[36px] w-[417px] h-[910px] bg-white rounded-[30px] overflow-hidden">

        {/* Close / back button */}
        <Link
          href="/"
          className="absolute top-[23px] right-[23px] w-[44px] h-[44px] bg-[#e8e8e8] rounded-[12px] flex items-center justify-center hover:bg-[#dddbd2] transition-colors"
          aria-label="Back to home"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="#26251f" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </Link>

        {/* Logo + heading block */}
        <div className="absolute top-[188px] left-[39px] w-[337px] flex flex-col gap-[12px]">
          {/* Logo bars */}
          <div className="relative" style={{ height: 39, width: 48 }}>
            <div className="bg-[#26251f] absolute rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 12, height: 14, left: 0, top: 25 }} />
            <div className="bg-[#26251f] absolute rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 14, height: 28, left: 13, top: 11 }} />
            <div className="bg-[#26251f] absolute rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 20, height: 39, left: 28, top: 0 }} />
          </div>

          {/* Heading */}
          <p className="text-black font-normal" style={{ fontSize: 32, letterSpacing: "-1px", lineHeight: 1 }}>
            Create an account
          </p>

          {/* Subtitle */}
          <p className="text-[13px] leading-[19px] text-[#3d3c36]">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#0a2412] hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {success ? (
          /* Success state */
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
          <>
            {/* Form */}
            <form onSubmit={handleSignup} className="absolute top-[337px] left-[39px] w-[337px] flex flex-col gap-[32px]">
              <div className="flex flex-col gap-[16px]">

                {/* Full name */}
                <div className="flex flex-col gap-[12px]">
                  <label className="text-[14px] leading-[20px] text-black font-normal">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your Full name"
                    required
                    autoComplete="name"
                    className="w-full h-[48px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[12px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border-0"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-[12px]">
                  <label className="text-[14px] leading-[20px] text-black font-normal">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    className="w-full h-[48px] bg-[#fafaf8] rounded-[8px] px-[12px] text-[12px] text-[#26251f] placeholder:text-[#8a877b] focus:outline-none focus:ring-1 focus:ring-[#26251f]/20 transition-all border-0"
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-[12px]">
                  <label className="text-[14px] leading-[20px] text-black font-normal">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
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

              {/* Create Account button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] bg-[#161611] rounded-[49px] text-[#fafaf8] text-[13px] font-bold tracking-[-0.065px] hover:bg-[#26251f] transition-colors disabled:opacity-50"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            {/* Terms */}
            <p className="absolute top-[703px] left-[39px] w-[337px] text-[13px] leading-[19px] text-[#5f5d54]">
              By creating an account you agree to our{" "}
              <Link href="/" className="underline text-[#5f5d54] hover:text-[#26251f] transition-colors">
                terms of service
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
