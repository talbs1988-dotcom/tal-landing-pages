import { isFilled } from "@/lib/todo";
import { withScheme } from "@/lib/siteUrl";

/**
 * בדיקת מקור הבקשה לטופס.
 * אם יש כותרת Origin, ה-host שלה חייב להיות אחד מאלה: host של הבקשה,
 * הראשון ב-x-forwarded-host, או ה-host של site.page.url (כשמולא).
 * בלי Origin מאשרים, כי יש לקוחות שלא שולחים אותה.
 */
export function isAllowedOrigin(opts: {
  origin: string | null | undefined;
  host: string | null | undefined;
  forwardedHost?: string | null;
  siteUrl?: string;
}): boolean {
  if (!opts.origin) return true;

  let originHost: string;
  try {
    const u = new URL(opts.origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    originHost = u.host.toLowerCase();
  } catch {
    return false;
  }

  const allowed = new Set<string>();
  const add = (h: string | null | undefined) => {
    const v = h?.trim().toLowerCase();
    if (v) allowed.add(v);
  };
  add(opts.host);
  add(opts.forwardedHost?.split(",")[0]);
  if (isFilled(opts.siteUrl)) {
    try {
      add(new URL(withScheme(opts.siteUrl)).host);
    } catch {
      // כתובת לא תקינה ב-config: מתעלמים
    }
  }
  return allowed.has(originHost);
}
