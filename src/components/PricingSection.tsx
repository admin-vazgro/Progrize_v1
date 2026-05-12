import Link from "next/link";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Start immediately. See your match score today.",
    cta: "Start for free",
    href: "/signup",
    highlight: false,
    features: [
      "CV upload and AI parsing",
      "3 job analyses per day",
      "Fit score and ATS breakdown",
      "Missing keyword report",
      "Application tracker (5 roles)",
      "Community access",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "/ month",
    desc: "Unlimited access for active job seekers.",
    cta: "Get Pro",
    href: "/signup?plan=pro",
    highlight: true,
    features: [
      "Everything in Free",
      "Unlimited job analyses",
      "One-click CV tailoring",
      "Download as PDF or DOCX",
      "Live job feed (10,000+ roles)",
      "Unlimited application tracker",
      "Priority processing",
    ],
  },
  {
    name: "Enterprise",
    price: "$29",
    period: "/ month",
    desc: "For power users and career coaches.",
    cta: "Contact us",
    href: "/contact",
    highlight: false,
    features: [
      "Everything in Pro",
      "Referral request templates",
      "AI interview prep",
      "Insider Finder (beta)",
      "Career path modelling (beta)",
      "API access",
      "Priority support",
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="bg-[#fafaf8] py-16 md:py-24" aria-labelledby="pricing-heading">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10">
        <div className="mb-12">
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#eceae3] text-[10px] uppercase tracking-[0.18em] text-[#8a877b] mb-4">Pricing</span>
          <h2 id="pricing-heading" className="font-light text-[clamp(36px,5vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.04em]">
            Free to start.<br />Powerful when you need it.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(({ name, price, period, desc, cta, href, highlight, features }) => (
            <div
              key={name}
              className={`relative rounded-2xl p-6 flex flex-col gap-6 ${
                highlight
                  ? "bg-[#161611] shadow-[0_20px_60px_rgba(22,22,17,0.22)]"
                  : "border border-[#eceae3] bg-white"
              }`}
            >
              {highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#c6f46b] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#161611]">
                  Most popular
                </span>
              )}

              <div>
                <p className={`text-[11px] uppercase tracking-[0.18em] mb-4 ${highlight ? "text-[#fafaf8]/40" : "text-[#8a877b]"}`}>
                  {name}
                </p>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className={`text-[52px] font-light leading-none tracking-[-0.04em] ${highlight ? "text-[#fafaf8]" : "text-[#161611]"}`}>
                    {price}
                  </span>
                  <span className={`text-[12px] pb-1 ${highlight ? "text-[#fafaf8]/35" : "text-[#8a877b]"}`}>
                    {period}
                  </span>
                </div>
                <p className={`text-[13px] leading-snug ${highlight ? "text-[#fafaf8]/50" : "text-[#5f5d54]"}`}>
                  {desc}
                </p>
              </div>

              <Link
                href={href}
                className={`flex items-center justify-center h-[44px] rounded-xl text-[14px] font-medium transition-all duration-200 active:scale-[0.97] ${
                  highlight
                    ? "bg-[#c6f46b] text-[#161611] hover:bg-[#d4ff7a]"
                    : "border border-[#eceae3] bg-[#fafaf8] text-[#26251f] hover:bg-white hover:border-[#c8c5bc]"
                }`}
              >
                {cta}
              </Link>

              <ul className="flex flex-col gap-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      className={`w-4 h-4 shrink-0 mt-[1px] ${highlight ? "text-[#c6f46b]" : "text-[#c6f46b]"}`}
                      strokeWidth={2.2}
                    />
                    <span className={`text-[13px] leading-snug ${highlight ? "text-[#fafaf8]/65" : "text-[#5f5d54]"}`}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
