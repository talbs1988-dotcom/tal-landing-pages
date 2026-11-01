/**
 * הסימון לכל דבר שעוד לא ידוע.
 * כל מקום שבו מופיע TODO (גם בתוך טקסט) נספר ב-`npm run check:todo`,
 * והאתר לא עולה לאוויר עד שהספירה מגיעה לאפס.
 */
export const TODO = "[למלא]" as const;
export type Todo = typeof TODO;

/** האם הערך עדיין מחכה למילוי (מחרוזת שמכילה את הסימון) */
export function isTodo(v: unknown): boolean {
  return typeof v === "string" && v.includes(TODO);
}

/** האם יש ערך אמיתי: מחרוזת לא ריקה שאין בה את הסימון */
export function isFilled(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "" && !isTodo(v);
}
