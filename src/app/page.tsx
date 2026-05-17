import type { Metadata } from "next";
import Link from "next/link";
import { Upload, Zap, Target, LayoutDashboard, Users, UserCheck, FileText, Star, Download, Sparkles, Palette, BriefcaseBusiness, Code2, Database, Compass } from "lucide-react";
import WaitlistForm from "@/components/WaitlistForm";
import { AnimateOnScroll } from "@/components/AnimateOnScroll";
import { AnimatedStats } from "@/components/AnimatedStats";
import { AnimatedScoreMock } from "@/components/AnimatedScoreMock";
import { ParallaxAura, ParallaxLayer } from "@/components/ParallaxLayer";

export const metadata: Metadata = {
  title: "Progrize — AI CV Optimizer, ATS Score Checker & Job Matching Platform",
  description:
    "Upload your CV and get an instant AI fit score and ATS compatibility analysis for any job. Have your resume auto-tailored to match job descriptions. Browse 10,000+ live roles, track every application, and network with industry insiders. Free to start.",
  keywords:
    "AI CV optimizer, ATS score checker, resume tailor AI, job match score, CV parser, job application tracker, ATS resume checker, career platform, AI job matching",
  openGraph: {
    title: "Progrize — AI CV Optimizer & Job Match Platform",
    description:
      "Upload your CV once. Get instant AI fit scores and ATS analysis for any job. Have your resume auto-tailored and download it in one click.",
    type: "website",
  },
};

function CompanyLogo({ company }: { company: string }) {
  if (company === "Notion") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[#161611] bg-[#fafaf8] font-serif text-[17px] font-bold leading-none text-[#161611] shadow-[0_2px_0_rgba(22,22,17,0.08)]">
          N
        </div>
      </div>
    );
  }

  if (company === "Figma") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="grid grid-cols-2">
          <span className="h-2.5 w-2.5 rounded-l-full bg-[#f24e1e]" />
          <span className="h-2.5 w-2.5 rounded-r-full bg-[#ff7262]" />
          <span className="h-2.5 w-2.5 rounded-l-full bg-[#a259ff]" />
          <span className="h-2.5 w-2.5 rounded-r-full bg-[#1abcfe]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#0acf83]" />
        </div>
      </div>
    );
  }

  if (company === "Vercel") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="h-0 w-0 border-x-[8px] border-b-[15px] border-x-transparent border-b-[#161611] drop-shadow-[0_3px_2px_rgba(22,22,17,0.12)]" />
      </div>
    );
  }

  if (company === "Loom") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="relative h-6 w-6">
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#625df5]" />
          <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#625df5]" />
          <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#625df5]" />
          <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#625df5]" />
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8f8bff]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#161611] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
      <div className="flex flex-col gap-0.5">
        <span className="block h-1 w-5 rounded-full bg-[#fafaf8] rotate-[-42deg]" />
        <span className="block h-1 w-5 rounded-full bg-[#fafaf8] rotate-[-42deg] opacity-90" />
        <span className="block h-1 w-5 rounded-full bg-[#fafaf8] rotate-[-42deg] opacity-80" />
      </div>
    </div>
  );
}

function CommunityLogo({ tag }: { tag: string }) {
  const icons: Record<string, { Icon: typeof Users; bg: string; fg: string }> = {
    Design: { Icon: Palette, bg: "bg-[#f5e7ff]", fg: "text-[#9b5cf6]" },
    Product: { Icon: BriefcaseBusiness, bg: "bg-[#e8f6d5]", fg: "text-[#78a81f]" },
    Engineering: { Icon: Code2, bg: "bg-[#e3f7fb]", fg: "text-[#24a9bd]" },
    Data: { Icon: Database, bg: "bg-[#fff1cc]", fg: "text-[#d59a00]" },
    General: { Icon: Compass, bg: "bg-[#f1eee7]", fg: "text-[#5f5d54]" },
  };
  const { Icon, bg, fg } = icons[tag] ?? icons.General;

  return (
    <div className={`flex h-full w-full items-center justify-center rounded-[14px] ${bg} shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]`}>
      <Icon className={`h-4 w-4 ${fg}`} />
    </div>
  );
}

function FeatureClayIcon({ title, Icon }: { title: string; Icon: typeof Upload }) {
  const styles: Record<string, { base: string; tile: string; accent: string }> = {
    "CV Parsing": { base: "from-[#9ff4ef] to-[#22bfd1]", tile: "bg-[#42d1d2]", accent: "bg-white/70" },
    "Fit Score Analysis": { base: "from-[#9df5ef] to-[#15b8ce]", tile: "bg-[#21bdd1]", accent: "bg-[#8d5bff]" },
    "ATS Compatibility Check": { base: "from-[#ff7aaa] to-[#f2386e]", tile: "bg-[#f24d79]", accent: "bg-[#ffd938]" },
    "One-Click CV Tailoring": { base: "from-[#e4ff87] to-[#26d6c7]", tile: "bg-[#c8ef45]", accent: "bg-[#24cfc9]" },
    "Live Job Feed": { base: "from-[#fff19a] to-[#f3c800]", tile: "bg-[#f6d215]", accent: "bg-white/70" },
    "Application Tracker": { base: "from-[#fff1a4] via-[#6ee4f0] to-[#ff78a6]", tile: "bg-white", accent: "bg-[#5dd8e4]" },
    "Community Rooms": { base: "from-[#ffb07d] via-[#8df14d] to-[#20d4d0]", tile: "bg-[#75e553]", accent: "bg-[#20d4d0]" },
    "Professional Networking": { base: "from-[#ff5f86] via-[#ffe14c] to-[#3fdbd4]", tile: "bg-white", accent: "bg-[#ffe14c]" },
    "Public Profile": { base: "from-[#a0f7f1] to-[#23bfce]", tile: "bg-[#42d1d2]", accent: "bg-white/70" },
  };
  const s = styles[title] ?? styles["CV Parsing"];

  if (title === "Application Tracker") {
    return (
      <div className={`relative flex h-[62px] w-[68px] items-center justify-center rounded-[28px] bg-gradient-to-br ${s.base} p-2 shadow-[0_16px_34px_rgba(22,22,17,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]`}>
        <div className="flex h-11 w-12 items-end justify-center gap-1 rounded-[20px] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <span className="mb-2 h-6 w-2.5 rounded-full bg-[#f6cf2f] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" />
          <span className="mb-2 h-9 w-2.5 rounded-full bg-[#68dae8] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" />
          <span className="mb-2 h-7 w-2.5 rounded-full bg-[#f36c94] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" />
        </div>
      </div>
    );
  }

  if (title === "Community Rooms" || title === "Professional Networking") {
    return (
      <div className={`relative flex h-[62px] w-[68px] items-center justify-center rounded-[28px] bg-gradient-to-br ${s.base} p-2 shadow-[0_16px_34px_rgba(22,22,17,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]`}>
        <span className="absolute left-3 top-5 h-7 w-7 rounded-full bg-[#ff9d72] shadow-[0_7px_12px_rgba(255,139,89,0.22)]" />
        <span className="absolute right-3 top-3 h-8 w-8 rounded-full bg-[#8dea3c] shadow-[0_7px_12px_rgba(126,199,49,0.22)]" />
        <span className="absolute bottom-3 right-5 h-8 w-8 rounded-full bg-[#25d0c8] shadow-[0_7px_12px_rgba(37,208,200,0.22)]" />
        <Icon className="relative z-10 h-4 w-4 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.14)]" strokeWidth={2.2} />
      </div>
    );
  }

  return (
    <div className={`relative flex h-[62px] w-[68px] items-center justify-center rounded-[28px] bg-gradient-to-br ${s.base} p-2 shadow-[0_16px_34px_rgba(22,22,17,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]`}>
      <div className={`flex h-10 w-11 items-center justify-center rounded-[14px] ${s.tile} shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_16px_rgba(22,22,17,0.12)]`}>
        <Icon className="h-5 w-5 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.13)]" strokeWidth={2.1} />
      </div>
      <span className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full ${s.accent} shadow-[0_5px_10px_rgba(22,22,17,0.10)]`}>
        <Icon className="h-3 w-3 text-white" strokeWidth={2.3} />
      </span>
    </div>
  );
}


export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f6f1] text-[#161611]" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(226,250,176,0.46),transparent_30%),radial-gradient(circle_at_82%_0%,rgba(255,255,255,0.82),transparent_34%),linear-gradient(180deg,#fbfaf7_0%,#f4f2eb_100%)]" />
      <ParallaxAura />

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
        <div className="mx-auto flex h-[58px] max-w-[1180px] items-center justify-between rounded-full border border-white/75 bg-[rgba(250,250,248,0.74)] px-3 shadow-[0_18px_55px_rgba(24,24,18,0.10),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl sm:h-[66px] sm:px-4 md:px-7">
          <Link href="/" className="ml-2 flex shrink-0 items-end gap-px sm:ml-0" aria-label="Progrize home">
            <div className="h-[11px] w-[8px] rounded-bl-[5px] rounded-tl-[58px] bg-[#1c1c1c] sm:h-[15px] sm:w-[11px]" />
            <div className="h-[21px] w-[11px] rounded-bl-[5px] rounded-tl-[58px] bg-[#1c1c1c] sm:h-[28px] sm:w-[15px]" />
            <div className="h-[31px] w-[16px] rounded-bl-[5px] rounded-tl-[58px] bg-[#1c1c1c] sm:h-[41px] sm:w-[21px]" />
          </Link>

          <nav className="hidden items-center gap-1 rounded-full bg-white/55 p-1 text-[13px] leading-[20px] text-[#5f5d54] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:flex" aria-label="Main navigation">
            <Link href="/jobs" className="rounded-full px-4 py-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white hover:text-[#161611] hover:shadow-[0_8px_18px_rgba(24,24,18,0.07)] focus-visible:outline-none focus-visible:text-[#161611]">Jobs</Link>
            <Link href="/tracker" className="rounded-full px-4 py-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white hover:text-[#161611] hover:shadow-[0_8px_18px_rgba(24,24,18,0.07)] focus-visible:outline-none focus-visible:text-[#161611]">Tracker</Link>
            <Link href="/community" className="rounded-full px-4 py-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white hover:text-[#161611] hover:shadow-[0_8px_18px_rgba(24,24,18,0.07)] focus-visible:outline-none focus-visible:text-[#161611]">Community</Link>
            <a href="#features" className="rounded-full px-4 py-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white hover:text-[#161611] hover:shadow-[0_8px_18px_rgba(24,24,18,0.07)] focus-visible:outline-none focus-visible:text-[#161611]">Features</a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/recruiter/login" className="hidden text-[13px] leading-[20px] text-[#5f5d54] transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[#161611] focus-visible:outline-none focus-visible:text-[#161611] lg:block">For organisations</Link>
            <Link href="/login" className="hidden text-[13px] leading-[20px] text-[#5f5d54] transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[#161611] focus-visible:outline-none focus-visible:text-[#161611] sm:block">Sign in</Link>
            <Link href="/signup" className="group flex h-[42px] items-center gap-2 rounded-full bg-[#161611] py-1 pl-4 pr-1 text-[12px] leading-[20px] text-[#fafaf8] shadow-[0_12px_28px_rgba(22,22,17,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#26251f] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161611] focus-visible:ring-offset-2 sm:h-[44px] sm:pl-5 sm:text-[13px]">
              Start free
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-[15px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px sm:h-9 sm:w-9">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <main>

        {/* ══════════════════════════════════════════
            HERO
        ══════════════════════════════════════════ */}
        <section className="overflow-hidden pt-4 md:pt-8" aria-label="Hero">
          <div className="flex flex-col items-start gap-6 px-4 pb-8 pt-9 text-left sm:px-6 md:items-center md:gap-[34px] md:pb-10 md:pt-[76px] md:text-center">
            <div className="flex flex-col items-start md:items-center">
              <p className="animate-landing-up mb-4 max-w-full rounded-full border border-white/75 bg-white/56 px-3 py-2 text-[9px] font-medium uppercase tracking-[0.16em] text-[#6d6a5f] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(24,24,18,0.05)] sm:px-4 sm:text-[10px] sm:tracking-[0.2em]" style={{ animationDelay: "0ms" }}>
                AI career operating system
              </p>
              <p className="animate-landing-up font-extralight text-[clamp(30px,9vw,64px)] leading-[1.05] text-[#26251f] tracking-[0.32px]" style={{ animationDelay: "0ms" }}>
                A new era of
              </p>
              <h1 className="animate-landing-up max-w-[1080px] font-light text-[clamp(44px,13vw,124px)] leading-[0.9] text-[#161611] tracking-[-0.055em] md:leading-[0.84] md:tracking-[-0.075em]" style={{ animationDelay: "80ms" }}>
                Career &amp; Networking
              </h1>
            </div>

            <p className="animate-landing-up max-w-[560px] text-[15px] leading-[25px] tracking-[-0.08px] text-[#5f5d54] sm:text-[16px] sm:leading-[27px]" style={{ animationDelay: "180ms" }}>
              Upload your CV once. Get an instant AI fit score and ATS analysis for any role. Have it auto-tailored to match, then download and apply.
            </p>

            <Link
              href="/signup"
              className="group animate-landing-up flex h-[52px] shrink-0 items-center gap-3 rounded-full bg-[#161611] py-1 pl-6 pr-1.5 text-[14px] leading-[24px] text-[#fafaf8] shadow-[0_18px_40px_rgba(22,22,17,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#26251f] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161611] focus-visible:ring-offset-2 sm:h-[56px] sm:pl-7 sm:text-[15px]"
              style={{ animationDelay: "260ms" }}
            >
              Get started free
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-[17px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-hover:-translate-y-px sm:h-11 sm:w-11">↗</span>
            </Link>
          </div>

          <div className="animate-landing-up mx-3 rounded-[30px] border border-white/75 bg-white/45 p-1.5 shadow-[0_32px_100px_rgba(24,24,18,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] sm:rounded-[54px] sm:p-2 md:mx-6 md:rounded-[88px] md:p-3" style={{ animationDelay: "340ms" }}>
            <div className="overflow-hidden rounded-[24px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:rounded-[44px] md:rounded-[74px]" style={{ maxHeight: "58vh" }}>
              <ParallaxLayer distance={46} reverse scale className="h-full">
                <img
                  src="/hero-community.png"
                  alt="A vibrant community of career-focused professionals"
                  className="block h-[42vh] min-h-[260px] w-full scale-[1.06] object-cover sm:h-full"
                  style={{ objectPosition: "center 6%" }}
                />
              </ParallaxLayer>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            STATS STRIP
        ══════════════════════════════════════════ */}
        <section className="px-3 py-8 md:px-6 md:py-10" aria-label="Key statistics">
          <div className="overflow-hidden rounded-[34px] border border-[#d7f5a0] bg-[#c6f46b] shadow-[0_24px_70px_rgba(101,135,24,0.18),inset_0_1px_0_rgba(255,255,255,0.5)]">
            <div className="min-h-[120px] md:h-[178px] flex items-center">
              <AnimatedStats />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════ */}
        <section id="how" className="py-14 md:py-28" aria-labelledby="how-heading">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10">
            <AnimateOnScroll className="mb-10 md:mb-16">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Simple by design</p>
              <h2 id="how-heading" className="font-light text-[clamp(32px,10vw,64px)] leading-[1.05] text-[#161611] tracking-[-0.035em] md:tracking-[-0.04em]">
                From CV upload<br />to tailored application<br />in three steps.
              </h2>
            </AnimateOnScroll>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[34px] border border-white/70 bg-[#eceae3] p-px shadow-[0_28px_80px_rgba(24,24,18,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] md:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "Upload your CV",
                  desc: "Drop any PDF or DOCX. Groq AI reads every line and builds your structured profile: skills, experience, and education. Done in under 30 seconds, no reformatting needed.",
                  tag: "30 seconds",
                  delay: 0,
                  miniature: "/how-miniature-upload.png",
                },
                {
                  n: "02",
                  title: "Analyze any job",
                  desc: "Paste a job description or click Analyze on any live listing. Get a fit score, ATS compatibility breakdown, every missing keyword, and specific recommendations.",
                  tag: "Instant",
                  delay: 100,
                  miniature: "/how-miniature-analyze.png",
                },
                {
                  n: "03",
                  title: "Tailor and download",
                  desc: "One click rewrites your CV bullets using the job's own language. New headline, optimized summary, highlighted skills. Download as Word or PDF. Ready to submit.",
                  tag: "One click",
                  delay: 200,
                  miniature: "/how-miniature-tailor.png",
                },
              ].map(({ n, title, desc, tag, delay, miniature }) => (
                <AnimateOnScroll key={n} delay={delay} threshold={0.08}>
                  <div className="h-full bg-[#fbfaf7] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white sm:p-8 md:p-10">
                    <div className="relative mb-10 h-[168px]">
                      <p className="absolute left-0 top-0 w-[112px] font-extralight text-[80px] leading-none text-[#eceae3] tracking-[-0.04em] tabular-nums">{n}</p>
                      <div className="absolute right-0 top-0 flex w-[128px] flex-col items-center">
                        <div className="flex h-[106px] w-full items-end justify-center">
                          <img src={miniature} alt="" aria-hidden="true" className="h-[104px] w-auto object-contain object-bottom" />
                        </div>
                        <span className="-mt-1 inline-flex h-[26px] items-center rounded-full border border-[#eceae3] bg-white px-3 text-[11px] leading-none text-[#8a877b]">{tag}</span>
                      </div>
                    </div>
                    <h3 className="text-[18px] font-normal text-[#161611] mb-3 tracking-[-0.02em]">{title}</h3>
                    <p className="text-[14px] leading-[22px] text-[#5f5d54]">{desc}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURE 1 — AI Fit Score + ATS Analysis
        ══════════════════════════════════════════ */}
        <section id="features" className="py-14 md:py-28" aria-labelledby="analysis-heading">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10">
            <div className="grid gap-10 md:grid-cols-2 md:gap-16 items-center">

              <AnimateOnScroll>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">AI Analysis</p>
                <h2 id="analysis-heading" className="font-light text-[clamp(32px,9vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.035em] mb-6 md:tracking-[-0.04em]">
                  Know your chances<br />before you apply.
                </h2>
                <p className="text-[16px] leading-[26px] text-[#5f5d54] tracking-[-0.08px] mb-8 max-w-[420px]">
                  Paste any job description. Our AI cross-references it against your CV and returns two scores: how well you actually fit the role, and how likely an ATS system is to surface your application.
                </p>
                <ul className="flex flex-col gap-4">
                  {[
                    { label: "Fit Score", detail: "Measures skill overlap, experience relevance, title similarity, and location match." },
                    { label: "ATS Score", detail: "Checks keyword coverage, required skill coverage, section completeness, and measurable impact." },
                    { label: "Missing keywords", detail: "Exact terms from the job description absent from your CV; add them in one click." },
                    { label: "Actionable recommendations", detail: "Specific rewrites, not vague tips. Targeted to this role." },
                  ].map(({ label, detail }) => (
                    <li key={label} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#c6f46b] mt-[9px] shrink-0" />
                      <div>
                        <span className="text-[14px] text-[#26251f]">{label}: </span>
                        <span className="text-[14px] text-[#5f5d54]">{detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </AnimateOnScroll>

              <AnimateOnScroll delay={150}>
                <ParallaxLayer distance={30}>
                  <AnimatedScoreMock />
                </ParallaxLayer>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURE 2 — CV Tailoring
        ══════════════════════════════════════════ */}
        <section className="py-14 md:py-20" aria-labelledby="tailor-heading">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10">
            <div className="grid gap-10 md:grid-cols-2 md:gap-16 items-center">

              {/* Light mock — before/after */}
              <AnimateOnScroll className="order-2 md:order-1">
                <ParallaxLayer distance={24} reverse>
                <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[#f7f6f1] p-3 shadow-[0_28px_70px_rgba(24,24,18,0.12),0_8px_22px_rgba(24,24,18,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]">
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-12 rounded-full bg-white/80 blur-2xl" />
                  <div className="relative rounded-[22px] border border-[#e7e3d8] bg-[#fbfaf7] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(29,28,21,0.04)]">
                    <p className="text-[10px] text-[#8a877b] mb-3">Before: your original CV</p>
                    <p className="text-[13px] text-[#8a877b] leading-relaxed italic">
                      &ldquo;Managed product development projects and worked with design teams to deliver features.&rdquo;
                    </p>
                  </div>
                  <div className="relative z-10 my-3 rounded-[24px] border border-[#e7e3d8] bg-white p-5 shadow-[0_18px_38px_rgba(32,31,24,0.10),0_3px_0_rgba(255,255,255,0.95)_inset]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 rounded-full bg-[#bdf34f] shadow-[0_0_0_5px_rgba(198,244,107,0.18),0_4px_10px_rgba(112,154,20,0.22)]" />
                      <p className="text-[10px] text-[#5f5d54]">AI-tailored to this role</p>
                    </div>
                    <p className="text-[13px] text-[#26251f] leading-relaxed">
                      &ldquo;Led end-to-end product development for 3 B2B SaaS features using Figma design systems, reducing time-to-market by 35% through cross-functional collaboration and Agile sprint cycles.&rdquo;
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {["Figma design systems", "Agile", "B2B SaaS", "cross-functional"].map((s) => (
                        <span key={s} className="rounded-full bg-[#dff8a8] px-2.5 py-1 text-[10px] text-[#3d3c36] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_5px_12px_rgba(126,154,55,0.12)]">+ {s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="relative rounded-[22px] border border-[#e8e4d9] bg-[#fbfaf7] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(29,28,21,0.04)]">
                    <p className="text-[10px] text-[#8a877b] mb-2">New headline</p>
                    <p className="text-[13px] text-[#26251f]">Senior Product Designer | Design Systems · Figma · B2B SaaS</p>
                  </div>
                  <div className="relative mt-3 flex flex-col gap-3 rounded-[22px] border border-[#e8e4d9] bg-[#fdfcf9] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_26px_rgba(29,28,21,0.05)] sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[12px] text-[#8a877b]">Tailored CV ready</p>
                    <div className="flex flex-wrap gap-2">
                      {["Word (.docx)", "PDF"].map((fmt) => (
                        <span key={fmt} className="flex items-center gap-1 rounded-full bg-[#161611] px-3 py-1.5 text-[11px] text-[#fafaf8] shadow-[0_10px_18px_rgba(22,22,17,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]">
                          <Download className="w-3 h-3" /> {fmt}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                </ParallaxLayer>
              </AnimateOnScroll>

              <AnimateOnScroll delay={150} className="order-1 md:order-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">AI CV Tailoring</p>
                <h2 id="tailor-heading" className="font-light text-[clamp(32px,9vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.035em] mb-6 md:tracking-[-0.04em]">
                  Your CV, rewritten<br />for every role.<br />In one click.
                </h2>
                <p className="text-[16px] leading-[26px] text-[#5f5d54] tracking-[-0.08px] mb-8 max-w-[420px]">
                  After your analysis, tap &ldquo;Tailor CV.&rdquo; The AI rewrites your bullet points using the job&apos;s own keywords, regenerates your professional headline and summary, and adds the skills the role requires.
                </p>
                <ul className="flex flex-col gap-3">
                  {[
                    "Bullet points rewritten with the job's exact language",
                    "New professional headline and summary generated",
                    "Skills gap filled, only relevant additions",
                    "Download as Word (.docx) or PDF in seconds",
                    "Original CV preserved; the tailored version is a separate file",
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-[14px] text-[#5f5d54]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#c6f46b] mt-[7px] shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="group inline-flex items-center gap-2.5 mt-8 bg-[#161611] text-[#fafaf8] text-[15px] rounded-[49px] h-[52px] px-8 hover:bg-[#26251f] active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161611] focus-visible:ring-offset-2">
                  Try it free
                  <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">↗</span>
                </Link>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURE 3 — Live Job Feed
        ══════════════════════════════════════════ */}
        <section className="py-14 md:py-20" aria-labelledby="jobs-heading">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10">
            <div className="grid gap-10 md:grid-cols-2 md:gap-16 items-start">

              <AnimateOnScroll>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Live Job Feed</p>
                <h2 id="jobs-heading" className="font-light text-[clamp(32px,9vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.035em] mb-6 md:tracking-[-0.04em]">
                  Browse 10,000+ live roles.<br />Analyze any one<br />instantly.
                </h2>
                <p className="text-[16px] leading-[26px] text-[#5f5d54] tracking-[-0.08px] mb-8 max-w-[420px]">
                  Search by keyword and location. Filter by remote, full-time, part-time, or salary band. Open any listing and hit Analyze: your fit score and ATS breakdown appear in seconds.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { label: "Remote filter", detail: "Find fully remote and hybrid roles instantly." },
                    { label: "Salary bands", detail: "Filter by £50k+, £70k+, or £100k+ in one click." },
                    { label: "One-click analyze", detail: "Fit score for any listing without copy-paste." },
                    { label: "Save & track", detail: "Bookmark roles and move them into your tracker." },
                  ].map(({ label, detail }) => (
                    <div key={label} className="bg-white border border-[#eceae3] rounded-xl p-4">
                      <p className="text-[13px] text-[#26251f] mb-1">{label}</p>
                      <p className="text-[12px] text-[#5f5d54] leading-snug">{detail}</p>
                    </div>
                  ))}
                </div>
              </AnimateOnScroll>

              {/* Mock — job cards */}
              <AnimateOnScroll delay={150} className="flex flex-col gap-2.5">
                <ParallaxLayer distance={28}>
                <div className="rounded-[26px] border border-white/80 bg-[#f7f6f1] p-3 shadow-[0_28px_70px_rgba(24,24,18,0.12),0_8px_22px_rgba(24,24,18,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]">
                <div className="relative mb-3 flex flex-wrap items-center gap-2 rounded-[20px] border border-[#e7e3d8] bg-[#fbfaf7] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(29,28,21,0.04)]">
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-8 rounded-full bg-white/80 blur-xl" />
                  <span className="relative min-w-full flex-1 px-2 text-[12px] text-[#8a877b] sm:min-w-0">Product Designer · London</span>
                  {["remote", "full-time", "£70k+"].map((chip) => (
                    <span key={chip} className={`relative rounded-full px-3 py-1 text-[11px] ${chip === "remote" ? "bg-[#161611] text-[#fafaf8] shadow-[0_10px_18px_rgba(22,22,17,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]" : "border border-[#e7e3d8] bg-white text-[#5f5d54] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_14px_rgba(24,24,18,0.05)]"}`}>
                      {chip}
                    </span>
                  ))}
                </div>

                  <div className="flex flex-col gap-3">
                    {[
                      { company: "Notion", role: "Lead Product Designer", location: "Remote · Full-time", salary: "£80k–£110k", score: 79, posted: "2d ago" },
                      { company: "Figma", role: "Senior UX Designer", location: "London · Hybrid", salary: "£75k–£95k", score: 71, posted: "1d ago" },
                      { company: "Linear", role: "Product Designer", location: "Remote · Full-time", salary: "£65k–£85k", score: 85, posted: "today" },
                    ].map(({ company, role, location, salary, score, posted }) => (
                      <div key={role} className="relative flex flex-wrap items-start gap-3 rounded-[22px] border border-[#e7e3d8] bg-white p-4 shadow-[0_18px_38px_rgba(32,31,24,0.10),0_3px_0_rgba(255,255,255,0.95)_inset] sm:flex-nowrap">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#f5f3ed] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_20px_rgba(24,24,18,0.12)]">
                          <CompanyLogo company={company} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] text-[#26251f]">{role}</p>
                          <p className="text-[12px] text-[#5f5d54]">{company} · {location}</p>
                          <p className="text-[12px] text-[#8a877b]">{salary} · {posted}</p>
                        </div>
                        <div className="ml-[56px] flex shrink-0 flex-row items-center gap-2 sm:ml-0 sm:flex-col sm:items-end">
                          <span className="rounded-full bg-[#dff8a8] px-2.5 py-1 text-[11px] text-[#3d3c36] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_5px_12px_rgba(126,154,55,0.12)]">
                            {score}% fit
                          </span>
                          <span className="flex cursor-pointer items-center gap-1 text-[10px] text-[#8a877b]">
                            <Zap className="h-3 w-3" /> Analyze
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                    </div>
                </ParallaxLayer>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURE 4 — Application Tracker
        ══════════════════════════════════════════ */}
        <section className="py-14 md:py-20" aria-labelledby="tracker-heading">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10">
            <div className="grid gap-10 md:grid-cols-2 md:gap-16 items-start">

              {/* Light kanban mock */}
              <AnimateOnScroll className="order-2 md:order-1">
                <ParallaxLayer distance={26} reverse>
                <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[#f7f6f1] p-4 shadow-[0_28px_70px_rgba(24,24,18,0.12),0_8px_22px_rgba(24,24,18,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]">
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-12 rounded-full bg-white/80 blur-2xl" />
                  <p className="relative text-[10px] font-mono text-[#8a877b] mb-4">your tracker</p>

                  <div className="no-scrollbar relative overflow-x-auto">
                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:min-w-[520px] sm:grid-cols-5">
                    {[
                      { label: "saved", count: 4, cards: [{ co: "Figma", role: "Sr. UX" }, { co: "Notion", role: "PM" }] },
                      { label: "applied", count: 3, cards: [{ co: "Linear", role: "Designer" }] },
                      { label: "interview", count: 1, cards: [{ co: "Vercel", role: "Design Eng." }] },
                      { label: "offer", count: 1, cards: [{ co: "Loom", role: "Sr. PM" }] },
                      { label: "closed", count: 2, cards: [] },
                    ].map(({ label, count, cards }) => (
                      <div key={label}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] text-[#8a877b]">{label}</span>
                          <span className="text-[9px] border border-[#e7e3d8] bg-white text-[#8a877b] rounded-full w-4 h-4 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_10px_rgba(24,24,18,0.04)]">{count}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {cards.map(({ co, role }) => (
                            <div key={role} className="rounded-[14px] border border-[#e7e3d8] bg-white p-2.5 shadow-[0_14px_28px_rgba(32,31,24,0.08),inset_0_2px_0_rgba(255,255,255,0.9)]">
                              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-[11px] bg-[#f5f3ed] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_7px_14px_rgba(24,24,18,0.10)]">
                                <CompanyLogo company={co} />
                              </div>
                              <p className="text-[9px] text-[#26251f] truncate">{role}</p>
                              <p className="text-[8px] text-[#8a877b] truncate">{co}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>
                </ParallaxLayer>
              </AnimateOnScroll>

              <AnimateOnScroll delay={150} className="order-1 md:order-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Application Tracker</p>
                <h2 id="tracker-heading" className="font-light text-[clamp(32px,9vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.035em] mb-6 md:tracking-[-0.04em]">
                  Every application.<br />One Kanban board.
                </h2>
                <p className="text-[16px] leading-[26px] text-[#5f5d54] tracking-[-0.08px] mb-8 max-w-[420px]">
                  Drag cards from Saved to Applied, through Interviewing, to Offer. Log every role with salary range, location, source URL, and notes. See your ATS score on each card.
                </p>
                <ul className="flex flex-col gap-3">
                  {[
                    "Drag-and-drop Kanban: Saved → Applied → Interviewing → Offer → Closed",
                    "ATS score badge visible on every card",
                    "Auto-tracked when you apply directly from the job feed",
                    "Add any job manually with salary, location, and notes",
                    "Pipeline summary on your dashboard at a glance",
                  ].map((t) => (
                    <li key={t} className="flex min-w-0 gap-3 text-[14px] text-[#5f5d54]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#c6f46b] mt-[7px] shrink-0" />
                      <span className="min-w-0 leading-[22px]">{t}</span>
                    </li>
                  ))}
                </ul>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURE 5 — Community + Network
        ══════════════════════════════════════════ */}
        <section className="py-14 md:py-28" aria-labelledby="community-heading">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10">
            <div className="grid gap-10 md:grid-cols-2 md:gap-16 items-start">

              <AnimateOnScroll>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Community & Network</p>
                <h2 id="community-heading" className="font-light text-[clamp(32px,9vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.035em] mb-6 md:tracking-[-0.04em]">
                  Find insiders<br />at your target<br />companies.
                </h2>
                <p className="text-[16px] leading-[26px] text-[#5f5d54] tracking-[-0.08px] mb-8 max-w-[420px]">
                  Join industry and role-specific community rooms. Connect with peers, find people who work at the companies you&apos;re targeting, and build relationships before you need a referral.
                </p>
                <div className="flex flex-col gap-5">
                  {[
                    { icon: Users, title: "Community Rooms", detail: "Topic-based spaces for every industry and role: UX Designers, PMs, Engineers, Finance. Join the rooms that matter to your search." },
                    { icon: FileText, title: "Public Profile", detail: "A shareable profile URL with your full experience, skills, and portfolio. Send your link instead of attaching a PDF." },
                    { icon: UserCheck, title: "Professional Network", detail: "Discover, connect, and follow professionals. See connection counts, follow insiders at target companies, manage requests in one place." },
                  ].map(({ icon: Icon, title, detail }) => (
                    <div key={title} className="flex gap-4">
                      <div className="w-9 h-9 rounded-xl border border-[#eceae3] bg-white flex items-center justify-center text-[#5f5d54] shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[14px] text-[#26251f] mb-1">{title}</p>
                        <p className="text-[13px] text-[#5f5d54] leading-snug">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AnimateOnScroll>

              {/* Community rooms mock */}
              <AnimateOnScroll delay={150}>
                <ParallaxLayer distance={30}>
                <div className="relative flex flex-col gap-3 rounded-[28px] border border-white/80 bg-[#f7f6f1] p-3 shadow-[0_28px_70px_rgba(24,24,18,0.12),0_8px_22px_rgba(24,24,18,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]">
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-12 rounded-full bg-white/80 blur-2xl" />
                  {[
                    { name: "UX Designers", members: 2847, posts: 312, tag: "Design", joined: true },
                    { name: "Product Managers", members: 4120, posts: 891, tag: "Product", joined: false },
                    { name: "Frontend Engineers", members: 3654, posts: 547, tag: "Engineering", joined: false },
                    { name: "Data Scientists", members: 1983, posts: 224, tag: "Data", joined: false },
                    { name: "Career Changers", members: 5312, posts: 1024, tag: "General", joined: false },
                  ].map(({ name, members, posts, tag, joined }) => (
                    <div key={name} className="relative flex flex-wrap items-center gap-3 rounded-[22px] border border-[#e7e3d8] bg-white p-4 shadow-[0_18px_38px_rgba(32,31,24,0.10),0_3px_0_rgba(255,255,255,0.95)_inset] sm:flex-nowrap sm:gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#f5f3ed] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_20px_rgba(24,24,18,0.12)]">
                        <CommunityLogo tag={tag} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] text-[#26251f]">{name}</p>
                        <p className="text-[12px] text-[#8a877b]">{members.toLocaleString()} members · {posts} posts</p>
                      </div>
                      <span className="ml-[56px] shrink-0 rounded-full border border-[#e7e3d8] bg-white px-2.5 py-1 text-[10px] text-[#8a877b] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_14px_rgba(24,24,18,0.05)] sm:ml-0">{tag}</span>
                      <button className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] ${joined ? "border border-[#e7e3d8] bg-white text-[#5f5d54] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_14px_rgba(24,24,18,0.05)]" : "bg-[#161611] text-[#fafaf8] shadow-[0_10px_18px_rgba(22,22,17,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]"}`}>
                        {joined ? "Leave" : "Join"}
                      </button>
                    </div>
                  ))}
                </div>
                </ParallaxLayer>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════════ */}
        <section className="py-14 md:py-24" aria-labelledby="testimonials-heading">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10">
            <AnimateOnScroll className="mb-10 md:mb-12">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">What users say</p>
              <h2 id="testimonials-heading" className="font-light text-[clamp(32px,9vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.035em] md:tracking-[-0.04em]">
                They stopped guessing.<br />So did their recruiters.
              </h2>
            </AnimateOnScroll>

            <AnimateOnScroll delay={100} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-3 bg-[#fafaf8] border border-[#eceae3] rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-colors duration-200 hover:bg-[#f5f3ed]">
                <div className="flex gap-0.5 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#c6f46b] text-[#c6f46b]" />)}
                </div>
                <p className="font-light text-[clamp(17px,2vw,22px)] text-[#26251f] leading-snug mb-8 flex-1">
                  &ldquo;I uploaded my CV and within 20 minutes had analyzed three job listings. The ATS score flagged 6 missing keywords I never would have caught. The tailored version I downloaded got me an interview two days later.&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-5 border-t border-[#eceae3]">
                  <div className="w-8 h-8 rounded-full bg-[#eceae3] flex items-center justify-center text-[#5f5d54] text-[11px] shrink-0">JK</div>
                  <div>
                    <p className="text-[14px] text-[#26251f]">James K.</p>
                    <p className="text-[12px] text-[#8a877b]">Software Engineer</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-4">
                {[
                  { name: "Priya M.", role: "UX Designer", initials: "PM", text: "The fit score made me realize I was applying to roles 30 points below my actual skill level. I started targeting senior roles. Got two offers in six weeks." },
                  { name: "Sasha B.", role: "Product Manager", initials: "SB", text: "Tracker + AI analysis together is a game changer. I can see my ATS score on every card. I know which applications are strong and which need a tailored resubmit." },
                ].map(({ name, role, initials, text }) => (
                  <div key={name} className="bg-[#fafaf8] border border-[#eceae3] rounded-2xl p-6 flex flex-col flex-1 transition-colors duration-200 hover:bg-[#f5f3ed]">
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-[#c6f46b] text-[#c6f46b]" />)}
                    </div>
                    <p className="text-[14px] text-[#5f5d54] leading-relaxed mb-4 flex-1">&ldquo;{text}&rdquo;</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-[#eceae3]">
                      <div className="w-7 h-7 rounded-full bg-[#eceae3] flex items-center justify-center text-[#5f5d54] text-[10px] shrink-0">{initials}</div>
                      <div>
                        <p className="text-[13px] text-[#26251f]">{name}</p>
                        <p className="text-[12px] text-[#8a877b]">{role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FULL FEATURE LIST
        ══════════════════════════════════════════ */}
        <section className="py-14 md:py-24" aria-labelledby="all-features-heading">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10">
            <AnimateOnScroll className="mb-10 md:mb-12">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Everything included</p>
              <h2 id="all-features-heading" className="font-light text-[clamp(32px,9vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.035em] md:tracking-[-0.04em]">
                One platform.<br />Every tool your<br />job search needs.
              </h2>
            </AnimateOnScroll>

            <AnimateOnScroll delay={80} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6">

              {/* AI Suite — full-width combined card */}
              <div className="relative border-t border-[#eceae3] px-5 py-7 sm:px-7 sm:py-8 md:px-8 lg:px-10 lg:col-span-6 lg:border-l-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <FeatureClayIcon title="One-Click CV Tailoring" Icon={Sparkles} />
                      <span className="rounded-full bg-[#e2fab0] px-2.5 py-1 text-[10px] leading-none text-[#5f6d38] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">AI</span>
                    </div>
                    <h3 className="mb-3 text-[16px] leading-[22px] text-[#26251f]">AI-Powered CV Suite</h3>
                    <p className="text-[13px] leading-[20px] text-[#5f5d54] max-w-[420px]">Upload your CV once. AI parses it, scores it against any job description, checks ATS compatibility, and rewrites your bullets in one click.</p>
                  </div>
                  <div className="grid w-full grid-cols-1 gap-2 shrink-0 sm:grid-cols-2 lg:w-[380px]">
                    {[
                      { icon: Upload,   label: "CV Parsing",              sub: "PDF or DOCX in under 30s" },
                      { icon: Target,   label: "Fit Score Analysis",      sub: "0–100 score per job" },
                      { icon: Zap,      label: "ATS Compatibility",       sub: "Keyword and format check" },
                      { icon: Sparkles, label: "One-Click CV Tailoring",  sub: "Download as DOCX or PDF" },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="flex items-start gap-2.5 rounded-[10px] bg-[#f5f4f0] px-3.5 py-3">
                        <Icon className="w-3.5 h-3.5 text-[#5f5d54] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[12px] font-medium text-[#26251f] leading-[1.3]">{label}</p>
                          <p className="text-[11px] text-[#8a877b] leading-[1.4] mt-0.5">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Remaining features */}
              {[
                { icon: FileText,        tag: "Live",   title: "Live Job Feed",           desc: "Browse thousands of real listings updated daily. Filter by remote, salary band, or employment type. Analyze any role in one click.", colSpan: "lg:col-span-2", borderL: false },
                { icon: LayoutDashboard, tag: "Kanban", title: "Application Tracker",     desc: "Drag-and-drop Kanban from Saved to Offer. ATS score visible on every card. Auto-tracked when you apply from the job feed.",        colSpan: "lg:col-span-2", borderL: true },
                { icon: Users,           tag: "Free",   title: "Community Rooms",         desc: "Topic-based rooms for every industry and role. Find peers, insiders at target companies, and people who can refer you.",            colSpan: "lg:col-span-2", borderL: true },
                { icon: UserCheck,       tag: "Free",   title: "Professional Networking", desc: "Discover, connect, and follow professionals. Manage connection requests and notifications in one place.",                           colSpan: "lg:col-span-3", borderL: false },
                { icon: Star,            tag: "Free",   title: "Public Profile",          desc: "A shareable profile URL with your full experience, skills, and links. Send it instead of a cold PDF attachment.",                   colSpan: "lg:col-span-3", borderL: true },
              ].map(({ icon: Icon, tag, title, desc, colSpan, borderL }, i) => (
                <div
                  key={title}
                  className={`relative min-h-[204px] border-t border-[#eceae3] px-5 py-7 sm:px-7 sm:py-8 md:px-8 lg:px-8 ${colSpan} ${
                    i % 2 === 1 ? "md:border-l md:border-l-[#eceae3]" : ""
                  } ${borderL ? "lg:border-l lg:border-l-[#eceae3]" : "lg:border-l-0"}`}
                >
                  <div className="mb-7 flex items-start justify-between gap-5">
                    <FeatureClayIcon title={title} Icon={Icon} />
                    <span className="rounded-full bg-[#e2fab0] px-2.5 py-1 text-[10px] leading-none text-[#5f6d38] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">{tag}</span>
                  </div>
                  <div className="max-w-[560px]">
                    <h3 className="mb-3 text-[16px] leading-[22px] text-[#26251f]">{title}</h3>
                    <p className="text-[13px] leading-[20px] text-[#5f5d54]">{desc}</p>
                  </div>
                </div>
              ))}
            </AnimateOnScroll>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            WAITLIST / ROADMAP
        ══════════════════════════════════════════ */}
        <section className="py-14 md:py-20" aria-labelledby="roadmap-heading">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10">
            <AnimateOnScroll className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-10 md:mb-12">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Coming soon</p>
                <h2 id="roadmap-heading" className="font-light text-[clamp(30px,8.5vw,52px)] leading-[1.05] text-[#161611] tracking-[-0.035em] md:tracking-[-0.04em]">
                  The platform is getting sharper.<br />Early users shape what ships next.
                </h2>
              </div>
              <div className="w-full shrink-0 md:w-auto">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a877b] mb-4">Be first when these ship</p>
                <WaitlistForm />
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={80} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { tag: "Coming soon", tagStyle: "border-[#c6f46b] text-[#3d3c36]",  title: "Referral Request Templates",  desc: "AI-written outreach tailored to the role, your connection, and how well you know them. An ask that gets replies." },
                { tag: "Coming soon", tagStyle: "border-[#c6f46b] text-[#3d3c36]",  title: "AI Interview Prep",           desc: "Practise answers to questions likely to come up for your target role, generated from the job description, not generic question lists." },
                { tag: "In design",   tagStyle: "border-[#eceae3] text-[#8a877b]",   title: "Insider Finder",              desc: "See which community members work at or have worked at your target companies. Know who to reach out to before searching cold." },
                { tag: "In design",   tagStyle: "border-[#eceae3] text-[#8a877b]",   title: "Career Path Modelling",       desc: "Map the gap between your current skills and your target role. Surfaces the specific experiences that close it fastest." },
              ].map(({ tag, tagStyle, title, desc }) => (
                <div key={title} className="bg-[#fafaf8] border border-[#eceae3] rounded-2xl p-6 flex flex-col gap-4">
                  <span className={`self-start text-[11px] px-2.5 py-1 rounded-full border ${tagStyle}`}>{tag}</span>
                  <div>
                    <h3 className="text-[15px] text-[#26251f] mb-1.5">{title}</h3>
                    <p className="text-[13px] leading-[20px] text-[#5f5d54]">{desc}</p>
                  </div>
                </div>
              ))}
            </AnimateOnScroll>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA
        ══════════════════════════════════════════ */}
        <section className="px-3 py-14 md:px-6 md:py-28" aria-labelledby="cta-heading">
          <div className="mx-auto max-w-[1280px] rounded-[28px] border border-[#d7f5a0] bg-[#c6f46b] p-5 shadow-[0_30px_90px_rgba(101,135,24,0.20),inset_0_1px_0_rgba(255,255,255,0.55)] sm:rounded-[38px] sm:p-6 md:p-10">
            <AnimateOnScroll className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
              <div>
                <p className="text-[13px] leading-[19px] text-[#26251f]/50 mb-6">Free, no card needed</p>
                <h2 id="cta-heading" className="font-light text-[clamp(38px,11vw,96px)] text-[#161611] tracking-[-0.045em] leading-[0.95] md:leading-[0.92] md:tracking-[-0.05em]">
                  Upload your CV.<br />Know your score.
                </h2>
              </div>
              <div className="flex w-full shrink-0 flex-col items-start gap-4 md:w-auto md:items-end">
                <p className="text-[14px] leading-[22px] text-[#26251f]/60 max-w-[280px] md:text-right">
                  AI fit scores, ATS analysis, one-click CV tailoring, live job feed, application tracker, community, and professional networking: all in one platform.
                </p>
                <Link href="/signup" className="group flex h-[52px] items-center gap-3 rounded-full bg-[#161611] py-1 pl-6 pr-1.5 text-[14px] text-[#fafaf8] shadow-[0_18px_40px_rgba(22,22,17,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#26251f] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161611] focus-visible:ring-offset-2 sm:h-[56px] sm:pl-7 sm:text-[15px]">
                  Get started for free
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-[17px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-hover:-translate-y-px sm:h-11 sm:w-11">↗</span>
                </Link>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="px-3 pb-6 md:px-6" aria-label="Site footer">
        <div className="mx-auto max-w-[1280px] rounded-[28px] border border-white/70 bg-white/58 px-5 py-8 shadow-[0_20px_60px_rgba(24,24,18,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] sm:rounded-[32px] sm:px-6 sm:py-10 md:px-10">
        <div className="grid grid-cols-1 gap-8 min-[420px]:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-end gap-px">
              <div className="bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 9, height: 12 }} />
              <div className="bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 11, height: 22 }} />
              <div className="bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 16, height: 32 }} />
            </div>
            <p className="text-[12px] text-[#8a877b] leading-relaxed max-w-[140px] mt-3">AI-powered job matching and CV optimization.</p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#3d3c36] mb-3">AI Tools</p>
            <ul className="space-y-2">
              {["CV Parser", "Fit Score", "ATS Checker", "CV Tailoring"].map((l) => (
                <li key={l}><Link href="/signup" className="text-[12px] text-[#8a877b] hover:text-[#26251f] transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#3d3c36] mb-3">Platform</p>
            <ul className="space-y-2">
              {["Live Job Feed", "Application Tracker", "Community", "Network"].map((l) => (
                <li key={l}><Link href="/signup" className="text-[12px] text-[#8a877b] hover:text-[#26251f] transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#3d3c36] mb-3">Account</p>
            <ul className="space-y-2">
              {[["Sign in", "/login"], ["Create account", "/signup"]].map(([l, h]) => (
                <li key={l}><Link href={h} className="text-[12px] text-[#8a877b] hover:text-[#26251f] transition-colors">{l}</Link></li>
              ))}
              <li><Link href="/recruiter/login" className="text-[12px] text-[#8a877b] hover:text-[#26251f] transition-colors">For organisations</Link></li>
              <li><Link href="/recruiter/signup" className="text-[12px] text-[#8a877b] hover:text-[#26251f] transition-colors">Organisation signup</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#eceae3] pt-5">
          <p className="text-[12px] text-[#8a877b]">© 2026 Progrize. All rights reserved.</p>
          <p className="text-[12px] text-[#8a877b]">ATS scores are AI estimates, not guaranteed results.</p>
        </div>
        </div>
      </footer>

    </div>
  );
}
