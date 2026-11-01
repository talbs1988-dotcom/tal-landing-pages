/**
 * מה שגוגל ורשתות חברתיות רואים: כותרות, תיאור, canonical, Open Graph,
 * ונתונים מובנים (JSON-LD).
 *
 * הכול טהור ונבנה מה-config. כלל הברזל: ערך שעוד לא מולא (TODO) לא יוצא החוצה.
 * במקומו נופלים לערך סביר אחר, או משמיטים את השדה.
 */
import type { Metadata, MetadataRoute } from "next";
import type { SiteConfig } from "@/site.config";
import { isFilled } from "@/lib/todo";
import { siteUrl } from "@/lib/siteUrl";

type SeoConfig = Pick<SiteConfig, "page" | "business">;

/** כותרת כללית כשאין בכלל שם עסק או כותרת. לא אמורה להגיע לאוויר (check:todo חוסם) */
export const FALLBACK_TITLE = "דף נחיתה";

/** הערך אם מולא, אחרת undefined */
function filled(v: string): string | undefined {
  return isFilled(v) ? v.trim() : undefined;
}

/** הראשון שמולא, או undefined */
function firstFilled(...values: string[]): string | undefined {
  for (const v of values) {
    const f = filled(v);
    if (f) return f;
  }
  return undefined;
}

/** השם שמופיע בכותרות: displayName, ואם אין אז legalName */
export function brandName(config: SeoConfig): string | undefined {
  return firstFilled(config.business.displayName, config.business.legalName);
}

/** הכותרת והתיאור של הדף הראשי, אחרי נפילה לערכים סבירים */
function homeTexts(config: SeoConfig) {
  const name = brandName(config);
  return {
    name,
    title: firstFilled(config.page.title) ?? name ?? FALLBACK_TITLE,
    description: filled(config.page.description),
  };
}

/**
 * ה-metadata של ה-layout הראשי. חל על כל הדפים.
 *
 * canonical ו-og:url לא נקבעים כאן בכוונה: Next מוריש אותם לכל הדפים,
 * וכך /privacy היה מצביע על הדף הראשי. כל דף קובע אותם בעצמו עם pageMetadata.
 */
export function buildRootMetadata(config: SeoConfig): Metadata {
  const { name, title, description } = homeTexts(config);
  return {
    metadataBase: siteUrl(config.page.url),
    title: {
      default: title,
      // דף פנימי: "מדיניות פרטיות | שם העסק". בלי שם עסק, רק שם הדף
      template: name ? `%s | ${name}` : "%s",
    },
    ...(description ? { description } : {}),
    ...(name ? { applicationName: name } : {}),
    // אימות Search Console בתגית meta (דף בלי דומיין משלו). ריק או TODO ← אין תגית
    ...(filled(config.page.googleVerification ?? "")
      ? { verification: { google: filled(config.page.googleVerification) } }
      : {}),
    openGraph: openGraphBase(config, title, description),
    twitter: {
      card: "summary_large_image",
      title,
      ...(description ? { description } : {}),
    },
  };
}

function openGraphBase(
  config: SeoConfig,
  title: string,
  description: string | undefined,
): NonNullable<Metadata["openGraph"]> {
  const name = brandName(config);
  return {
    type: "website",
    locale: "he_IL",
    ...(name ? { siteName: name } : {}),
    title,
    ...(description ? { description } : {}),
  };
}

/**
 * metadata לדף מסוים: canonical, og:url, וכותרת אם יש.
 *
 * דוגמה, ב-app/privacy/page.tsx:
 *   export const metadata = pageMetadata(site, { path: "/privacy", title: "מדיניות פרטיות" });
 *
 * בלי title הדף מקבל את כותרת ברירת המחדל (הדף הראשי).
 */
export function pageMetadata(
  config: SeoConfig,
  opts: { path: string; title?: string; description?: string },
): Metadata {
  const home = homeTexts(config);
  const title = opts.title && isFilled(opts.title) ? opts.title : undefined;
  const description =
    opts.description && isFilled(opts.description)
      ? opts.description
      : home.description;
  // הכותרת המלאה לשיתוף, כמו שהיא בלשונית
  const ogTitle = title ? (home.name ? `${title} | ${home.name}` : title) : home.title;
  return {
    ...(title ? { title } : {}),
    ...(opts.description && description ? { description } : {}),
    alternates: { canonical: opts.path },
    openGraph: {
      ...openGraphBase(config, ogTitle, description),
      url: opts.path,
    },
  };
}

/** לדפים שגוגל לא צריך להכיר: דף תודה, 404 */
export const noindex: Metadata = {
  robots: { index: false, follow: false },
};

/** הדפים הציבוריים, לפי הסדר במפת האתר. דף התודה לא כאן בכוונה */
export const PUBLIC_PATHS = [
  "/",
  "/privacy",
  "/terms",
  "/accessibility",
  "/data-deletion",
] as const;

/** נתיבים שגוגל לא סורק */
export const DISALLOWED_PATHS = ["/thank-you", "/api/"] as const;

/** כתובת מלאה לנתיב, על בסיס site.page.url (או localhost כל עוד לא מולא) */
export function absoluteUrl(config: SeoConfig, path: string): string {
  return new URL(path, siteUrl(config.page.url)).href;
}

/* ───────────────────────── JSON-LD ───────────────────────── */

export type JsonLdObject = Record<string, unknown>;

/**
 * נתונים מובנים לגוגל.
 * Organization כברירת מחדל, ו-LocalBusiness כשיש רחוב ועיר.
 * כל שדה שעוד לא מולא מושמט. בלי שם עסק בכלל ← null (לא מוציאים כלום).
 */
export function buildJsonLd(config: SeoConfig): JsonLdObject | null {
  const b = config.business;
  const name = brandName(config);
  if (!name) return null;

  const street = filled(b.address.street);
  const city = filled(b.address.city);
  const isLocal = Boolean(street && city);

  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": isLocal ? "LocalBusiness" : "Organization",
    name,
  };

  const legalName = filled(b.legalName);
  if (legalName && legalName !== name) data.legalName = legalName;

  // כתובת אמיתית בלבד. לא שולחים לגוגל את localhost
  if (isFilled(config.page.url)) {
    const url = siteUrl(config.page.url);
    if (url.hostname !== "localhost") data.url = url.href;
  }

  const email = filled(b.email);
  if (email) data.email = email;
  const telephone = filled(b.phone);
  if (telephone) data.telephone = telephone;

  if (isLocal) {
    const postalCode = filled(b.address.postalCode);
    data.address = {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: city,
      ...(postalCode ? { postalCode } : {}),
      addressCountry: "IL",
    };
  }

  return data;
}

/**
 * JSON בטוח לתוך <script>. בלי זה, טקסט כמו "</script>" בשם העסק
 * היה סוגר את התגית ומזריק HTML לדף.
 */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/* ───────────────────────── תמונת שיתוף ───────────────────────── */

/**
 * הטקסטים בתמונת השיתוף.
 * כותרת: ogTitle ← title ← שם העסק. משנה: ogSubtitle ← שם העסק (אם לא כבר בכותרת).
 * אף פעם לא את סימון החוסר. אם אין כלום, מחרוזת ריקה (התמונה נשארת עם צבעי המותג בלבד).
 */
export function ogTexts(config: SeoConfig): {
  title: string;
  subtitle: string;
  name: string;
} {
  const name = brandName(config) ?? "";
  const title =
    firstFilled(config.page.ogTitle, config.page.title) ?? name;
  const subtitleRaw = filled(config.page.ogSubtitle);
  const subtitle = subtitleRaw ?? (name && name !== title ? name : "");
  return { title, subtitle, name: name === title ? "" : name };
}

/* ───────────────────────── מפת אתר ו-robots ───────────────────────── */

/** lastUpdated אם הוא תאריך תקין בפורמט YYYY-MM-DD */
function lastModified(config: SeoConfig): string | undefined {
  const v = filled(config.page.lastUpdated);
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  return Number.isNaN(Date.parse(v)) ? undefined : v;
}

/** הרשומות של sitemap.xml: הדפים הציבוריים בלבד, בלי דף התודה */
export function buildSitemap(config: SeoConfig): MetadataRoute.Sitemap {
  const modified = lastModified(config);
  return PUBLIC_PATHS.map((path) => ({
    url: absoluteUrl(config, path),
    ...(modified ? { lastModified: modified } : {}),
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.3,
  }));
}

/** robots.txt: הכול פתוח חוץ מדף התודה וה-API, עם לינק למפת האתר */
export function buildRobots(config: SeoConfig): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...DISALLOWED_PATHS],
    },
    sitemap: absoluteUrl(config, "/sitemap.xml"),
  };
}
