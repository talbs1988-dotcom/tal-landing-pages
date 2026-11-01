import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/*
 * הדפים המשפטיים כמו שהם נבנים: רינדור אמיתי של הדף, עם משתני סביבה ו-config לבדיקה.
 */

const config = vi.hoisted(() => ({
  address: { street: "", city: "", postalCode: "" },
  noticeAddress: "ת.ד. 4321, חיפה 3100001",
}));

vi.mock("@/site.config", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/site.config")>();
  return {
    ...mod,
    site: {
      ...mod.site,
      business: { ...mod.site.business, address: config.address },
      legal: { ...mod.site.legal, noticeAddress: config.noticeAddress },
    },
  };
});

import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";

const PAGES = { privacy: PrivacyPage, terms: TermsPage };

// משתני הסביבה נקראים בזמן הרינדור (siteCollects), אז אין צורך לטעון מחדש
function render(page: keyof typeof PAGES): string {
  return renderToStaticMarkup(createElement(PAGES[page] as () => ReactElement));
}

afterEach(() => {
  vi.unstubAllEnvs();
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
    const html = render("terms");
    const count = html.split("ת.ד. 4321, חיפה 3100001").length - 1;
    expect(count).toBeGreaterThanOrEqual(2);
    expect(html).toMatch(/יוחזר לעסק \(ת\.ד\. 4321/);
  });
});
