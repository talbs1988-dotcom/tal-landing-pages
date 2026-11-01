import { describe, expect, it } from "vitest";
import { site, type SiteConfig } from "@/site.config";
import { TODO } from "@/lib/todo";
import {
  FALLBACK_TITLE,
  buildJsonLd,
  buildRobots,
  buildSitemap,
  buildRootMetadata,
  noindex,
  ogTexts,
  pageMetadata,
  serializeJsonLd,
} from "@/lib/seo";

type SeoConfig = Pick<SiteConfig, "page" | "business">;

/** כל מחרוזת ← TODO, בכל עומק */
function allTodo<T>(v: T): T {
  if (typeof v === "string") return TODO as T;
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, allTodo(x)]),
    ) as T;
  return v;
}

/**
 * config ריק לגמרי: הכול TODO (כמו התבנית). נבנה מהמבנה של site.config ולא מהערכים,
 * כדי שהבדיקה תעבור גם בדף שכבר מילאו.
 */
function empty(): SeoConfig {
  return allTodo(structuredClone({ page: site.page, business: site.business }));
}

/** config מלא, עם שינויים */
function full(
  over: {
    page?: Partial<SeoConfig["page"]>;
    business?: Partial<SeoConfig["business"]>;
  } = {},
): SeoConfig {
  return {
    page: {
      url: "https://example.co.il",
      title: "המדריך לגיוס עובד ראשון",
      description: "איך מגייסים עובד בלי לשרוף כסף",
      ogTitle: "גיוס עובד בלי סיכון",
      ogSubtitle: "מדריך חינם לבעלי עסקים",
      lastUpdated: "2026-11-01",
      checkoutUrl: "",
      googleVerification: "",
      ...over.page,
    },
    business: {
      legalName: "ישראלה ישראלי",
      displayName: "סטודיו ישראלה",
      type: "עוסק מורשה",
      idNumber: "123456789",
      address: { street: "הרצל 1", city: "תל אביב", postalCode: "6100000" },
      phone: "050-1234567",
      email: "hello@example.co.il",
      accessibilityCoordinator: { name: "x", phone: "x", email: "x" },
      ...over.business,
    },
  };
}

/** כל המחרוזות בעומק האובייקט */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value instanceof URL) return [value.href];
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}

const leaks = (v: unknown) =>
  strings(v).filter((s) => s.includes(TODO) || s.includes("למלא"));

describe("אימות Search Console בתגית meta", () => {
  it("ריק או TODO ← אין תגית אימות", () => {
    expect(buildRootMetadata(full()).verification).toBeUndefined();
    expect(
      buildRootMetadata(full({ page: { googleVerification: TODO } }))
        .verification,
    ).toBeUndefined();
  });
  it("מולא ← verification.google עם הערך", () => {
    const m = buildRootMetadata(full({ page: { googleVerification: " abc123 " } }));
    expect(m.verification).toEqual({ google: "abc123" });
  });
});

describe("buildRootMetadata", () => {
  it("config מלא: תבנית כותרת, תיאור, OG ו-twitter", () => {
    const m = buildRootMetadata(full());
    expect(String(m.metadataBase)).toBe("https://example.co.il/");
    expect(m.title).toEqual({
      default: "המדריך לגיוס עובד ראשון",
      template: "%s | סטודיו ישראלה",
    });
    expect(m.description).toBe("איך מגייסים עובד בלי לשרוף כסף");
    expect(m.openGraph).toMatchObject({
      type: "website",
      locale: "he_IL",
      siteName: "סטודיו ישראלה",
      title: "המדריך לגיוס עובד ראשון",
      description: "איך מגייסים עובד בלי לשרוף כסף",
    });
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("לא קובע canonical ב-layout (אחרת כל הדפים יורשים את /)", () => {
    const m = buildRootMetadata(full());
    expect(m.alternates).toBeUndefined();
    expect(m.openGraph).not.toHaveProperty("url");
  });

  it("config ריק: שום [למלא] לא דולף", () => {
    const m = buildRootMetadata(empty());
    expect(leaks(m)).toEqual([]);
    expect(m.title).toEqual({ default: FALLBACK_TITLE, template: "%s" });
    expect(m.description).toBeUndefined();
    expect(m.openGraph).not.toHaveProperty("siteName");
    expect(String(m.metadataBase)).toBe("http://localhost:3000/");
  });

  it("בלי כותרת: נופל לשם העסק", () => {
    const m = buildRootMetadata(full({ page: { title: TODO } }));
    expect(m.title).toEqual({
      default: "סטודיו ישראלה",
      template: "%s | סטודיו ישראלה",
    });
  });

  it("בלי displayName: נופל ל-legalName", () => {
    const m = buildRootMetadata(full({ business: { displayName: TODO } }));
    expect(m.title).toMatchObject({ template: "%s | ישראלה ישראלי" });
  });

  it("TODO בתוך טקסט (לא רק הערך כולו) נחשב לא מולא", () => {
    const m = buildRootMetadata(
      full({ page: { description: `מדריך ל${TODO}` } }),
    );
    expect(m.description).toBeUndefined();
    expect(leaks(m)).toEqual([]);
  });
});

describe("pageMetadata", () => {
  it("canonical ו-og:url של הדף, וכותרת שעוברת בתבנית", () => {
    const m = pageMetadata(full(), {
      path: "/privacy",
      title: "מדיניות פרטיות",
    });
    expect(m.title).toBe("מדיניות פרטיות");
    expect(m.alternates).toEqual({ canonical: "/privacy" });
    expect(m.openGraph).toMatchObject({
      url: "/privacy",
      locale: "he_IL",
      type: "website",
      title: "מדיניות פרטיות | סטודיו ישראלה",
    });
  });

  it("הדף הראשי: canonical / בלי כותרת משלו", () => {
    const m = pageMetadata(full(), { path: "/" });
    expect(m.title).toBeUndefined();
    expect(m.alternates).toEqual({ canonical: "/" });
    expect(m.openGraph).toMatchObject({
      url: "/",
      title: "המדריך לגיוס עובד ראשון",
    });
  });

  it("config ריק: שום [למלא] לא דולף", () => {
    const m = pageMetadata(empty(), { path: "/terms", title: "תקנון" });
    expect(leaks(m)).toEqual([]);
    expect(m.openGraph).toMatchObject({ title: "תקנון" });
  });
});

describe("noindex", () => {
  it("חוסם אינדוקס", () => {
    expect(noindex.robots).toEqual({ index: false, follow: false });
  });
});

describe("buildJsonLd", () => {
  it("כתובת מלאה ← LocalBusiness עם PostalAddress", () => {
    expect(buildJsonLd(full())).toEqual({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "סטודיו ישראלה",
      legalName: "ישראלה ישראלי",
      url: "https://example.co.il/",
      email: "hello@example.co.il",
      telephone: "050-1234567",
      address: {
        "@type": "PostalAddress",
        streetAddress: "הרצל 1",
        addressLocality: "תל אביב",
        postalCode: "6100000",
        addressCountry: "IL",
      },
    });
  });

  it("בלי כתובת ← Organization, בלי address", () => {
    const d = buildJsonLd(
      full({ business: { address: { street: "", city: "", postalCode: "" } } }),
    );
    expect(d?.["@type"]).toBe("Organization");
    expect(d).not.toHaveProperty("address");
  });

  it("רק עיר בלי רחוב ← עדיין Organization", () => {
    const d = buildJsonLd(
      full({
        business: { address: { street: TODO, city: "חיפה", postalCode: "" } },
      }),
    );
    expect(d?.["@type"]).toBe("Organization");
  });

  it("מיקוד לא מולא ← מושמט", () => {
    const d = buildJsonLd(
      full({
        business: {
          address: { street: "הרצל 1", city: "תל אביב", postalCode: TODO },
        },
      }),
    );
    expect(d?.address).not.toHaveProperty("postalCode");
  });

  it("שדות TODO מושמטים, ובלי url של localhost", () => {
    const d = buildJsonLd(
      full({
        page: { url: TODO },
        business: { email: TODO, phone: TODO, legalName: TODO },
      }),
    );
    expect(d).not.toHaveProperty("url");
    expect(d).not.toHaveProperty("email");
    expect(d).not.toHaveProperty("telephone");
    expect(d).not.toHaveProperty("legalName");
    expect(leaks(d)).toEqual([]);
  });

  it("legalName זהה לשם ← לא חוזר פעמיים", () => {
    const d = buildJsonLd(full({ business: { legalName: "סטודיו ישראלה" } }));
    expect(d).not.toHaveProperty("legalName");
  });

  it("התבנית הריקה ← null (לא מוציאים כלום)", () => {
    expect(buildJsonLd(empty())).toBeNull();
  });
});

describe("serializeJsonLd", () => {
  it("לא מאפשר לסגור את תגית ה-script", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(JSON.parse(out)).toEqual({
      name: "</script><script>alert(1)</script>",
    });
  });

  it("בורח גם מ-& ומ-U+2028/2029, ונשאר JSON תקין", () => {
    const value = { name: "א & ב\u2028ג\u2029" };
    const out = serializeJsonLd(value);
    expect(out).not.toContain("&");
    expect(out).not.toContain("\u2028");
    expect(out).not.toContain("\u2029");
    expect(JSON.parse(out)).toEqual(value);
  });

  it("עברית נשארת קריאה", () => {
    expect(serializeJsonLd({ name: "סטודיו" })).toBe('{"name":"סטודיו"}');
  });
});

describe("ogTexts", () => {
  it("ogTitle ו-ogSubtitle כשיש", () => {
    expect(ogTexts(full())).toEqual({
      title: "גיוס עובד בלי סיכון",
      subtitle: "מדריך חינם לבעלי עסקים",
      name: "סטודיו ישראלה",
    });
  });

  it("בלי ogTitle ← title. בלי ogSubtitle ← שם העסק", () => {
    expect(
      ogTexts(full({ page: { ogTitle: TODO, ogSubtitle: TODO } })),
    ).toEqual({
      title: "המדריך לגיוס עובד ראשון",
      subtitle: "סטודיו ישראלה",
      name: "סטודיו ישראלה",
    });
  });

  it("רק שם עסק ← הוא הכותרת, ולא חוזר", () => {
    expect(
      ogTexts(full({ page: { ogTitle: TODO, ogSubtitle: TODO, title: TODO } })),
    ).toEqual({ title: "סטודיו ישראלה", subtitle: "", name: "" });
  });

  it("התבנית הריקה ← מחרוזות ריקות, אף פעם לא [למלא]", () => {
    const t = ogTexts(empty());
    expect(t).toEqual({ title: "", subtitle: "", name: "" });
  });
});

describe("buildSitemap", () => {
  it("הדפים הציבוריים בלבד, בכתובות מלאות, בלי דף התודה", () => {
    const s = buildSitemap(full());
    expect(s.map((e) => e.url)).toEqual([
      "https://example.co.il/",
      "https://example.co.il/privacy",
      "https://example.co.il/terms",
      "https://example.co.il/accessibility",
      "https://example.co.il/data-deletion",
    ]);
    expect(s.some((e) => e.url.includes("thank-you"))).toBe(false);
    expect(s[0]).toMatchObject({ lastModified: "2026-11-01", priority: 1 });
  });

  it("תבנית ריקה: localhost ובלי lastModified", () => {
    const s = buildSitemap(empty());
    expect(s[0].url).toBe("http://localhost:3000/");
    expect(s[0]).not.toHaveProperty("lastModified");
    expect(leaks(s)).toEqual([]);
  });
});

describe("buildRobots", () => {
  it("חוסם את דף התודה וה-API ומצביע על מפת האתר", () => {
    expect(buildRobots(full())).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/thank-you", "/api/"] },
      sitemap: "https://example.co.il/sitemap.xml",
    });
  });
});
