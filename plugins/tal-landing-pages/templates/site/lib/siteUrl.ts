import { isFilled } from "@/lib/todo";

const FALLBACK = "http://localhost:3000";

/**
 * מוסיף https:// לכתובת שנכתבה בלי סכמה ("www.example.co.il", "example.co.il").
 * כתובת שכבר יש לה סכמה (גם javascript:) נשארת כמו שהיא, והבדיקה שאחריה דוחה אותה.
 */
export function withScheme(raw: string): string {
  const s = raw.trim();
  return /^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`;
}

/**
 * הכתובת הבסיסית של האתר, מתוך site.page.url.
 * בלי https:// ← מוסיפים אותו. כל עוד הכתובת לא מולאה (או לא תקינה) מחזירים localhost,
 * כדי שהבנייה לא תיפול. `npm run check:todo` מתריע על כתובת שאינה https תקין.
 */
export function siteUrl(raw: string): URL {
  if (isFilled(raw)) {
    try {
      const url = new URL(withScheme(raw));
      if (url.protocol === "https:" || url.protocol === "http:") return url;
    } catch {
      // כתובת לא תקינה: נופלים לברירת המחדל
    }
  }
  return new URL(FALLBACK);
}
