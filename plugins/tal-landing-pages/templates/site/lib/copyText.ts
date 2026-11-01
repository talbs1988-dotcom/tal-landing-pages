/**
 * הטקסטים השיווקיים של הדף: content/copy.json.
 *
 * - `t("hero.title")` מחזיר את הטקסט, או את הסימון TODO אם המפתח חסר או ריק.
 * - `alt("hero")` מחזיר את תיאור התמונה מ-"img.hero", באותו כלל.
 * - `editProps("hero.title")` מחזיר `{ "data-edit": "hero.title" }` רק ב-`npm run dev`,
 *   כדי שמצב העריכה ידע איזה מפתח לשמור. בבנייה לייצור הוא ריק, ושום סימון לא יוצא ל-HTML.
 *
 * המפתחות מוקלדים לפי copy.json: מפתח שלא קיים בקובץ הוא שגיאת טיפוסים, ולא נבלע בשקט.
 */
import copy from "@/content/copy.json";
import { TODO } from "@/lib/todo";

export type CopyDict = Readonly<Record<string, string>>;

/** כל מפתח שקיים ב-copy.json */
export type CopyKey = keyof typeof copy & string;

/** השמות של התמונות (מה שאחרי "img.") שיש להן מפתח ב-copy.json */
export type ImageName = CopyKey extends infer K
  ? K extends `img.${infer N}`
    ? N
    : never
  : never;

/** מבנה מפתח: שטוח, עם נקודה לפחות אחת, אותיות לטיניות וספרות (hero.title, faq.q1, img.hero) */
export const COPY_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;

/** הטקסט של מפתח במילון, או TODO אם הוא חסר, ריק או לא מחרוזת */
export function textFrom(dict: CopyDict, key: string): string {
  if (!Object.hasOwn(dict, key)) return TODO;
  const value: unknown = dict[key];
  return typeof value === "string" && value.trim() !== "" ? value : TODO;
}

/** תיאור תמונה (alt) מ-"img.<name>", או TODO */
export function altFrom(dict: CopyDict, name: string): string {
  return textFrom(dict, `img.${name}`);
}

export type EditProps = { "data-edit"?: string };

/** הסימון למצב עריכה: רק ב-development */
export function editPropsFor(
  key: string,
  nodeEnv: string | undefined,
): EditProps {
  return nodeEnv === "development" ? { "data-edit": key } : {};
}

const dict: CopyDict = copy;

export function t(key: CopyKey): string {
  return textFrom(dict, key);
}

export function alt(name: ImageName): string {
  return altFrom(dict, name);
}

export function editProps(key: CopyKey): EditProps {
  return editPropsFor(key, process.env.NODE_ENV);
}
