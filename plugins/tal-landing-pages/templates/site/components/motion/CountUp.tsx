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
  // מספר בלבד: "300+" או טקסט שעוד חסר בקופי הם לא מספר. את ה"+" שמים במפתח נפרד ליד
  const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString(locale) : "");

  // אחרי הטעינה, ורק כשיש תנועה: מתחילים מ-0 עד שהמספר נכנס למסך (בלי לקפוץ מהערך לאפס מול העיניים)
  useEffect(() => {
    if (!reduce && !inView) setShown(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

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
