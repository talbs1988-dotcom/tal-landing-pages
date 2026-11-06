"use client";

import { motion, useScroll, useTransform, useReducedMotionConfig } from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * תוכן (בדרך כלל תמונה) שזז מעט לאט מהגלילה, וכך נראה עמוק יותר מהדף.
 * strength בפיקסלים: 40 עדין, 80 מורגש. בלי תנועה: עומד במקום.
 */
export function Parallax({ children, strength = 50, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionConfig();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [strength, -strength]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y }}>{children}</motion.div>
    </div>
  );
}
