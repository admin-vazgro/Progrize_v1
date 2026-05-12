"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "Jobs",       href: "/jobs" },
  { label: "Tracker",   href: "/tracker" },
  { label: "Community", href: "/community" },
  { label: "Pricing",   href: "#pricing" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function NavBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[rgba(250,250,248,0.88)] backdrop-blur-xl border-b border-[#eceae3]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 h-[60px] flex items-center justify-between gap-8">
          <Link
            href="/"
            className="flex items-end gap-px shrink-0"
            aria-label="Progrize home"
            onClick={() => setOpen(false)}
          >
            <div className="bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 9, height: 13 }} />
            <div className="bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 12, height: 22 }} />
            <div className="bg-[#1c1c1c] rounded-tl-[58px] rounded-bl-[5px]" style={{ width: 17, height: 33 }} />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-[13px] text-[#3d3c36]" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) =>
              href.startsWith("#") ? (
                <a key={label} href={href} className="hover:text-[#161611] transition-colors duration-200">{label}</a>
              ) : (
                <Link key={label} href={href} className="hover:text-[#161611] transition-colors duration-200">{label}</Link>
              )
            )}
          </nav>

          <div className="hidden md:flex items-center gap-4 shrink-0">
            <Link href="/login" className="text-[13px] text-[#3d3c36] hover:text-[#161611] transition-colors duration-200">Sign in</Link>
            <Link href="/signup" className="bg-[#26251f] text-[#fafaf8] text-[13px] px-4 h-[36px] rounded-lg flex items-center hover:bg-[#161611] active:scale-[0.97] transition-all duration-200">
              Start free
            </Link>
          </div>

          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[6px] shrink-0 -mr-1"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <motion.span
              className="block h-[1.5px] w-6 bg-[#161611] origin-center"
              animate={open ? { y: 3.75, rotate: 45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            />
            <motion.span
              className="block h-[1.5px] w-6 bg-[#161611] origin-center"
              animate={open ? { y: -3.75, rotate: -45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-40 bg-[rgba(250,250,248,0.97)] backdrop-blur-2xl flex flex-col"
            style={{ paddingTop: 60 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <nav className="flex flex-col px-6 pt-10 gap-1" aria-label="Mobile navigation">
              {NAV_LINKS.map(({ label, href }, i) => {
                const linkClass = "text-[28px] font-light text-[#161611] tracking-[-0.02em] py-3 border-b border-[#eceae3] last:border-0 hover:text-[#5f5d54] transition-colors block";
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, delay: 0.06 + i * 0.05, ease: EASE }}
                  >
                    {href.startsWith("#") ? (
                      <a href={href} onClick={() => setOpen(false)} className={linkClass}>{label}</a>
                    ) : (
                      <Link href={href} onClick={() => setOpen(false)} className={linkClass}>{label}</Link>
                    )}
                  </motion.div>
                );
              })}
            </nav>

            <motion.div
              className="flex flex-col gap-3 px-6 mt-auto pb-10 pt-6"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.28, ease: EASE }}
            >
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center h-[52px] rounded-xl bg-[#26251f] text-[#fafaf8] text-[15px] hover:bg-[#161611] active:scale-[0.97] transition-all duration-200"
              >
                Start free
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center h-[52px] rounded-xl border border-[#eceae3] text-[#3d3c36] text-[15px] hover:bg-[#f5f4ef] active:scale-[0.97] transition-all duration-200"
              >
                Sign in
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
