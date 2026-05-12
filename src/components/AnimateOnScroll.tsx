"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

type Direction = "up" | "left" | "right";

function getInitial(direction: Direction) {
  if (direction === "left")  return { opacity: 0, x: -32, y: 0 };
  if (direction === "right") return { opacity: 0, x: 32,  y: 0 };
  return { opacity: 0, x: 0, y: 22 };
}

export function AnimateOnScroll({
  children,
  className = "",
  delay = 0,
  threshold = 0.12,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  direction?: Direction;
}) {
  return (
    <motion.div
      className={className}
      initial={getInitial(direction)}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: threshold }}
      transition={{
        duration: 0.7,
        delay: delay / 1000,
        ease: [0.25, 1, 0.5, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
