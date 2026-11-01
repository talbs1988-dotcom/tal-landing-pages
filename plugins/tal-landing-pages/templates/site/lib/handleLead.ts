import type { PhoneField } from "@/site.config";
import { buildCapiEvent, type CapiPayload } from "@/lib/capi";
import {
  buildLeadRecord,
  toWebhookPayload,
  validateLead,
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
  /** "production" ב-Vercel בסביבת הייצור */
  VERCEL_ENV?: string;
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

type StepResult = "ok" | "failed" | "off" | "deferred";

export type HandleLeadDeps = {
  env: LeadEnv;
  form: { phone: PhoneField };
  backup: (record: LeadRecord) => Promise<void>;
  postWebhook: (
    url: string,
    payload: WebhookPayload,
  ) => Promise<{ ok: boolean; status?: number }>;
  postCapi: (payload: CapiPayload) => Promise<{ ok: boolean; status?: number }>;
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
   * עבודה שרצה אחרי שהתשובה נשלחה (דיווח CAPI). ה-route מעביר אותה ל-after().
   * לא זורקת. רושמת ללוג { event: "lead_capi", id, result }.
   */
  deferred?: () => Promise<void>;
};

/** הודעה כללית ללקוח. אף פעם לא חושפים את השגיאה הפנימית */
export const SERVER_ERROR = "לא הצלחנו לשמור את הפרטים. נא לנסות שוב בעוד רגע.";

const filled = (v: string | undefined): v is string =>
  typeof v === "string" && v.trim() !== "";

/**
 * קליטת ליד: ולידציה ← ספאם ← גיבוי ← וובהוק ← CAPI.
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
    // בייצור ב-Vercel זו תקלת הגדרה: הליד היה הולך לאיבוד. לא מעמידים פנים שהצליח
    if (env.VERCEL_ENV === "production") {
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
  if (webhookOn) {
    try {
      const r = await deps.postWebhook(
        env.WEBHOOK_URL as string,
        toWebhookPayload(record),
      );
      webhook = r.ok ? "ok" : "failed";
    } catch {
      webhook = "failed";
    }
  }

  if (backup !== "ok" && webhook !== "ok") {
    log({ event: "lead", id, result: "failed", backup, webhook, capi: "off" });
    return { status: 500, json: { ok: false, error: SERVER_ERROR } };
  }

  const capiOn =
    v.lead.marketingConsent &&
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
  if (!capiOn) return { status: 200, json };

  const deferred = async () => {
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
  return { status: 200, json, deferred };
}
