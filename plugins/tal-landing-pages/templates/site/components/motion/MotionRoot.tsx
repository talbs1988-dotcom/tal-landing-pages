"use client";

import { MotionConfig, MotionGlobalConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { A11Y_CLASSES } from "@/lib/a11y";

/** הגולש ביקש בלי תנועה: בכפתור הנגישות (class על <html>) או בהגדרות המכשיר */
function wantsNoMotion(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains(A11Y_CLASSES.noMotion) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * בלי תנועה, כל אנימציה של motion קופצת ישר לסוף: התוכן מופיע במקומו מיד, בלי דהייה ובלי תזוזה.
 * רץ כבר כשהקובץ נטען, לפני שהדף מתחבר, כדי שגם הכניסה של הפתיחה לא תרוץ.
 * (A11yInit שם את ה-class על <html> לפני כן.)
 */
function applyGlobal(stop: boolean) {
  MotionGlobalConfig.skipAnimations = stop;
  MotionGlobalConfig.instantAnimations = stop;
}
applyGlobal(wantsNoMotion());

/**
 * עוטף את הדף פעם אחת (ב-layout). כל אנימציה של motion בתוכו נעצרת כש:
 * - הגולש ביקש פחות תנועה בהגדרות המכשיר, או
 * - לחץ על "עצירת אנימציות" בכפתור הנגישות (ה-class על <html>).
 * בלי זה, אנימציות של motion לא שומעות את כפתור הנגישות: הן לא עוברות דרך ה-CSS.
 * לולאה שכתבתם בעצמכם בודקת useReducedMotionConfig() (לא useReducedMotion).
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  const [stopped, setStopped] = useState(wantsNoMotion);

  useEffect(() => {
    const html = document.documentElement;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => {
      const stop = wantsNoMotion();
      applyGlobal(stop);
      setStopped(stop);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });
    media.addEventListener("change", read);
    return () => {
      obs.disconnect();
      media.removeEventListener("change", read);
    };
  }, []);

  return (
    <MotionConfig reducedMotion={stopped ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
