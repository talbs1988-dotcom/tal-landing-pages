import { isFilled } from "@/lib/todo";

const FALLBACK = "http://localhost:3000";

/**
 * הכתובת הבסיסית של האתר, מתוך site.page.url.
 * כל עוד הכתובת לא מולאה (או לא תקינה) מחזירים localhost, כדי שהבנייה לא תיפול.
 */
export function siteUrl(raw: string): URL {
  if (isFilled(raw)) {
    try {
      const url = new URL(raw.trim());
      if (url.protocol === "https:" || url.protocol === "http:") return url;
    } catch {
      // כתובת לא תקינה: נופלים לברירת המחדל
    }
  }
  return new URL(FALLBACK);
}
