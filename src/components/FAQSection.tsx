"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "How does the AI fit score work?",
    a: "Our AI cross-references your CV against the job description across four dimensions: skill overlap, experience relevance, title alignment, and location match. Each dimension is scored 0–100 and combined into a single fit score. The higher the score, the closer your background matches what the employer is looking for.",
  },
  {
    q: "How accurate is the ATS compatibility check?",
    a: "The ATS score measures your CV against the criteria most automated screening systems use: keyword coverage, required skill presence, section completeness, and measurable impact. It's not a guarantee — ATS systems vary — but it surfaces the specific gaps that most commonly cause CVs to be filtered out before a human reads them.",
  },
  {
    q: "Is my CV data secure and private?",
    a: "Yes. Your CV is parsed and stored in a private, encrypted database linked only to your account. We do not sell, share, or use your CV data to train AI models. You can delete your data at any time from account settings.",
  },
  {
    q: "Can I tailor my CV for multiple roles?",
    a: "That's the core use case. Each tailored version is a separate file generated for a specific job description. Your original CV is always preserved. You can generate as many tailored versions as your plan allows.",
  },
  {
    q: "What file formats can I upload?",
    a: "We support PDF and DOCX files. The AI parser handles complex multi-column layouts and custom section headers. If your CV has unusual formatting, the parsed output will still capture all text — you can review and correct the structured profile before running an analysis.",
  },
  {
    q: "Do I need a credit card to get started?",
    a: "No. The Free plan requires only an email address. You get 3 job analyses per day plus access to the core tracker and community features. Upgrade to Pro at any time to unlock unlimited analyses, one-click CV tailoring, and the full live job feed.",
  },
];

const EASE = [0.25, 1, 0.5, 1] as const;

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-[#fafaf8] py-16 md:py-24" aria-labelledby="faq-heading">
      <div className="max-w-[860px] mx-auto px-6 md:px-10">
        <div className="mb-12">
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#eceae3] text-[10px] uppercase tracking-[0.18em] text-[#8a877b] mb-4">FAQ</span>
          <h2 id="faq-heading" className="font-light text-[clamp(36px,5vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.04em]">
            Honest answers.
          </h2>
        </div>

        <div className="flex flex-col divide-y divide-[#eceae3]">
          {FAQS.map(({ q, a }, i) => (
            <div key={i} className="py-5">
              <button
                className="w-full flex items-center justify-between gap-6 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="text-[15px] text-[#161611] leading-snug">{q}</span>
                <motion.div
                  animate={{ rotate: open === i ? 45 : 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-[#eceae3] bg-white"
                >
                  <Plus className="w-3.5 h-3.5 text-[#5f5d54]" strokeWidth={2} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="pt-4 pb-1 text-[14px] leading-[24px] text-[#5f5d54] max-w-[680px]">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
