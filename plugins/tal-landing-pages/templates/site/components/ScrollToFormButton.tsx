"use client";

import type { ReactNode } from "react";

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
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
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
