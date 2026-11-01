/**
 * ניקוי טקסט שמגיע מהדפדפן.
 * מסיר תווי בקרה, תווים ברוחב אפס ותווי כיווניות (שמשמשים להסוואה ולזיופים),
 * ומכווץ רווחים.
 */
// eslint-disable-next-line no-control-regex
// תווי בקרה, חוץ מטאב ושורה חדשה (שהופכים לרווח בהמשך)
const CONTROL = /[\u0000-\u0008\u000E-\u001F\u007F-\u009F]/g;
// ZWSP/ZWNJ/ZWJ, LRM/RLM, LRE..RLO, word joiner + isolates, BOM, soft hyphen, ALM
const INVISIBLE = /[​-‏‪-‮⁠-⁯﻿­؜᠎]/g;

export function cleanText(input: string): string {
  return input
    .replace(INVISIBLE, "")
    .replace(CONTROL, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** מחרוזת נקייה וחתוכה, או "" אם הקלט לא מחרוזת */
export function cleanString(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  // חותכים לפני הניקוי כדי לא לעבד מחרוזות ענקיות, ושוב אחריו
  return cleanText(input.slice(0, max * 4)).slice(0, max);
}
