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
    landingPath: cut(src.pathname + src.search),
  };
}
