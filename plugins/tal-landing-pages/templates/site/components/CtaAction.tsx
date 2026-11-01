import type { ReactNode } from "react";
import { site } from "@/site.config";
import { checkoutHref } from "@/lib/checkout";
import { ScrollToFormButton } from "@/components/ScrollToFormButton";

/**
 * הכפתור של הדף. כל כפתור בדף עובר דרך הרכיב הזה (דרך CtaButton של שלב העיצוב).
 * - page.checkoutUrl מלא (https) ← קישור רגיל לדף התשלום החיצוני.
 * - אחרת ← גולל לטופס (#lead-form) ומעביר אליו את הפוקוס.
 */
export function CtaAction({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const href = checkoutHref(site.page.checkoutUrl);
  if (href)
    return (
      <a href={href} rel="noopener" className={className} data-cta="checkout">
        {children}
      </a>
    );
  return (
    <ScrollToFormButton className={className}>{children}</ScrollToFormButton>
  );
}
