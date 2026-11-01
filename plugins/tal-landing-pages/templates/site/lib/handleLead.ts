import { buildCapiEvent, type CapiPayload } from "@/lib/capi";
import {
  buildLeadRecord,
  toWebhookPayload,
  validateLead,
  type FormFields,
  type LeadRecord,
  type WebhookPayload,
} from "@/lib/lead";
import { pickTracking } from "@/lib/utm";

/** משתני הסביבה שהקליטה קוראת. מגיעים מ-process.env */
export type LeadEnv = {
  WEBHOOK_URL?: string;
  BLOB_READ_WRITE_TOKEN?: string;
  /** מתווסף אוטומטית כשמחברים Blob store לפרויקט ב-Vercel (הזדהות OIDC) */
  BLOB_STORE_ID?: string;
  META_PIXEL_ID?: string;
  META_CAPI_TOKEN?: string;
  /** קוד בדיקה מ-Events Manager. רק לבדיקות, להסיר אחרי שלב 7 */
  META_CAPI_TEST_CODE?: string;
  /**
   * כתובת (רשות) שמקבלת התראה כשהוובהוק נכשל: מזהה הליד, התוצאה וקוד השגיאה בלבד.
   * למשל תרחיש Make נפרד ששולח מייל לבעל העסק.
   */
  ALERT_WEBHOOK_URL?: string;
  /** ב-Vercel: "production" או "preview" (ו-"development" ב-vercel dev במחשב) */
  VERCEL_ENV?: string;
};

/** ההתראה שנשלחת ל-ALERT_WEBHOOK_URL. בלי שום פרט אישי */
export type AlertPayload = {
  event: "lead_webhook_failed";
  id: string;
  createdAt: string;
  /** saved = הליד נשמר בגיבוי בלבד. failed = לא נשמר בכלל, והגולש קיבל שגיאה */
  result: "saved" | "failed";
  backup: StepResult;
  /** קוד ה-HTTP שהוובהוק החזיר. חסר כשלא הייתה תשובה (רשת, timeout) */
  webhookStatus?: number;
  /** הסבר קצר בעברית, למייל או להודעה */
  message: string;
};

/**
 * רישום ללוג. רק מזהים ותוצאות: אף פעם לא שם, מייל, טלפון, IP או טקסט של שגיאה.
 */
export type LogEntry = {
  event: string;
  result: string;
  id?: string;
  backup?: StepResult;
  webhook?: StepResult;
  capi?: StepResult;
  fields?: string[];
  status?: number;
};

export type StepResult = "ok" | "failed" | "off" | "deferred";

export type HandleLeadDeps = {
  env: LeadEnv;
  /** השדות בטופס: site.form (email ו-phone) */
  form: FormFields;
  backup: (record: LeadRecord) => Promise<void>;
  postWebhook: (
    url: string,
    payload: WebhookPayload,
  ) => Promise<{ ok: boolean; status?: number }>;
  postCapi: (payload: CapiPayload) => Promise<{ ok: boolean; status?: number }>;
  /** שליחת ההתראה ל-ALERT_WEBHOOK_URL. בלי זה (או בלי הכתובת) אין התראה */
  postAlert?: (
    url: string,
    payload: AlertPayload,
  ) => Promise<{ ok: boolean; status?: number }>;
  now: () => Date;
  log: (entry: LogEntry) => void;
};

export type LeadContext = {
  /** נשלח למטא בלבד. לא נשמר ולא נרשם */
  clientIp?: string;
  userAgent?: string;
  /** כתובת האתר, לבניית pageUrl */
  baseUrl: URL;
};

export type HandleLeadResult = {
  status: number;
  json: Record<string, unknown>;
  /**
   * עבודה שרצה אחרי שהתשובה נשלחה (דיווח CAPI, התראה על וובהוק שנכשל).
   * ה-route מעביר אותה ל-after(). לא זורקת.
   * רושמת ללוג { event: "lead_capi" | "lead_alert", id, result }.
   */
  deferred?: () => Promise<void>;
};

/** הודעה כללית ללקוח. אף פעם לא חושפים את השגיאה הפנימית */
export const SERVER_ERROR = "לא הצלחנו לשמור את הפרטים. נא לנסות שוב בעוד רגע.";

const filled = (v: string | undefined): v is string =>
  typeof v === "string" && v.trim() !== "";

/**
 * קליטת ליד: ולידציה ← ספאם ← גיבוי ← וובהוק ← CAPI.
 * CAPI נשלח רק כשהליד סימן את תיבת הדיוור וגם אישר עוגיות שיווק בדפדפן
 * (cookieMarketing: true בגוף הבקשה).
 * הצלחה אם הגיבוי או הוובהוק הצליחו. CAPI לא משפיע על התוצאה,
 * ורץ רק אחרי התשובה (deferred), כדי שהגולש לא יחכה למטא.
 */
export async function handleLead(
  body: unknown,
  deps: HandleLeadDeps,
  ctx: LeadContext,
): Promise<HandleLeadResult> {
  const { env, log } = deps;

  const v = validateLead(body, deps.form);
  if (!v.ok) {
    if ("spam" in v) {
      log({ event: "lead", result: "spam" });
      return { status: 200, json: { ok: true } };
    }
    log({ event: "lead", result: "invalid", fields: Object.keys(v.errors) });
    return { status: 400, json: { ok: false, errors: v.errors } };
  }

  const data = body as Record<string, unknown>;
  const record = buildLeadRecord(v.lead, pickTracking(data.tracking), {
    now: deps.now(),
    baseUrl: ctx.baseUrl,
    eventId: data.eventId,
    userAgent: ctx.userAgent,
  });
  const id = record.id;

  const backupOn =
    filled(env.BLOB_READ_WRITE_TOKEN) || filled(env.BLOB_STORE_ID);
  const webhookOn = filled(env.WEBHOOK_URL);

  if (!backupOn && !webhookOn) {
    // ב-Vercel (production או preview) זו תקלת הגדרה: הליד היה הולך לאיבוד.
    // לא מעמידים פנים שהצליח. מצב dev רק במחשב (כולל vercel dev)
    if (filled(env.VERCEL_ENV) && env.VERCEL_ENV !== "development") {
      log({ event: "lead", id, result: "not_configured" });
      return { status: 500, json: { ok: false, error: SERVER_ERROR } };
    }
    log({ event: "lead", id, result: "dev" });
    return {
      status: 200,
      json: { ok: true, id, eventId: record.eventId, mode: "dev" },
    };
  }

  let backup: StepResult = "off";
  if (backupOn) {
    try {
      await deps.backup(record);
      backup = "ok";
    } catch {
      backup = "failed";
    }
  }

  let webhook: StepResult = "off";
  let webhookStatus: number | undefined;
  if (webhookOn) {
    try {
      const r = await deps.postWebhook(
        env.WEBHOOK_URL as string,
        toWebhookPayload(record),
      );
      webhook = r.ok ? "ok" : "failed";
      if (typeof r.status === "number") webhookStatus = r.status;
    } catch {
      webhook = "failed";
    }
  }

  const saved = backup === "ok" || webhook === "ok";
  const alert = webhook === "failed" ? alertTask(record, saved, backup, webhookStatus, deps) : undefined;

  if (!saved) {
    log({ event: "lead", id, result: "failed", backup, webhook, capi: "off" });
    return {
      status: 500,
      json: { ok: false, error: SERVER_ERROR },
      ...(alert && { deferred: alert }),
    };
  }

  // CAPI רק כשיש שתי הסכמות: תיבת הדיוור בטופס, וגם עוגיות שיווק בבאנר (נשלח מהדפדפן)
  const capiOn =
    v.lead.marketingConsent &&
    data.cookieMarketing === true &&
    filled(env.META_PIXEL_ID) &&
    filled(env.META_CAPI_TOKEN);

  log({
    event: "lead",
    id,
    result: "saved",
    backup,
    webhook,
    capi: capiOn ? "deferred" : "off",
  });
  const json = { ok: true, id, eventId: record.eventId };
  if (!capiOn) return { status: 200, json, ...(alert && { deferred: alert }) };

  const capi = async () => {
    let result: StepResult;
    try {
      const payload = buildCapiEvent(record, {
        sourceUrl: record.pageUrl,
        clientIp: ctx.clientIp,
        testEventCode: filled(env.META_CAPI_TEST_CODE)
          ? env.META_CAPI_TEST_CODE
          : undefined,
      });
      const r = await deps.postCapi(payload);
      result = r.ok ? "ok" : "failed";
    } catch {
      result = "failed";
    }
    log({ event: "lead_capi", id, result });
  };
  const deferred = alert
    ? async () => {
        await Promise.all([alert(), capi()]);
      }
    : capi;
  return { status: 200, json, deferred };
}

/**
 * התראה על וובהוק שנכשל, אם ALERT_WEBHOOK_URL מוגדר. רצה אחרי התשובה. לא זורקת.
 * בלי שם, מייל, טלפון או IP: רק מזהה, זמן, התוצאה וקוד השגיאה.
 */
function alertTask(
  record: LeadRecord,
  saved: boolean,
  backup: StepResult,
  webhookStatus: number | undefined,
  deps: HandleLeadDeps,
): (() => Promise<void>) | undefined {
  const url = deps.env.ALERT_WEBHOOK_URL;
  const post = deps.postAlert;
  if (!filled(url) || !post) return undefined;
  const code = webhookStatus === undefined ? "בלי תשובה" : `קוד ${webhookStatus}`;
  const payload: AlertPayload = {
    event: "lead_webhook_failed",
    id: record.id,
    createdAt: record.createdAt,
    result: saved ? "saved" : "failed",
    backup,
    ...(webhookStatus !== undefined && { webhookStatus }),
    message: saved
      ? `ליד ${record.id} לא הגיע ל-Make (${code}). הוא שמור בגיבוי ב-Vercel Blob, תחת leads/. איך שולחים אותו מחדש: TEMPLATE.md, "ליד שלא הגיע ל-Make".`
      : `ליד ${record.id} לא נשמר בכלל: הוובהוק נכשל (${code}), ${backup === "off" ? "ואין גיבוי מוגדר" : "וגם הגיבוי נכשל"}. הגולש קיבל הודעת שגיאה ויכול לנסות שוב.`,
  };
  return async () => {
    let result: StepResult;
    try {
      const r = await post(url, payload);
      result = r.ok ? "ok" : "failed";
    } catch {
      result = "failed";
    }
    deps.log({ event: "lead_alert", id: record.id, result });
  };
}
