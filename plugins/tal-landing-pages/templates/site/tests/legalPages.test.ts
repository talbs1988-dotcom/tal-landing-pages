import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/*
 * הדפים המשפטיים כמו שהם נבנים: רינדור אמיתי של הדף, עם משתני סביבה ו-config לבדיקה.
 */

const config = vi.hoisted(() => ({
  address: { street: "", city: "", postalCode: "" },
  noticeAddress: "ת.ד. 4321, חיפה 3100001",
  offerType: "service" as "service" | "product" | "both",
  email: "required" as "required" | "optional" | "hidden",
  phone: "required" as "required" | "optional" | "hidden",
}));

vi.mock("@/site.config", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/site.config")>();
  return {
    ...mod,
    site: {
      ...mod.site,
      business: { ...mod.site.business, address: config.address },
      // getters: כל בדיקה משנה את config, והדף קורא את הערך ברינדור
      legal: {
        ...mod.site.legal,
        noticeAddress: config.noticeAddress,
        get offerType() {
          return config.offerType;
        },
      },
      form: {
        ...mod.site.form,
        get email() {
          return config.email;
        },
        get phone() {
          return config.phone;
        },
      },
    },
  };
});

import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import DataDeletionPage from "@/app/data-deletion/page";

const PAGES = { privacy: PrivacyPage, terms: TermsPage, deletion: DataDeletionPage };

// משתני הסביבה נקראים בזמן הרינדור (siteCollects), אז אין צורך לטעון מחדש
function render(page: keyof typeof PAGES): string {
  return renderToStaticMarkup(createElement(PAGES[page] as () => ReactElement));
}

afterEach(() => {
  vi.unstubAllEnvs();
  config.offerType = "service";
  config.email = "required";
  config.phone = "required";
});

describe("מדיניות הפרטיות: CAPI", () => {
  it("CAPI פעיל: התנאי הכפול (דיוור וגם עוגיות שיווק) ומזהי העוגיות", async () => {
    vi.stubEnv("META_PIXEL_ID", "123456789012345");
    vi.stubEnv("META_CAPI_TOKEN", "tok");
    const html = render("privacy");
    expect(html).toContain("Conversions API");
    expect(html).toMatch(/סימנתם בטופס הסכמה לדיוור\s+וגם\s+אישרתם עוגיות שיווק/);
    expect(html).toMatch(/_fbp/);
    expect(html).toMatch(/בלי אחת משתי ההסכמות/);
  });

  it("רק פיקסל בדפדפן, בלי CAPI: אין פסקה על דיווח מהשרת", async () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123456789012345");
    vi.stubEnv("META_PIXEL_ID", "");
    vi.stubEnv("META_CAPI_TOKEN", "");
    const html = render("privacy");
    expect(html).toContain("פיקסל של מטא");
    expect(html).not.toContain("Conversions API");
  });

  it("מזהי העוגיות של מטא מוזכרים כמידע שנשמר עם פנייה, רק כשיש הסכמה", async () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123456789012345");
    const html = render("privacy");
    expect(html).toMatch(/אם אישרתם עוגיות שיווק, נשמרים עם הפנייה גם מזהי העוגיות של מטא/);
  });
});

describe("תקנון: מען להודעות ולהחזרות", () => {
  it("בלי כתובת פומבית: המען מ-legal.noticeAddress מופיע בפרטי העסק ובביטול", async () => {
    config.offerType = "product";
    const html = render("terms");
    const count = html.split("ת.ד. 4321, חיפה 3100001").length - 1;
    expect(count).toBeGreaterThanOrEqual(2);
    expect(html).toMatch(/יוחזר לעסק \(ת\.ד\. 4321/);
  });
});

describe("תקנון: נוסח הביטול לפי legal.offerType", () => {
  it("שירות (ברירת המחדל): אין משפט על החזרת מוצר, ואין 14 ימים מקבלת מוצר", () => {
    const html = render("terms");
    expect(html).not.toMatch(/יוחזר לעסק/);
    expect(html).not.toMatch(/החזרת מוצרים/);
    expect(html).not.toMatch(/מוצר:<\/strong>/);
    expect(html).not.toMatch(/מיום קבלת המוצר/);
    expect(html).toMatch(/שירות:<\/strong>/);
    expect(html).toContain("בשירות אין מה להחזיר");
    expect(html).toContain("מען למשלוח הודעות:");
  });

  it("מוצר: משפט ההחזרה עם המען, ובלי סעיף השירות", () => {
    config.offerType = "product";
    const html = render("terms");
    expect(html).toMatch(/יוחזר לעסק/);
    expect(html).toMatch(/מוצר:<\/strong>/);
    expect(html).not.toMatch(/שירות:<\/strong>/);
    expect(html).not.toContain("בשירות אין מה להחזיר");
    expect(html).toContain("מען למשלוח הודעות ולהחזרת מוצרים");
  });

  it("גם וגם: שני הנוסחים", () => {
    config.offerType = "both";
    const html = render("terms");
    expect(html).toMatch(/יוחזר לעסק/);
    expect(html).toContain("בשירות אין מה להחזיר");
    expect(html).toMatch(/מוצר:<\/strong>/);
    expect(html).toMatch(/שירות:<\/strong>/);
  });
});

describe("פרטיות ומחיקה: מה נאסף, לפי השדות שבטופס", () => {
  it("בלי מייל בטופס: המדיניות לא מזכירה מייל כשדה, וגם לא כמידע שעובר למטא", () => {
    config.email = "hidden";
    vi.stubEnv("META_PIXEL_ID", "123456789012345");
    vi.stubEnv("META_CAPI_TOKEN", "tok");
    const privacy = render("privacy");
    expect(privacy).not.toContain("כתובת מייל");
    expect(privacy).toMatch(/הדיווח כולל את\s+הטלפון שלכם/);
    const deletion = render("deletion");
    expect(deletion).toMatch(/עם הטלפון בהצפנה/);
    expect(deletion).toContain("בשיחה מאותו מספר טלפון");
    expect(deletion).not.toContain("כתובת המייל ברשימת");
  });

  it("בלי טלפון בטופס: רק המייל", () => {
    config.phone = "hidden";
    vi.stubEnv("META_PIXEL_ID", "123456789012345");
    vi.stubEnv("META_CAPI_TOKEN", "tok");
    const privacy = render("privacy");
    expect(privacy).not.toContain("מספר טלפון");
    expect(privacy).toMatch(/הדיווח כולל את\s+המייל שלכם/);
  });

  it("מייל וטלפון רשות: כתוב שצריך למלא לפחות אחד", () => {
    config.email = "optional";
    config.phone = "optional";
    const privacy = render("privacy");
    expect(privacy).toMatch(/שם\s+הוא שדה חובה/);
    expect(privacy).toContain("צריך למלא לפחות אחד מהם");
  });
});
