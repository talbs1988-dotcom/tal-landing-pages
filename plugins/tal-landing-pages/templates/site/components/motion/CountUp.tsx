"use client";

import { animate, useInView, useReducedMotionConfig } from "motion/react";
import { useEffect, useRef, useState, type HTMLAttributes } from "react";

/** "1,200+" → { before: "", n: 1200, after: "+" }. לא מספר → null */
export function parseCount(
  text: string,
): { before: string; n: number; after: string; decimals: number } | null {
  const m = /^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(text.trim());
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return {
    before: m[1],
    n,
    after: m[3],
    decimals: m[2].split(".")[1]?.length ?? 0,
  };
}

/**
 * מספר שרץ מ-0 עד הערך כשהוא נכנס למסך. מקבל את הטקסט מהקופי כמו שהוא ("300", "1,200+", "15 שנה"),
 * ומעביר הלאה את editProps: <CountUp text={t("about.stat1")} {...editProps("about.stat1")} />.
 * - קורא מסך, חיפוש בדף והדפסה תמיד מקבלים את הטקסט המלא (span נסתר לעין). המספר שרץ הוא רק לעין.
 * - בלי תנועה, במצב עריכה (data-edit), או כשהטקסט לא מתחיל במספר: מוצג הטקסט כמו שהוא.
 */
export function CountUp({
  text,
  duration = 1.6,
  locale = "he-IL",
  ...rest
}: {
  text: string;
  duration?: number;
  locale?: string;
} & HTMLAttributes<HTMLSpanElement> & { "data-edit"?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotionConfig();
  const parsed = parseCount(text);
  const editing = Boolean(rest["data-edit"]);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!parsed || reduce || editing || !inView) return;
    const c = animate(0, parsed.n, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setShown,
    });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, editing, text, duration]);

  if (!parsed || reduce || editing)
    return (
      <span ref={ref} {...rest}>
        {text}
      </span>
    );

  // לפני שנכנס למסך: 0 (רק לעין). אחרי: הערך הרץ, ובסוף בדיוק הטקסט מהקופי
  const value = inView ? (shown ?? 0) : 0;
  const done = shown !== null && shown >= parsed.n;
  const visual = done
    ? text
    : `${parsed.before}${value.toLocaleString(locale, { minimumFractionDigits: parsed.decimals, maximumFractionDigits: parsed.decimals })}${parsed.after}`;
  return (
    <span ref={ref} {...rest}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{visual}</span>
    </span>
  );
}
