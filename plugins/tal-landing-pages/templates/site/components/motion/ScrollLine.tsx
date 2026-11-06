"use client";

import { motion, useScroll, useSpring, useReducedMotionConfig } from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * קו אנכי שמתמלא בזמן הגלילה לאורך התוכן (שלבים, ציר זמן). הקו בצד שבו מתחילים לקרוא.
 * בלי תנועה: הקו מלא מההתחלה.
 */
export function ScrollLine({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionConfig();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <div ref={ref} className={`relative ${className}`}>
      <div aria-hidden="true" className="absolute inset-y-0 start-5 w-px bg-foreground/15 md:start-7" />
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-0 start-5 w-px origin-top bg-accent md:start-7"
        style={{ scaleY: reduce ? 1 : scaleY }}
      />
      {children}
    </div>
  );
}
