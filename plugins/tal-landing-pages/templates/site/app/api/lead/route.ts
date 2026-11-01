import { put } from "@vercel/blob";
import { after } from "next/server";
import { site } from "@/site.config";
import { createBlobBackup } from "@/lib/backup";
import { sendCapi } from "@/lib/capi";
import { handleLead, type LeadEnv, type LogEntry } from "@/lib/handleLead";
import { createRateLimiter } from "@/lib/rateLimit";
import { readBodyLimited } from "@/lib/readBody";
import { isAllowedOrigin } from "@/lib/origin";
import { isFilled } from "@/lib/todo";
import { siteUrl } from "@/lib/siteUrl";
import { postWebhook } from "@/lib/webhook";

/*
 * נקודת הקליטה של הטופס: POST /api/lead
 * כל הלוגיקה ב-lib/handleLead.ts. כאן רק מחברים אותה לבקשה ולשירותים האמיתיים.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10 * 1024;

// לכל מופע של השרת יש זיכרון משלו. הגנה בסיסית, לא מושלמת
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

const MSG = {
  rate: "נשלחו יותר מדי ניסיונות. נא לנסות שוב בעוד דקה.",
  tooLarge: "הפרטים שנשלחו ארוכים מדי.",
  badRequest: "הפרטים לא נשלחו כמו שצריך. נא לרענן את הדף ולנסות שוב.",
  forbidden: "לא ניתן לשלוח את הטופס מהכתובת הזו.",
} as const;

function reply(status: number, json: Record<string, unknown>) {
  return Response.json(json, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** הכתובת של הגולש: הראשונה ב-x-forwarded-for, אחרת x-real-ip. לא נשמרת ולא נרשמת */
function clientIp(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 64 ? ip : undefined;
}

/** רישום ללוג: רק אובייקטים של מזהה ותוצאה (ראו LogEntry) */
function log(entry: LogEntry) {
  console.log(JSON.stringify(entry));
}

function env(): LeadEnv {
  const e = process.env;
  return {
    WEBHOOK_URL: e.WEBHOOK_URL,
    BLOB_READ_WRITE_TOKEN: e.BLOB_READ_WRITE_TOKEN,
    BLOB_STORE_ID: e.BLOB_STORE_ID,
    META_PIXEL_ID: e.META_PIXEL_ID,
    META_CAPI_TOKEN: e.META_CAPI_TOKEN,
    META_CAPI_TEST_CODE: e.META_CAPI_TEST_CODE,
    ALERT_WEBHOOK_URL: e.ALERT_WEBHOOK_URL,
    VERCEL_ENV: e.VERCEL_ENV,
  };
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  // שליחה מאתר אחר נחסמת. בלי כותרת Origin מאשרים (יש לקוחות שלא שולחים אותה)
  if (
    !isAllowedOrigin({
      origin: request.headers.get("origin"),
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      siteUrl: site.page.url,
    })
  ) {
    log({ event: "lead", result: "bad_origin" });
    return reply(403, { ok: false, error: MSG.forbidden });
  }

  if (!limiter.check(ip ?? "unknown")) {
    log({ event: "lead", result: "rate_limited" });
    return reply(429, { ok: false, error: MSG.rate });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    log({ event: "lead", result: "bad_content_type" });
    return reply(415, { ok: false, error: MSG.badRequest });
  }

  const body = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!body.ok) {
    log({ event: "lead", result: "too_large" });
    return reply(413, { ok: false, error: MSG.tooLarge });
  }

  let data: unknown;
  try {
    data = JSON.parse(body.text);
  } catch {
    log({ event: "lead", result: "bad_json" });
    return reply(400, { ok: false, error: MSG.badRequest });
  }

  const e = env();
  const baseUrl = isFilled(site.page.url)
    ? siteUrl(site.page.url)
    : new URL(new URL(request.url).origin);

  const result = await handleLead(
    data,
    {
      env: e,
      form: site.form,
      backup: createBlobBackup(put),
      postWebhook: (url, payload) => postWebhook(url, payload),
      // התראה: ניסיון אחד בלבד, היא רצה אחרי התשובה ולא מעכבת אף אחד
      postAlert: (url, payload) => postWebhook(url, payload, { retries: 0 }),
      postCapi: (payload) =>
        sendCapi(payload, {
          pixelId: e.META_PIXEL_ID ?? "",
          token: e.META_CAPI_TOKEN ?? "",
        }),
      now: () => new Date(),
      log,
    },
    {
      clientIp: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      baseUrl,
    },
  );

  // דיווח ההמרה למטא והתראה על וובהוק שנכשל רצים אחרי שהתשובה נשלחה, כדי שהגולש לא יחכה
  if (result.deferred) after(result.deferred);

  return reply(result.status, result.json);
}
