#!/usr/bin/env node
/**
 * שליחה מחדש של לידים מהגיבוי לוובהוק (Make).
 *
 * מתי: הוובהוק נכשל (Make כבוי, תרחיש נמחק, כתובת שגויה), והליד נשמר רק בגיבוי.
 * ההסבר המלא ב-TEMPLATE.md, בסעיף "ליד שלא הגיע ל-Make".
 *
 *   npm run resend-leads -- <תיקייה או קובץ>... [--dry-run]
 *
 * בעל העסק מריץ את זה בטרמינל שלו, לא קלוד. כתובת הוובהוק היא סוד: הסקריפט שואל אותה
 * ומקבל אותה בהדבקה, בלי שתופיע על המסך, בשורת הפקודה או בהיסטוריה של הטרמינל.
 *
 * - קורא קבצי JSON של לידים (כמו שהורדו מ-Vercel Blob, leads/<תאריך>/<id>.json),
 *   גם מתוך תתי-תיקיות.
 * - שולח כל ליד בדיוק באותו מבנה שהאתר שולח (toWebhookPayload), ב-POST JSON.
 * - --dry-run: רק מראה מה יישלח.
 * - מדפיס מזהה ותוצאה לכל ליד. אף פעם לא שם, מייל או טלפון.
 * - לא קורא קבצי סביבה (.env). כתובת שהועברה כארגומנט נדחית, כדי שלא תישמר בהיסטוריה.
 * - אחרי שהכול נשלח: למחוק את התיקייה שהורדה. יש בה שמות, מיילים וטלפונים של לקוחות.
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

/** כמו neutralizeFormula ב-lib/lead.ts: גרש לפני ערך שמתחיל ב-= + - @ או טאב */
function neutralizeFormula(v) {
  return typeof v === "string" && /^[=+\-@\t]/.test(v) ? `'${v}` : v;
}

const FREE_TEXT_TRACKING = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "landingPath",
  "source",
];

/**
 * אותו מבנה כמו toWebhookPayload ב-lib/lead.ts (כולל הגנה מהזרקת נוסחה). בדיקה (tests/resend-leads.test.ts)
 * מוודאת ששתי הפונקציות מחזירות בדיוק אותו דבר. משנים אחת ← משנים גם את השנייה.
 */
export function toWebhookPayload(record) {
  const { name, email, phone, marketingConsent } = record.lead;
  const tracking = {};
  for (const k of TRACKING_KEYS) tracking[k] = record.tracking?.[k] ?? "";
  tracking.source = record.tracking?.source ?? "";
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

/** כתובת שנראית כמו וובהוק בתוך הארגומנטים (http/https, או hook.) */
const LOOKS_LIKE_URL = /^(https?:\/\/|hook\.|[\w-]+\.make\.com)/i;

/**
 * הארגומנטים: רק נתיבים ו---dry-run. כתובת בשורת הפקודה ← שגיאה (urlInArgs),
 * כי היא נשמרת בהיסטוריה של הטרמינל.
 * @param {string[]} argv
 */
export function parseResendArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const rest = argv.filter((a) => a !== "--dry-run");
  const urlInArgs = rest.some((a) => LOOKS_LIKE_URL.test(a));
  return { dryRun, urlInArgs, paths: rest.filter((a) => !LOOKS_LIKE_URL.test(a)) };
}

/** קורא שורה אחת מהמקלדת בלי להציג אותה (או מ-stdin, כשהוא לא טרמינל) */
function readHiddenLine(prompt) {
  return new Promise((resolve) => {
    const input = process.stdin;
    process.stdout.write(prompt);
    if (!input.isTTY) {
      let buf = "";
      input.setEncoding("utf8");
      input.on("data", (c) => (buf += c));
      input.on("end", () => resolve(buf.split(/\r?\n/)[0].trim()));
      return;
    }
    let value = "";
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    const done = () => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      process.stdout.write("\n");
      resolve(value.trim());
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return done();
        if (ch === "\u0003") {
          input.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    input.on("data", onData);
  });
}

async function main(argv) {
  const { dryRun, urlInArgs, paths } = parseResendArgs(argv);
  if (urlInArgs) {
    console.log(
      "לא כותבים את כתובת הוובהוק בשורת הפקודה (היא נשמרת בהיסטוריה של הטרמינל).\n" +
        "מריצים בלי הכתובת, והסקריפט ישאל אותה: npm run resend-leads -- <תיקייה>",
    );
    process.exit(1);
  }
  if (paths.length < 1) {
    console.log("שימוש: npm run resend-leads -- <תיקייה או קובץ>... [--dry-run]");
    process.exit(1);
  }
  const url = dryRun
    ? "https://dry-run.invalid/"
    : await readHiddenLine(
        "הדביקו את כתובת הוובהוק מ-Make ולחצו Enter (לא יופיע כלום על המסך, וזה תקין): ",
      );
  try {
    const r = await resendLeads({ paths, url, dryRun });
    console.log(
      dryRun
        ? `\n${r.wouldSend} לידים יישלחו, ${r.skipped} קבצים דולגו (לא נשלח כלום)`
        : `\nנשלחו ${r.sent}, נכשלו ${r.failed}, דולגו ${r.skipped}` +
            (r.failed === 0
              ? "\nעכשיו מוחקים את התיקייה שהורדה: יש בה פרטים של לקוחות."
              : ""),
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
