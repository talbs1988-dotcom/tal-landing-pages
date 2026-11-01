import type { ContactField } from "@/site.config";
import { cleanText } from "@/lib/text";

export { cleanText };
import type { Tracking } from "@/lib/utm";

/** ליד אחרי ולידציה ונרמול */
export type Lead = {
  name: string;
  /** באותיות קטנות, או "" אם לא נמסר (שדה רשות או מוסתר) */
  email: string;
  /** בפורמט מקומי 0XXXXXXXX(X), או "" אם לא נמסר */
  phone: string;
  /** true רק אם הליד סימן בעצמו את תיבת הדיוור */
  marketingConsent: boolean;
};

export type ValidationErrors = Partial<
  Record<"name" | "email" | "phone" | "form", string>
>;

export type ValidateResult =
  | { ok: true; lead: Lead }
  | { ok: false; errors: ValidationErrors }
  | { ok: false; spam: true };

/** הודעות השגיאה שמוצגות למשתמש (פנייה ניטרלית) */
export const MESSAGES = {
  form: "הפרטים לא נשלחו כמו שצריך. נא לנסות שוב.",
  nameMissing: "נא למלא שם (לפחות 2 תווים).",
  nameLong: "השם ארוך מדי (עד 80 תווים).",
  email: "כתובת המייל לא תקינה.",
  emailMissing: "נא למלא כתובת מייל.",
  phoneMissing: "נא למלא מספר טלפון.",
  phone: "מספר הטלפון לא תקין. למשל: 050-1234567",
  contactMissing: "נא למלא מייל או טלפון, כדי שנוכל לחזור.",
} as const;

/** אילו שדות פרטי קשר בטופס: מייל וטלפון. email חסר = "required" (ברירת המחדל) */
export type FormFields = { email?: ContactField; phone: ContactField };

/** השדות אחרי נרמול: תמיד עם email */
export type ResolvedFields = { email: ContactField; phone: ContactField };

/** ההודעה כששני השדות מוסתרים. מופיעה בשגיאת הבנייה */
export const NO_CONTACT_FIELD =
  'בטופס חייב להיות לפחות שדה אחד ליצירת קשר: מייל או טלפון. ב-site.config.ts גם form.email וגם form.phone הם "hidden". לשנות אחד מהם ל-"required" או ל-"optional".';

/**
 * השדות כמו שהטופס משתמש בהם בפועל.
 * שדה "רשות" שהשדה השני לידו מוסתר הוא הדרך היחידה לחזור לליד, אז הוא חובה.
 * (שניהם מוסתרים: נשאר כמו שהוא, ו-assertContactFields עוצר את הבנייה.)
 */
export function resolveFields(form: FormFields): ResolvedFields {
  let email: ContactField = form.email ?? "required";
  let phone: ContactField = form.phone;
  if (email === "hidden" && phone === "optional") phone = "required";
  if (phone === "hidden" && email === "optional") email = "required";
  return { email, phone };
}

/** null אם הטופס תקין, אחרת ההסבר. התנאי: לפחות מייל או טלפון מוצג */
export function contactFieldsProblem(form: FormFields): string | null {
  const { email, phone } = resolveFields(form);
  return email === "hidden" && phone === "hidden" ? NO_CONTACT_FIELD : null;
}

/** זורק אם אין בטופס שום שדה ליצירת קשר. נקרא מהטופס (רכיב שרת), אז הבנייה נכשלת */
export function assertContactFields(form: FormFields): void {
  const problem = contactFieldsProblem(form);
  if (problem) throw new Error(problem);
}

// מעבר לגבול הזה לא מנסים אפילו לנקות. מונע עיבוד של מחרוזות ענקיות
const RAW_MAX = 1000;
const NAME_MIN = 2;
const NAME_MAX = 80;
const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;

/**
 * ספרות ערביות-הודיות (٠-٩) ופרסיות (۰-۹) הופכות לספרות רגילות,
 * ומקפים מיוחדים (U+2010 עד U+2015, ומינוס U+2212) הופכים למקף רגיל.
 * כך מספר שהוקלד במקלדת בערבית, או הודבק מאתר שמעצב עם מקף שלא נשבר, עובר.
 */
function asciiDigitsAndDashes(s: string): string {
  return s
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[‐-―−]/g, "-");
}

/**
 * מנרמל טלפון ישראלי לפורמט מקומי.
 * מקבל ספרות, רווחים, מקפים, סוגריים ונקודות, עם או בלי +972 / 972 / 00972.
 * נייד 05X ו-07X: 10 ספרות. קווי 02/03/04/08/09: 9 ספרות.
 * מחזיר null אם המספר לא תקין.
 */
export function normalizePhone(raw: string): string | null {
  const s = asciiDigitsAndDashes(cleanText(raw));
  if (!s || s.length > 30 || /[^\d\s\-+().]/.test(s)) return null;
  const hasPlus = s.startsWith("+");
  if (s.indexOf("+", 1) !== -1) return null;
  let d = s.replace(/\D/g, "");
  if (hasPlus) {
    if (!d.startsWith("972")) return null;
    d = d.slice(3);
  } else if (d.startsWith("00972")) {
    d = d.slice(5);
  } else if (d.startsWith("972")) {
    d = d.slice(3);
  }
  if (!d.startsWith("0")) d = `0${d}`;
  if (/^0(5|7)\d{8}$/.test(d) || /^0[2-489]\d{7}$/.test(d)) return d;
  return null;
}

/** 0501234567 → 972501234567 (לדיווח למטא) */
export function phoneToInternational(localPhone: string): string {
  return `972${localPhone.replace(/^0/, "")}`;
}

function rawString(v: unknown): string | null {
  if (typeof v !== "string" || v.length > RAW_MAX) return null;
  return v;
}

export function validateLead(
  input: unknown,
  formFields: FormFields,
): ValidateResult {
  const form = resolveFields(formFields);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: { form: MESSAGES.form } };
  }
  const data = input as Record<string, unknown>;

  // מלכודת בוטים: שדה נסתר שאדם לא רואה ולא ממלא
  if (typeof data.website === "string" && data.website.trim() !== "") {
    return { ok: false, spam: true };
  }

  const errors: ValidationErrors = {};

  const rawName = rawString(data.name);
  const name = rawName === null ? "" : cleanText(rawName);
  if (rawName === null && typeof data.name === "string")
    errors.name = MESSAGES.nameLong;
  else if (name.length < NAME_MIN) errors.name = MESSAGES.nameMissing;
  else if (name.length > NAME_MAX) errors.name = MESSAGES.nameLong;

  let email = "";
  if (form.email !== "hidden") {
    const rawEmail = rawString(data.email);
    const given =
      rawEmail === null
        ? ""
        : cleanText(rawEmail).replace(/\s/g, "").toLowerCase();
    if (typeof data.email === "string" && rawEmail === null) {
      errors.email = MESSAGES.email;
    } else if (!given) {
      if (form.email === "required") errors.email = MESSAGES.emailMissing;
    } else if (given.length > EMAIL_MAX || !EMAIL_RE.test(given)) {
      errors.email = MESSAGES.email;
    } else {
      email = given;
    }
  }

  let phone = "";
  if (form.phone !== "hidden") {
    const rawPhone = rawString(data.phone);
    const given = rawPhone !== null && cleanText(rawPhone) !== "";
    if (typeof data.phone === "string" && rawPhone === null) {
      errors.phone = MESSAGES.phone;
    } else if (!given) {
      if (form.phone === "required") errors.phone = MESSAGES.phoneMissing;
    } else {
      const normalized = normalizePhone(rawPhone as string);
      if (normalized === null) errors.phone = MESSAGES.phone;
      else phone = normalized;
    }
  }

  // שני השדות רשות ושניהם ריקים: אין איך לחזור לליד
  if (
    !errors.email &&
    !errors.phone &&
    email === "" &&
    phone === "" &&
    (form.email !== "hidden" || form.phone !== "hidden")
  ) {
    if (form.email !== "hidden") errors.email = MESSAGES.contactMissing;
    else errors.phone = MESSAGES.contactMissing;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    lead: {
      name,
      email,
      phone,
      marketingConsent: data.marketingConsent === true,
    },
  };
}

/** רשומת ליד מלאה: מה שנשמר בגיבוי. אין בה כתובת IP */
export type LeadRecord = {
  id: string;
  createdAt: string;
  lead: Lead;
  tracking: Tracking;
  /** מזהה האירוע למטא (זהה בפיקסל ובשרת, למניעת כפילות) */
  eventId: string;
  userAgent: string;
  /** הכתובת המלאה של הדף שממנו נשלח הליד */
  pageUrl: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UA_MAX = 400;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/** נתיב מקומי בלבד (מתחיל ב-/ אחד), כדי שלא ייווצר קישור לאתר אחר */
function safePath(p: string): string {
  return p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\")
    ? p
    : "/";
}

export function buildLeadRecord(
  lead: Lead,
  tracking: Tracking,
  meta: { now: Date; baseUrl: URL; eventId?: unknown; userAgent?: unknown },
): LeadRecord {
  let pageUrl: string;
  try {
    pageUrl = new URL(safePath(tracking.landingPath), meta.baseUrl).href;
  } catch {
    pageUrl = new URL("/", meta.baseUrl).href;
  }
  return {
    id: crypto.randomUUID(),
    createdAt: meta.now.toISOString(),
    lead,
    tracking,
    eventId: isUuid(meta.eventId)
      ? meta.eventId.toLowerCase()
      : crypto.randomUUID(),
    userAgent:
      typeof meta.userAgent === "string" ? meta.userAgent.slice(0, UA_MAX) : "",
    pageUrl,
  };
}

/** מה שנשלח לוובהוק (Make): אובייקט שטוח, שדה לכל עמודה */
export type WebhookPayload = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
} & Tracking & { eventId: string; pageUrl: string };

/**
 * הגנה מהזרקת נוסחה לגיליון (Google Sheets, Excel, ייצוא CSV):
 * ערך שמתחיל ב-= + - @ או טאב מקבל גרש ' בהתחלה, כדי שיוצג כטקסט ולא ירוץ כנוסחה.
 */
export function neutralizeFormula(v: string): string {
  return /^[=+\-@\t]/.test(v) ? `'${v}` : v;
}

/**
 * השדות החופשיים שנוטרלו בוובהוק. לא נוגעים בטלפון (ספרות בלבד), במייל ובמזהים
 * (id, eventId, fbclid, fbp, fbc), כי Make מעביר אותם הלאה כמו שהם.
 */
const FREE_TEXT_TRACKING = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "landingPath",
  "source",
] as const;

export function toWebhookPayload(record: LeadRecord): WebhookPayload {
  const { name, email, phone, marketingConsent } = record.lead;
  const tracking = { ...record.tracking };
  for (const k of FREE_TEXT_TRACKING) tracking[k] = neutralizeFormula(tracking[k]);
  return {
    id: record.id,
    createdAt: record.createdAt,
    name: neutralizeFormula(name),
    email,
    phone,
    marketingConsent,
    ...tracking,
    eventId: record.eventId,
    pageUrl: record.pageUrl,
  };
}
