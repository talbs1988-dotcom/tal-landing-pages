#!/usr/bin/env node
/**
 * שליחה מחדש של לידים מהגיבוי לוובהוק (Make).
 *
 * מתי: הוובהוק נכשל (Make כבוי, תרחיש נמחק, כתובת שגויה), והליד נשמר רק בגיבוי.
 * ההסבר המלא ב-TEMPLATE.md, בסעיף "ליד שלא הגיע ל-Make".
 *
 *   npm run resend-leads -- <תיקייה או קובץ>... <WEBHOOK_URL> [--dry-run]
 *
 * - קורא קבצי JSON של לידים (כמו שהורדו מ-Vercel Blob, leads/<תאריך>/<id>.json),
 *   גם מתוך תתי-תיקיות.
 * - שולח כל ליד בדיוק באותו מבנה שהאתר שולח (toWebhookPayload), ב-POST JSON.
 * - --dry-run: רק מראה מה יישלח.
 * - מדפיס מזהה ותוצאה לכל ליד. אף פעם לא שם, מייל או טלפון.
 * - לא קורא קבצי סביבה (.env). את כתובת הוובהוק מעבירים כארגומנט.
 *
 * שולחים רק את הלידים שלא הגיעו, אחרת הם יופיעו פעמיים ב-Make.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const TRACKING_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "fbp",
  "fbc",
  "referrer",
  "landingPath",
];

/**
 * אותו מבנה כמו toWebhookPayload ב-lib/lead.ts. בדיקה (tests/resend-leads.test.ts)
 * מוודאת ששתי הפונקציות מחזירות בדיוק אותו דבר. משנים אחת ← משנים גם את השנייה.
 */
export function toWebhookPayload(record) {
  const { name, email, phone, marketingConsent } = record.lead;
  const tracking = {};
  for (const k of TRACKING_KEYS) tracking[k] = record.tracking?.[k] ?? "";
  tracking.source = record.tracking?.source ?? "";
  return {
    id: record.id,
    createdAt: record.createdAt,
    name,
    email,
    phone,
    marketingConsent,
    ...tracking,
    eventId: record.eventId,
    pageUrl: record.pageUrl,
  };
}

/** האם זה קובץ ליד מהגיבוי */
function isLeadRecord(r) {
  return (
    r !== null &&
    typeof r === "object" &&
    typeof r.id === "string" &&
    typeof r.createdAt === "string" &&
    typeof r.eventId === "string" &&
    r.lead !== null &&
    typeof r.lead === "object" &&
    typeof r.lead.email === "string" &&
    typeof r.lead.name === "string"
  );
}

/** כל קבצי ה-JSON בנתיב (קובץ או תיקייה, כולל תתי-תיקיות), בסדר קבוע */
export function findLeadFiles(path) {
  const st = statSync(path);
  if (st.isFile()) return path.endsWith(".json") ? [path] : [];
  const out = [];
  for (const name of readdirSync(path).sort()) {
    if (name.startsWith(".")) continue;
    out.push(...findLeadFiles(join(path, name)));
  }
  return out;
}

async function post(fetchFn, url, body) {
  // ניסיון חוזר אחד על שגיאת רשת או 5xx, כמו באתר
  let status;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetchFn(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      status = res.status;
      await res.body?.cancel().catch(() => {});
      if (res.ok) return { ok: true, status };
      if (status < 500) return { ok: false, status };
    } catch {
      status = undefined;
    }
  }
  return { ok: false, status };
}

/**
 * @param {{ paths: string[], url: string, fetch?: typeof fetch, dryRun?: boolean, log?: (line: string) => void }} opts
 */
export async function resendLeads(opts) {
  const log = opts.log ?? ((l) => console.log(l));
  const fetchFn = opts.fetch ?? fetch;
  let url;
  try {
    url = new URL(opts.url);
  } catch {
    throw new Error(
      "כתובת הוובהוק לא תקינה. צריך כתובת מלאה, למשל https://hook.eu1.make.com/...",
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error("כתובת הוובהוק חייבת להתחיל ב-https://");

  const result = { sent: 0, failed: 0, skipped: 0, wouldSend: 0 };
  const files = opts.paths.flatMap((p) => findLeadFiles(p));
  for (const file of files) {
    let record;
    try {
      record = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      record = null;
    }
    if (!isLeadRecord(record)) {
      result.skipped++;
      log(`דילוג: ${file} (לא קובץ ליד)`);
      continue;
    }
    if (opts.dryRun) {
      result.wouldSend++;
      log(`יישלח: ${record.id} (${record.createdAt})`);
      continue;
    }
    const r = await post(fetchFn, url.href, toWebhookPayload(record));
    if (r.ok) {
      result.sent++;
      log(`נשלח ✓ ${record.id}`);
    } else {
      result.failed++;
      log(
        `נכשל ✗ ${record.id} (${r.status ? `קוד ${r.status}` : "בלי תשובה"})`,
      );
    }
  }
  return result;
}

async function main(argv) {
  const dryRun = argv.includes("--dry-run");
  const args = argv.filter((a) => a !== "--dry-run");
  if (args.length < 2) {
    console.log(
      "שימוש: npm run resend-leads -- <תיקייה או קובץ>... <WEBHOOK_URL> [--dry-run]",
    );
    process.exit(1);
  }
  const url = args[args.length - 1];
  const paths = args.slice(0, -1);
  try {
    const r = await resendLeads({ paths, url, dryRun });
    console.log(
      dryRun
        ? `\n${r.wouldSend} לידים יישלחו, ${r.skipped} קבצים דולגו (לא נשלח כלום)`
        : `\nנשלחו ${r.sent}, נכשלו ${r.failed}, דולגו ${r.skipped}`,
    );
    process.exit(r.failed > 0 ? 1 : 0);
  } catch (e) {
    console.log(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main(process.argv.slice(2));
}
