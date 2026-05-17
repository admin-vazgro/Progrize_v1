"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, Loader2 } from "lucide-react";

export default function OrgSetupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Not logged in — go to login
      if (!user) {
        router.replace("/recruiter/login");
        return;
      }

      // Already has a company membership — go straight to dashboard
      const res = await fetch("/api/recruiter/team");
      if (res.ok) {
        const data = await res.json();
        if ((data.members ?? []).length > 0) {
          router.replace("/recruiter/dashboard");
          return;
        }
      }

      // Pre-fill company name from localStorage (saved during signup)
      const pending = localStorage.getItem("pending_org_name");
      if (pending) setCompanyName(pending);

      setChecking(false);
    }
    init();
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/recruiter/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: companyName.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Clear the pending org name
    localStorage.removeItem("pending_org_name");
    router.push("/recruiter/dashboard");
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#8a877b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
      <div className="w-full max-w-[440px] bg-white rounded-[28px] p-10 shadow-[0_24px_60px_rgba(22,22,17,0.08)]">

        {/* Logo mark */}
        <div className="flex items-end gap-px mb-8">
          <div className="w-[8px] h-[11px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
          <div className="w-[11px] h-[22px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
          <div className="w-[16px] h-[32px] bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" />
        </div>

        <div className="mb-8">
          <div className="w-12 h-12 bg-[#e8f2eb] rounded-[12px] flex items-center justify-center mb-5">
            <Building2 className="w-5 h-5 text-[#0a2412]" />
          </div>
          <h1 className="text-[28px] font-normal text-[#0a2412] tracking-[-0.8px] leading-[1.1] mb-2">
            Set up your organisation
          </h1>
          <p className="text-[13px] text-[#5f5d54] leading-[19px]">
            One last step — confirm your organisation name to activate your account.
          </p>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#26251f]">Organisation Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Ltd"
              required
              autoFocus
              className="w-full h-[48px] bg-[#fafaf8] rounded-[10px] px-[14px] text-[13px] text-[#26251f] placeholder:text-[#b0ae9f] focus:outline-none focus:ring-2 focus:ring-[#0a2412]/15 border border-[#eceae3] focus:border-[#0a2412]/20 transition-all"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !companyName.trim()}
            className="w-full h-[52px] bg-[#0a2412] text-[#fafaf8] text-[14px] font-semibold rounded-[12px] hover:bg-[#142e1c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Creating…" : "Create Organisation"}
          </button>
        </form>
      </div>
    </div>
  );
}
