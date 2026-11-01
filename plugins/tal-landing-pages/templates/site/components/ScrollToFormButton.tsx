"use client";

import type { ReactNode } from "react";
import { shouldReduceMotion } from "@/lib/a11y";

/**
 * כפתור שגולל לטופס (#lead-form) ומעביר אליו את הפוקוס,
 * כדי שגם מי שמנווט במקלדת או בקורא מסך יגיע לטופס.
 */
export function ScrollToFormButton({
  children,
  className = "",
  targetId = "lead-form",
}: {
  children: ReactNode;
  className?: string;
  targetId?: string;
}) {
  function handleClick() {
    const target = document.getElementById(targetId);
    if (!target) return;
    // גם הגדרת המערכת וגם "עצירת אנימציות" בכפתור הנגישות
    const reduceMotion = shouldReduceMotion();
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    target.focus({ preventScroll: true });
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
