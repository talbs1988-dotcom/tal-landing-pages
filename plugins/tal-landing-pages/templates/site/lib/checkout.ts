/**
 * דף שהפעולה בו היא קנייה: לאן הכפתור מוביל.
 * הכלל: רק כתובת https מלאה ותקינה. כל דבר אחר (ריק, TODO, http, טקסט) ← null,
 * והכפתור גולל לטופס כמו בדף לידים. check:todo ו-npm run check תופסים ערך שמולא לא נכון.
 */
import { isFilled } from "@/lib/todo";

export function checkoutHref(value: unknown): string | null {
  if (!isFilled(value)) return null;
  const v = value.trim();
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return null;
    if (!/^[^.\s]+(\.[^.\s]+)+$/.test(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}
