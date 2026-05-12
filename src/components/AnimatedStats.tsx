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

export function AnimatedStats() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const n30 = useCountUp(30, 1100, active);
  const n10 = useCountUp(10, 1100, active);
  const n9  = useCountUp(9,   900, active);

  const stats = [
    { value: `${n30}s`,    label: "To parse your entire CV with AI" },
    { value: `${n10}K +`,  label: "Live job listings updated daily" },
    { value: `${n9}x`,     label: "More likely to be hired with a referral" },
    { value: "Free",        label: "To start — no card required" },
  ];

  return (
    <div ref={ref} className="w-full px-6 md:px-10">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:flex md:items-center md:justify-center md:gap-16 lg:gap-28 xl:gap-44">
        {stats.map(({ value, label }) => (
          <div key={label} className="flex flex-col gap-1.5 md:gap-[13px] items-start shrink-0">
            <p className="text-[36px] sm:text-[48px] md:text-[64px] leading-none md:leading-[67px] text-black tracking-[-2px] md:tracking-[-2.88px] tabular-nums">{value}</p>
            <p className="text-[11px] md:text-[12px] leading-[15px] md:leading-[16px] text-[#061810] max-w-[130px]">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
