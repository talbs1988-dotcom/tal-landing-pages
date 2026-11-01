import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

// מחוץ ל-Next אין router. הטופס צריך רק push
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
}));

const { LeadFormClient } = await import("@/components/LeadFormClient");

/** ה-HTML שהשרת שולח, לפני שה-JS של הדף נטען */
function ssr(props: { capi?: boolean } = {}) {
  return renderToString(
    createElement(LeadFormClient, { capi: false, ...props }),
  );
}

describe("LeadForm: ה-HTML מהשרת (לפני שהדף נטען)", () => {
  it("הטופס נשלח ב-POST, כך ששליחה רגילה של הדפדפן לא מכניסה פרטים לכתובת", () => {
    const html = ssr();
    expect(html).toMatch(/<form[^>]*\bid="lead-form"/);
    expect(html).toMatch(/<form[^>]*\bmethod="post"/);
  });

  it("כפתור השליחה נעול עד שהרכיב עולה", () => {
    const html = ssr();
    const button = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? "";
    expect(button).not.toBe("");
    expect(button).toMatch(/\bdisabled=""/);
  });
});

describe("LeadForm: יידוע הפרטיות כש-CAPI פעיל", () => {
  it("CAPI פעיל: משפט על העברת פרטים מוצפנים למטא למדידת פרסום", () => {
    const html = ssr({ capi: true });
    expect(html).toMatch(/מטא/);
    expect(html).toMatch(/מוצפ/);
    expect(html).toMatch(/מדידת/);
  });

  it("CAPI כבוי: לא מוזכרת מטא", () => {
    expect(ssr({ capi: false })).not.toMatch(/מטא/);
  });
});
