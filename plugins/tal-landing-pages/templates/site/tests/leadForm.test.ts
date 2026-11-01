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
  // טקסטים קבועים: יידוע פרטיות של דף אמיתי יכול להזכיר את מטא בעצמו
  const texts = {
    privacyNotice: "השם והמייל נאספים כדי לחזור אליכם. לא חובה למסור. הפרטים עוברים ל-Make.",
    marketingConsentText: "אשמח לקבל עדכונים בוואטסאפ. אפשר להסיר בכל רגע.",
  };

  it("CAPI פעיל: משפט על העברת פרטים מוצפנים למטא למדידת פרסום", async () => {
    const html = await ssrWith(texts, { capi: true });
    expect(html).toMatch(/מטא/);
    expect(html).toMatch(/מוצפ/);
    expect(html).toMatch(/מדידת/);
  });

  it("CAPI כבוי: לא מוזכרת מטא", async () => {
    expect(await ssrWith(texts, { capi: false })).not.toMatch(/מטא/);
  });
});

describe("LeadForm: גודל הטקסט", () => {
  it("יידוע הפרטיות לפחות 14px (text-sm), לא text-xs", () => {
    const html = ssr();
    const p = html.match(/<p id="[^"]*-privacy"[^>]*>/)?.[0] ?? "";
    expect(p).toMatch(/\btext-sm\b/);
    expect(p).not.toMatch(/\btext-xs\b/);
  });
});

/** הטופס עם form אחר ב-config. השדות נקראים כשהמודול נטען, אז טוענים אותו מחדש */
async function ssrWith(
  form: Record<string, string>,
  props: { capi: boolean } = { capi: true },
) {
  vi.resetModules();
  vi.doMock("@/site.config", async () => {
    const mod = await vi.importActual<typeof import("@/site.config")>("@/site.config");
    return { ...mod, site: { ...mod.site, form: { ...mod.site.form, ...form } } };
  });
  try {
    const { LeadFormClient: Form } = await import("@/components/LeadFormClient");
    return renderToString(createElement(Form, props));
  } finally {
    vi.doUnmock("@/site.config");
    vi.resetModules();
  }
}

describe("LeadForm: השדות לפי form.email ו-form.phone", () => {
  it("מייל מוסתר: אין שדה מייל, ומשפט המטא מזכיר רק את הטלפון", async () => {
    const html = await ssrWith({ email: "hidden", phone: "required" });
    expect(html).not.toMatch(/name="email"/);
    expect(html).toMatch(/name="phone"/);
    expect(html).toMatch(/מעביר את הטלפון בצורה מוצפנת/);
  });

  it("מייל רשות: השדה מוצג עם (לא חובה) ובלי required", async () => {
    const html = await ssrWith({ email: "optional", phone: "required" });
    const input = html.match(/<input[^>]*name="email"[^>]*>/)?.[0] ?? "";
    expect(input).not.toBe("");
    expect(input).not.toMatch(/\brequired=""/);
    expect(html).toContain("(לא חובה)");
  });

  it("מייל חובה: required על השדה", async () => {
    const html = await ssrWith({ email: "required", phone: "required" });
    const input = html.match(/<input[^>]*name="email"[^>]*>/)?.[0] ?? "";
    expect(input).toMatch(/\brequired=""/);
  });

  it("LeadForm (רכיב השרת) זורק כששני השדות מוסתרים, אז הבנייה נכשלת", async () => {
    vi.resetModules();
    vi.doMock("@/site.config", async () => {
      const mod = await vi.importActual<typeof import("@/site.config")>("@/site.config");
      return {
        ...mod,
        site: { ...mod.site, form: { ...mod.site.form, email: "hidden", phone: "hidden" } },
      };
    });
    try {
      const { LeadForm } = await import("@/components/LeadForm");
      expect(() => LeadForm()).toThrow(/לפחות שדה אחד ליצירת קשר/);
    } finally {
      vi.doUnmock("@/site.config");
      vi.resetModules();
    }
  });
});
