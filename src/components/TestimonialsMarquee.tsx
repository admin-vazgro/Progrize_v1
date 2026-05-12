import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "James K.",
    role: "Software Engineer",
    initials: "JK",
    text: "I uploaded my CV and within 20 minutes had analyzed three job listings. The ATS score flagged 6 missing keywords I never would have caught. The tailored version got me an interview two days later.",
  },
  {
    name: "Priya M.",
    role: "UX Designer",
    initials: "PM",
    text: "The fit score made me realize I was applying to roles 30 points below my skill level. I started targeting senior roles and got two offers in six weeks.",
  },
  {
    name: "Sasha B.",
    role: "Product Manager",
    initials: "SB",
    text: "Tracker and AI analysis together is a game changer. I can see my ATS score on every card and know exactly which applications need a tailored resubmit.",
  },
  {
    name: "Tomasz W.",
    role: "Backend Engineer",
    initials: "TW",
    text: "The CV tailoring rewrote my experience section in the exact language of the job description. Went from 3 callbacks in 3 months to 3 callbacks in 3 days.",
  },
  {
    name: "Aisha R.",
    role: "Data Scientist",
    initials: "AR",
    text: "I had no idea what keywords ATS systems look for. Progrize showed me exactly which ones I was missing and why my applications were disappearing before a human ever read them.",
  },
  {
    name: "Lucas F.",
    role: "Design Lead",
    initials: "LF",
    text: "Found an insider at my target company through the community rooms. That referral plus a tailored CV — I had an offer within a month.",
  },
  {
    name: "Chen Y.",
    role: "Frontend Engineer",
    initials: "CY",
    text: "Went from a 2% callback rate to 35%. The ATS score alone was worth everything. I didn't know my CV was being filtered before a human read it.",
  },
  {
    name: "Sofia L.",
    role: "Product Designer",
    initials: "SL",
    text: "The analysis found I was underselling measurable impact across my whole CV. After the tailored rewrite, every bullet had a number. Interviews tripled.",
  },
];

function Card({ name, role, initials, text }: (typeof TESTIMONIALS)[0]) {
  return (
    <div className="w-[300px] shrink-0 rounded-2xl border border-[#eceae3] bg-white p-5 shadow-[0_4px_20px_rgba(22,22,17,0.04)]">
      <div className="flex gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-[#c6f46b] text-[#c6f46b]" />
        ))}
      </div>
      <p className="text-[13px] leading-[22px] text-[#5f5d54] mb-4">&ldquo;{text}&rdquo;</p>
      <div className="flex items-center gap-2.5 pt-3 border-t border-[#eceae3]">
        <div className="w-7 h-7 rounded-[7px] bg-[#eceae3] flex items-center justify-center text-[10px] text-[#5f5d54] shrink-0 font-medium">
          {initials}
        </div>
        <div>
          <p className="text-[12px] text-[#26251f] font-medium">{name}</p>
          <p className="text-[11px] text-[#8a877b]">{role}</p>
        </div>
      </div>
    </div>
  );
}

const row1 = TESTIMONIALS.slice(0, 5);
const row2 = TESTIMONIALS.slice(3);

export function TestimonialsMarquee() {
  return (
    <section className="bg-white py-16 md:py-24 overflow-hidden" aria-labelledby="testimonials-heading">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 mb-10">
        <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#eceae3] text-[10px] uppercase tracking-[0.18em] text-[#8a877b] mb-4">What users say</span>
        <h2 id="testimonials-heading" className="font-light text-[clamp(36px,5vw,56px)] leading-[1.05] text-[#161611] tracking-[-0.04em]">
          They stopped guessing.<br />So did their recruiters.
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3 animate-marquee">
          {[...row1, ...row1, ...row1].map((t, i) => <Card key={i} {...t} />)}
        </div>
        <div className="flex gap-3 animate-marquee-reverse">
          {[...row2, ...row2, ...row2].map((t, i) => <Card key={i} {...t} />)}
        </div>
      </div>
    </section>
  );
}
