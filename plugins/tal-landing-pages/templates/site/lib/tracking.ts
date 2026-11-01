import type { TrackingKey } from "@/lib/utm";

/**
 * איסוף מקור התנועה בדפדפן: UTM ו-fbclid מהכתובת, _fbp/_fbc מהעוגיות של מטא,
 * ה-referrer והנתיב שבו הגולש נחת. פונקציה טהורה: מקבלת את הערכים מבחוץ.
 * השרת מנקה ומסנן שוב (lib/utm.ts), אז כאן רק אוספים.
 */
const MAX = 300;
const URL_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
] as const;

/**
 * שמות של שדות הטופס. אם הטופס נשלח בדרך הרגילה של הדפדפן (לפני שהדף סיים להיטען),
 * הם עלולים להיכנס לכתובת. לא שומרים אותם בנתיב הנחיתה, כדי שפרטים אישיים
 * לא יגיעו לגיבוי, ל-Make או למטא.
 */
const FORM_PARAMS = ["name", "email", "phone", "website", "marketingConsent"];

/** הנתיב שבו הגולש נחת, בלי פרמטרים של שדות הטופס */
function landingPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  if (!FORM_PARAMS.some((k) => params.has(k))) return pathname + search;
  for (const k of FORM_PARAMS) params.delete(k);
  const rest = params.toString();
  return rest ? `${pathname}?${rest}` : pathname;
}

export function readCookie(cookie: string, name: string): string {
  for (const part of cookie.split(";")) {
    const i = part.indexOf("=");
    if (i === -1 || part.slice(0, i).trim() !== name) continue;
    const raw = part.slice(i + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return "";
}

/** מזהי העוגיות של מטא (_fbp, _fbc). רק כשהגולש אישר עוגיות שיווק, אחרת ריק */
export function metaCookies(
  cookie: string,
  marketing: boolean,
): { fbp: string; fbc: string } {
  if (!marketing) return { fbp: "", fbc: "" };
  return {
    fbp: readCookie(cookie, "_fbp").slice(0, MAX),
    fbc: readCookie(cookie, "_fbc").slice(0, MAX),
  };
}

/** עוגיות של מטא שמוחקים כשהגולש מבטל הסכמה לשיווק */
export const META_COOKIES = ["_fbp", "_fbc"] as const;

/**
 * מחרוזות document.cookie שמוחקות עוגיות: בלי domain (הדומיין הנוכחי),
 * ועם כל דומיין-אב (הפיקסל שומר את _fbp על הדומיין הבסיסי, למשל .example.co.il).
 * דומיין שהוא סיומת ציבורית (co.il) הדפדפן פשוט מתעלם ממנו.
 */
export function expiredCookies(names: readonly string[], hostname: string): string[] {
  const base = "=; Max-Age=0; path=/";
  const isIp = /^[\d.]+$/.test(hostname) || hostname.includes(":");
  const labels = hostname.split(".");
  const domains: string[] = [];
  if (!isIp && labels.length >= 2) {
    for (let i = 0; i <= labels.length - 2; i++) domains.push(labels.slice(i).join("."));
  }
  return names.flatMap((n) => [
    `${n}${base}`,
    ...domains.map((d) => `${n}${base}; domain=${d}`),
  ]);
}

export function collectTracking(src: {
  search: string;
  pathname: string;
  cookie: string;
  referrer: string;
}): Record<TrackingKey, string> {
  const params = new URLSearchParams(src.search);
  const cut = (v: string | null) => (v ?? "").slice(0, MAX);
  const fromUrl = Object.fromEntries(
    URL_KEYS.map((k) => [k, cut(params.get(k))]),
  ) as Record<(typeof URL_KEYS)[number], string>;
  return {
    ...fromUrl,
    fbp: cut(readCookie(src.cookie, "_fbp")),
    fbc: cut(readCookie(src.cookie, "_fbc")),
    referrer: cut(src.referrer),
    landingPath: cut(landingPath(src.pathname, src.search)),
  };
}
