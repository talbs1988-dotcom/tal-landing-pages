/**
 * הלוגיקה של מצב העריכה (POST /api/dev-edit). עובד רק ב-`npm run dev`.
 *
 * הדפדפן שולח `{ key, value }`, ואנחנו מחליפים ערך אחד ב-content/copy.json:
 * - המפתח חייב להיות קיים בקובץ (לא מוסיפים מפתחות מהדפדפן).
 * - הערך מחרוזת עד MAX_EDIT_LENGTH תווים, ומנוקה ב-cleanText (בלי תווים בלתי נראים ותווי שליטה).
 *   ערך ריק נשמר כסימון TODO, כדי ש-check:todo יספור אותו.
 * - סדר המפתחות נשמר, והקובץ נכתב עם 2 רווחים ושורה ריקה בסוף.
 * - בקשה מקבלים רק מאותו מקור, ורק מהמחשב המקומי (localhost).
 *
 * הקריאה והכתיבה של הקובץ מגיעות מבחוץ (deps), כדי שאפשר לבדוק בלי דיסק.
 */
import { readBodyLimited } from "@/lib/readBody";
import { cleanText } from "@/lib/text";
import { TODO } from "@/lib/todo";

export const MAX_EDIT_LENGTH = 2000;
const MAX_BODY_BYTES = 16 * 1024;

export const DEV_EDIT_MSG = {
  badRequest: "השמירה לא נשלחה כמו שצריך. נא לרענן את הדף ולנסות שוב.",
  unknownKey: "הטקסט הזה לא מחובר לקובץ הקופי (המפתח לא קיים ב-copy.json).",
  tooLong: `הטקסט ארוך מדי. אפשר עד ${MAX_EDIT_LENGTH} תווים.`,
  tooLarge: "הבקשה גדולה מדי.",
  forbidden: "אפשר לשמור רק מהדף שפתוח במחשב הזה.",
  contentType: "השמירה לא נשלחה כמו שצריך (סוג תוכן).",
  badFile:
    "הקובץ content/copy.json לא תקין, ולכן לא שמרנו. צריך לתקן אותו קודם.",
  writeFailed: "לא הצלחנו לשמור לקובץ. נא לנסות שוב.",
} as const;

export type EditOutcome =
  | { ok: true; key: string; value: string; content: string }
  | { ok: false; status: number; error: string };

/** copy.json תקין: אובייקט שכל הערכים בו מחרוזות */
function parseCopyFile(text: string): Record<string, string> | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  for (const v of Object.values(data)) if (typeof v !== "string") return null;
  return data as Record<string, string>;
}

/**
 * מחשב את התוכן החדש של copy.json אחרי עריכה אחת. טהורה: בלי קבצים ובלי רשת.
 */
export function applyEdit(fileText: string, body: unknown): EditOutcome {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false, status: 400, error: DEV_EDIT_MSG.badRequest };
  const { key, value } = body as Record<string, unknown>;
  if (typeof key !== "string" || typeof value !== "string")
    return { ok: false, status: 400, error: DEV_EDIT_MSG.badRequest };

  const file = parseCopyFile(fileText);
  if (!file) return { ok: false, status: 500, error: DEV_EDIT_MSG.badFile };
  if (!Object.hasOwn(file, key))
    return { ok: false, status: 422, error: DEV_EDIT_MSG.unknownKey };
  if (value.length > MAX_EDIT_LENGTH)
    return { ok: false, status: 422, error: DEV_EDIT_MSG.tooLong };

  const cleaned = cleanText(value);
  const stored = cleaned === "" ? TODO : cleaned;
  // fromEntries ולא השמה, כדי שמפתח כמו __proto__ לא יגיע ל-prototype. הסדר נשמר
  const next = Object.fromEntries(
    Object.entries(file).map(([k, v]) => [k, k === key ? stored : v]),
  );
  return {
    ok: true,
    key,
    value: stored,
    content: JSON.stringify(next, null, 2) + "\n",
  };
}

/** האם ה-host הוא המחשב המקומי: localhost, 127.0.0.1, [::1] או *.localhost */
export function isLoopbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

export type RequestCheck =
  { ok: true } | { ok: false; status: number; error: string };

/**
 * רק מאותו מקור: חייבת להיות כותרת Origin, ה-host שלה זהה ל-host של הבקשה,
 * וה-host הוא המחשב המקומי (הגנה מאתר זר שמפנה את שם הדומיין שלו ל-127.0.0.1).
 */
export function checkDevEditRequest(h: {
  origin: string | null | undefined;
  host: string | null | undefined;
  secFetchSite: string | null | undefined;
  contentType: string | null | undefined;
}): RequestCheck {
  const forbidden = {
    ok: false as const,
    status: 403,
    error: DEV_EDIT_MSG.forbidden,
  };
  if (!h.origin || !h.host) return forbidden;
  let originHost: string;
  try {
    const u = new URL(h.origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return forbidden;
    originHost = u.host.toLowerCase();
  } catch {
    return forbidden;
  }
  if (originHost !== h.host.trim().toLowerCase()) return forbidden;
  if (!isLoopbackHost(h.host)) return forbidden;
  if (h.secFetchSite && h.secFetchSite !== "same-origin") return forbidden;
  if (!(h.contentType ?? "").toLowerCase().includes("application/json"))
    return { ok: false, status: 415, error: DEV_EDIT_MSG.contentType };
  return { ok: true };
}

export type DevEditDeps = {
  /** process.env.NODE_ENV. כל ערך חוץ מ-"development" מחזיר 404 */
  nodeEnv: string | undefined;
  readCopy: () => Promise<string>;
  writeCopy: (content: string) => Promise<void>;
};

const noStore = { "cache-control": "no-store" };

function reply(status: number, json: Record<string, unknown>) {
  return Response.json(json, { status, headers: noStore });
}

/**
 * מצב העריכה כבוי במפורש: `npm run dev:phone` (צפייה מהטלפון) מריץ את השרת פתוח לרשת,
 * ואז אסור שמישהו אחר באותה רשת יוכל לכתוב ל-copy.json. השרת מקבל DEV_EDIT=off.
 * הגנה שאי אפשר לזייף מבחוץ, כי היא לא תלויה בכותרות של הבקשה.
 */
export function devEditDisabled(devEditFlag: string | undefined): boolean {
  return (devEditFlag ?? "").trim().toLowerCase() === "off";
}

export function devEditNotFound() {
  return new Response("Not Found", { status: 404, headers: noStore });
}

export async function handleDevEdit(
  request: Request,
  deps: DevEditDeps,
): Promise<Response> {
  if (deps.nodeEnv !== "development") return devEditNotFound();

  const check = checkDevEditRequest({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    contentType: request.headers.get("content-type"),
  });
  if (!check.ok) return reply(check.status, { ok: false, error: check.error });

  const body = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!body.ok) return reply(413, { ok: false, error: DEV_EDIT_MSG.tooLarge });

  let data: unknown;
  try {
    data = JSON.parse(body.text);
  } catch {
    return reply(400, { ok: false, error: DEV_EDIT_MSG.badRequest });
  }

  let current: string;
  try {
    current = await deps.readCopy();
  } catch {
    return reply(500, { ok: false, error: DEV_EDIT_MSG.badFile });
  }

  const result = applyEdit(current, data);
  if (!result.ok)
    return reply(result.status, { ok: false, error: result.error });

  try {
    await deps.writeCopy(result.content);
  } catch {
    return reply(500, { ok: false, error: DEV_EDIT_MSG.writeFailed });
  }
  return reply(200, { ok: true, key: result.key, value: result.value });
}
