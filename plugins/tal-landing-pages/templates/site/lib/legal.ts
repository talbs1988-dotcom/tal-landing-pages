/**
 * עזרים טהורים לדפים המשפטיים: עיצוב פרטי העסק, תאריכים,
 * ואילו סעיפים מופיעים לפי מה שהאתר באמת אוסף (site.collects).
 *
 * כל ערך שלא מולא מוצג כ-TODO גלוי, כדי שלא יעלה לאוויר דף עם חור שקט.
 */
import { TODO, isFilled, isTodo } from "@/lib/todo";

/** ערך להצגה: הטקסט עצמו אם מולא, אחרת סימון TODO גלוי */
export function display(v: string): string {
  return isFilled(v) ? v.trim() : TODO;
}

type Address = { street: string; city: string; postalCode: string };

/** האם לעסק יש כתובת לפרסום. שלושה שדות ריקים ("") = אין כתובת */
export function hasAddress(a: Address): boolean {
  return [a.street, a.city, a.postalCode].some((p) => p.trim() !== "");
}

/**
 * הכתובת בשורה אחת: "רחוב 5, עיר, 1234567".
 * אין כתובת ← "". כתובת שלא מולאה בכלל ← TODO אחד (לא שלושה).
 */
export function formatAddress(a: Address): string {
  if (!hasAddress(a)) return "";
  const parts = [a.street, a.city, a.postalCode]
    .map((p) => p.trim())
    .filter((p) => p !== "");
  if (parts.every((p) => isTodo(p))) return TODO;
  return parts.join(", ");
}

const ID_LABELS: Record<string, string> = {
  "עוסק פטור": "מס' עוסק",
  "עוסק מורשה": "מס' עוסק",
  'חברה בע"מ': "ח.פ.",
  עמותה: "מס' עמותה",
};

/** איך קוראים למספר המזהה לפי סוג העסק */
export function idLabel(type: string): string {
  return ID_LABELS[type] ?? "מס' עוסק / ח.פ.";
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-11-01" ← תאריך תקין, אחרת null */
export function parseIsoDate(iso: string): Date | null {
  const m = ISO_DATE.exec(iso.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  )
    return null;
  return date;
}

/** "2026-11-01" ← "1 בנובמבר 2026". תאריך חסר או לא תקין ← TODO */
export function formatHebrewDate(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return TODO;
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** חיבור רשימה בעברית: "שם, מייל וטלפון" */
export function listHe(items: string[]): string {
  return new Intl.ListFormat("he", { type: "conjunction" }).format(items);
}

/** מה המחיר כולל, לפי סוג העסק (עוסק פטור לא גובה מע"מ) */
export function vatNote(type: string): string {
  if (type === "עוסק פטור")
    return 'המחירים באתר הם המחירים הסופיים לתשלום. העסק רשום כעוסק פטור, ולכן לא מתווסף להם מע"מ.';
  return 'המחירים באתר כוללים מע"מ כחוק, אלא אם נכתב במפורש אחרת.';
}

export type FormField = { label: string; required: boolean };

/** אילו שדות הטופס אוסף, ואילו מהם חובה, לפי site.form.phone */
export function collectedFields(form: {
  phone: "required" | "optional" | "hidden";
}): FormField[] {
  const fields: FormField[] = [
    { label: "שם", required: true },
    { label: "כתובת מייל", required: true },
  ];
  if (form.phone !== "hidden")
    fields.push({ label: "מספר טלפון", required: form.phone === "required" });
  return fields;
}

// ---------- סעיפים ותוכן עניינים ----------

export type Collects = { form: boolean; pixel: boolean; analytics: boolean };

/** מה קובע אילו סעיפים מופיעים: מה האתר אוסף, והאם יש לעסק כתובת */
export type SectionContext = Collects & { hasAddress: boolean };

export type SectionDef = {
  id: string;
  title: string;
  /** מתי הסעיף מופיע. בלי תנאי ← תמיד */
  when?: (c: SectionContext) => boolean;
};

/** הסעיפים שמופיעים בפועל, בסדר הקבוע. משמש גם לתוכן העניינים וגם לתוכן עצמו */
export function visibleSections<T extends SectionDef>(
  defs: readonly T[],
  ctx: SectionContext,
): T[] {
  return defs.filter((d) => !d.when || d.when(ctx));
}

export const PRIVACY_SECTIONS = [
  { id: "controller", title: "מי אחראי על המידע" },
  {
    id: "collected",
    title: "איזה מידע נאסף בטופס ולמה",
    when: (c: SectionContext) => c.form,
  },
  { id: "automatic", title: "מידע שנאסף אוטומטית" },
  { id: "recipients", title: "למי המידע מועבר" },
  { id: "cookies", title: "עוגיות ואחסון בדפדפן" },
  {
    id: "pixel",
    title: "פיקסל של מטא (פייסבוק ואינסטגרם)",
    when: (c: SectionContext) => c.pixel,
  },
  {
    id: "analytics",
    title: "כלי ניתוח תנועה",
    when: (c: SectionContext) => c.analytics,
  },
  { id: "abroad", title: "העברת מידע אל מחוץ לישראל" },
  { id: "retention", title: "כמה זמן המידע נשמר" },
  { id: "security", title: "אבטחת המידע" },
  { id: "rights", title: "הזכויות שלכם" },
  { id: "contact", title: "יצירת קשר" },
  { id: "changes", title: "שינויים במדיניות" },
] as const satisfies readonly SectionDef[];

export const TERMS_SECTIONS = [
  { id: "business", title: "פרטי העסק" },
  { id: "use", title: "השימוש באתר" },
  { id: "content", title: "המידע באתר" },
  { id: "ip", title: "קניין רוחני" },
  { id: "prices", title: "מחירים ותשלום" },
  { id: "cancellation", title: "ביטול עסקה" },
  { id: "liability", title: "אחריות" },
  { id: "privacy", title: "פרטיות" },
  { id: "law", title: "הדין החל וסמכות שיפוט" },
  { id: "contact", title: "יצירת קשר" },
] as const satisfies readonly SectionDef[];

export const ACCESSIBILITY_SECTIONS = [
  { id: "commitment", title: "המחויבות שלנו" },
  { id: "standard", title: "רמת הנגישות" },
  { id: "done", title: "מה עשינו באתר" },
  { id: "widget", title: "תפריט הנגישות" },
  { id: "limitations", title: "מגבלות ידועות" },
  {
    id: "physical",
    title: "נגישות במקום העסק",
    when: (c: SectionContext) => c.hasAddress,
  },
  { id: "coordinator", title: "פניות בנושא נגישות" },
  { id: "updated", title: "עדכון ההצהרה" },
] as const satisfies readonly SectionDef[];

export const DELETION_SECTIONS = [
  { id: "how", title: "איך מבקשים מחיקה" },
  { id: "what", title: "מה נמחק" },
  { id: "kept", title: "מה ייתכן שיישמר" },
  { id: "time", title: "תוך כמה זמן" },
  { id: "meta", title: "מידע אצל מטא", when: (c: SectionContext) => c.pixel },
  { id: "mailing", title: "רק להפסיק לקבל דיוור" },
] as const satisfies readonly SectionDef[];

export type SectionId<T extends readonly SectionDef[]> = T[number]["id"];
