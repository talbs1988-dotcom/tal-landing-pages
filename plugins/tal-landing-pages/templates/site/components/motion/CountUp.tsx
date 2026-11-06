"use client";

import { animate, useInView, useReducedMotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * מספר שרץ מ-0 עד הערך כשהוא נכנס למסך. בלי תנועה, או לפני שנטען, מוצג הערך הסופי:
 * מי שקורא את הדף (וגם קורא מסך) תמיד רואה את המספר האמיתי.
 * הערך מגיע מהקופי (copy.json), לא נכתב כאן. למשל value={Number(t("about.stat1"))}.
 */
export function CountUp({ value, duration = 1.6, className, locale = "he-IL" }: { value: number; duration?: number; className?: string; locale?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotionConfig();
  const [shown, setShown] = useState(value);
  const fmt = (n: number) => Math.round(n).toLocaleString(locale);

  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: setShown });
    return () => c.stop();
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      {fmt(reduce ? value : shown)}
    </span>
  );
}
