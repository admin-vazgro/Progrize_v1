"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ReactNode, useRef } from "react";

export function ParallaxLayer({
  children,
  className = "",
  distance = 34,
  reverse = false,
  scale = false,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  reverse?: boolean;
  scale?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : reverse ? [-distance, distance] : [distance, -distance],
  );
  const layerScale = useTransform(scrollYProgress, [0, 0.5, 1], reduceMotion || !scale ? [1, 1, 1] : [1.04, 1.01, 1.04]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y, scale: layerScale, willChange: reduceMotion ? "auto" : "transform" }}
    >
      {children}
    </motion.div>
  );
}

export function ParallaxAura() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, 180]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[70vh] bg-[radial-gradient(circle_at_28%_18%,rgba(198,244,107,0.24),transparent_28%),radial-gradient(circle_at_74%_8%,rgba(255,255,255,0.68),transparent_34%)]"
      style={{ y, willChange: reduceMotion ? "auto" : "transform" }}
    />
  );
}
