"use client";

import { motion, useReducedMotionConfig, type HTMLMotionProps } from "motion/react";
import { EASE } from "./ease";

type Variant = "rise" | "fade" | "blur" | "scale" | "slide-start";

const FROM: Record<Variant, Record<string, number | string>> = {
  rise: { opacity: 0, y: 28 },
  fade: { opacity: 0 },
  blur: { opacity: 0, y: 12, filter: "blur(10px)" },
  scale: { opacity: 0, scale: 0.94 },
  // מהצד שבו מתחילים לקרוא (ימין ב-RTL)
  "slide-start": { opacity: 0, x: 40 },
};
const TO = { opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" };

type Props = Omit<HTMLMotionProps<"div">, "initial" | "whileInView"> & {
  variant?: Variant;
  delay?: number;
  duration?: number;
  /** כמה מהאלמנט צריך להיכנס למסך לפני שהוא מופיע (0–1) */
  amount?: number;
};

/**
 * אלמנט שמופיע כשהוא נכנס למסך. לא על הפתיחה (שם משתמשים ב-animate, כדי שהכותרת
 * תופיע מיד), ולא על הטופס.
 * בלי תנועה ("עצירת אנימציות" או הגדרת המכשיר): הכול מופיע מיד בטעינה, גם מה שעוד לא
 * הגיע למסך, כדי שחיפוש בדף, צילום מסך ובודקי נגישות יראו את כל התוכן.
 */
export function Reveal({ variant = "rise", delay = 0, duration = 0.7, amount = 0.25, transition, ...rest }: Props) {
  const reduce = useReducedMotionConfig();
  return (
    <motion.div
      initial={FROM[variant]}
      {...(reduce ? { animate: TO } : { whileInView: TO })}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE, ...transition }}
      {...rest}
    />
  );
}

/** קבוצה שהילדים שלה (StaggerItem) מופיעים אחד אחרי השני */
export function Stagger({ gap = 0.09, delay = 0, amount = 0.2, ...rest }: Omit<HTMLMotionProps<"div">, "variants"> & { gap?: number; delay?: number; amount?: number }) {
  const reduce = useReducedMotionConfig();
  return (
    <motion.div
      initial="hidden"
      {...(reduce ? { animate: "show" } : { whileInView: "show" })}
      viewport={{ once: true, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
      {...rest}
    />
  );
}

export function StaggerItem({ variant = "rise", ...rest }: Omit<HTMLMotionProps<"div">, "variants"> & { variant?: Variant }) {
  return (
    <motion.div
      variants={{ hidden: FROM[variant], show: { ...TO, transition: { duration: 0.65, ease: EASE } } }}
      {...rest}
    />
  );
}
