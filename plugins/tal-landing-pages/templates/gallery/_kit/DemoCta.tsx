import type { ReactNode } from "react";

/**
 * הכפתור של הגלריה. בדף אמיתי זה CtaButton (components/sections/CtaButton.tsx) שעוטף את
 * CtaAction, וכל הכפתורים בדף נראים אותו דבר. את ה-className מעתיקים ל-CtaButton.
 */
export const CTA_CLASS =
  "btn-shine inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-lg font-bold text-secondary shadow-[0_10px_40px_-10px_var(--brand-accent)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_50px_-12px_var(--brand-accent)] active:scale-[0.98]";

export function DemoCta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <button type="button" className={`${CTA_CLASS} ${className}`}>
      {children}
    </button>
  );
}
