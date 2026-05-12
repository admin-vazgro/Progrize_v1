"use client";
import { useEffect, useRef, useState } from "react";

function useCountUp(to: number, duration: number, active: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, to, duration]);
  return val;
}

function AnimatedBar({ label, value, active, delay = 0 }: {
  label: string;
  value: number;
  active: boolean;
  delay?: number;
}) {
  return (
    <div className="group flex items-center gap-3">
      <span className="w-[104px] shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-[#8a877b]">{label}</span>
      <div className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-[#eceae3] shadow-[inset_0_1px_2px_rgba(22,22,17,0.08)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#a8ee35,#c6f46b_58%,#e5ff91)] shadow-[0_0_18px_rgba(198,244,107,0.42)]"
          style={{
            width: active ? `${value}%` : "0%",
            transition: `width 0.85s cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms`,
          }}
        />
      </div>
      <span className="w-7 shrink-0 text-right font-mono text-[10px] text-[#5f5d54]">{value}</span>
    </div>
  );
}

const BARS = [
  { label: "skill overlap",         value: 82 },
  { label: "keyword coverage",      value: 71 },
  { label: "measurable impact",     value: 55 },
  { label: "section completeness",  value: 88 },
  { label: "title alignment",       value: 65 },
];

const KEYWORDS = ["Figma Tokens", "Design Systems", "A/B testing", "Component libraries"];

export function AnimatedScoreMock() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fit = useCountUp(79, 1200, active);
  const ats = useCountUp(68, 1200, active);

  return (
    <div ref={ref} className="rounded-[2rem] border border-[#eceae3] bg-[#f5f4ef] p-2 shadow-[0_28px_90px_rgba(22,22,17,0.10)]">
      <div className="relative overflow-hidden rounded-[1.55rem] border border-white bg-white p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_18%_0%,rgba(198,244,107,0.22),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(236,234,227,0.82),transparent_38%)]" />
        <div className="relative mb-5 flex items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a877b]">
            analysis result
          </p>
          <span className="rounded-full border border-[#eceae3] bg-[#fafaf8] px-3 py-1 text-[10px] text-[#5f5d54]">
            Lead Product Designer · Notion
          </span>
        </div>

        <div className="relative mb-6 grid grid-cols-2 gap-3">
          {[
            { label: "Fit Score",  value: fit, sub: "Strong match", tone: "bg-[#c6f46b]" },
            { label: "ATS Score",  value: ats, sub: "Good — improvable", tone: "bg-[#f0eee7]" },
          ].map(({ label, value, sub, tone }) => (
            <div key={label} className="rounded-[1.25rem] border border-[#eceae3] bg-[#fafaf8] p-4 shadow-[0_10px_28px_rgba(22,22,17,0.05)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] text-[#8a877b]">{label}</p>
                <span className={`h-2 w-2 rounded-full ${tone}`} />
              </div>
              <p className="mb-1 font-light text-[54px] leading-none tracking-[-0.05em] text-[#161611] tabular-nums">
                {value}
              </p>
              <p className="text-[10px] text-[#8a877b]">{sub}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-6 rounded-[1.25rem] border border-[#eceae3] bg-[#fbfbf9] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a877b]">score breakdown</p>
            <p className="font-mono text-[10px] text-[#8a877b]">0-100</p>
          </div>
          <div className="flex flex-col gap-3">
            {BARS.map(({ label, value }, i) => (
              <AnimatedBar key={label} label={label} value={value} active={active} delay={i * 75} />
            ))}
          </div>
        </div>

        <div className="relative border-t border-[#eceae3] pt-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[#8a877b]">missing keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {KEYWORDS.map((k) => (
              <span key={k} className="rounded-full border border-[#eceae3] bg-white px-2.5 py-1 text-[10px] text-[#5f5d54] shadow-[0_3px_10px_rgba(22,22,17,0.04)]">
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
