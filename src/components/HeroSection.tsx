"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedScoreMock } from "./AnimatedScoreMock";

const EASE = [0.25, 1, 0.5, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};

export function HeroSection() {
  return (
    <>
      <section className="relative bg-[#0f1209]" aria-label="Hero">
        {/* Background radial glow */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 w-[900px] h-[480px]"
            style={{ background: "radial-gradient(ellipse at top, rgba(198,244,107,0.10) 0%, transparent 65%)" }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c6f46b]/18 to-transparent" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-10 pt-20 md:pt-28">
          {/* Text block */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center text-center"
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center rounded-full border border-[#c6f46b]/20 bg-[#c6f46b]/8 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#c6f46b] mb-8">
                AI-Powered Career Platform
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-light text-[clamp(44px,7.5vw,104px)] leading-[0.92] tracking-[-0.05em] text-[#fafaf8] mb-5 max-w-[840px]"
            >
              Land the role<br />
              <em className="not-italic text-[#c6f46b]">you actually</em><br />
              deserve.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-[16px] leading-[27px] text-[#fafaf8]/45 max-w-[460px] mb-8"
            >
              Upload your CV once. Get an AI fit score for any job, have it auto-tailored to match, and apply with confidence.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="group flex items-center gap-2 bg-[#c6f46b] text-[#161611] text-[14px] font-medium pl-5 pr-2 h-[46px] rounded-full hover:bg-[#d4ff7a] active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                Get started — it&apos;s free
                <span className="w-7 h-7 rounded-full bg-[#161611]/10 flex items-center justify-center text-[12px] group-hover:translate-x-0.5 group-hover:-translate-y-px transition-transform duration-300">↗</span>
              </Link>
              <a
                href="#how"
                className="flex items-center h-[46px] px-5 rounded-full border border-[#fafaf8]/12 text-[#fafaf8]/55 text-[14px] hover:border-[#fafaf8]/25 hover:text-[#fafaf8]/80 transition-all duration-300"
              >
                See how it works
              </a>
            </motion.div>
          </motion.div>

          {/* Product mock */}
          <motion.div
            initial={{ opacity: 0, y: 52 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.44, ease: EASE }}
            className="relative mt-14 md:mt-20 max-w-[520px] mx-auto"
          >
            <AnimatedScoreMock />
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-44"
          style={{ background: "linear-gradient(to bottom, transparent, #0f1209)" }}
          aria-hidden="true"
        />
      </section>

      {/* Dark → cream transition */}
      <div className="h-14 bg-gradient-to-b from-[#0f1209] to-[#fafaf8]" aria-hidden="true" />
    </>
  );
}
