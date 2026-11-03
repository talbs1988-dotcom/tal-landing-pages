#!/usr/bin/env node
/**
 * שומר הסודות: שום קוד סודי ושום קובץ סביבה לא נכנס ל-git, ולכן גם לא ל-GitHub.
 * רץ לבד לפני כל שמירה (pre-commit) ולפני כל העלאה (pre-push), דרך .githooks.
 * לא תלוי בזיכרון של אף אחד: אם יש בעיה, השמירה או ההעלאה נחסמות.
 *
 * מה נחסם:
 *  1. קבצים לפי השם: .env וכל .env.* (חוץ מ-.env.example), התיקייה .vercel,
 *     מפתחות (.pem, .key, .p12, id_rsa), ותיקיות של גיבוי לידים שהורדו (leads, leads-*),
 *     כי יש בהן פרטים של לקוחות.
 *  2. תוכן שנראה כמו קוד סודי: כתובת וובהוק של Make, טוקן של מטא, טוקן של GitHub,
 *     טוקן של אחסון Vercel, מפתח פרטי, ומפתחות API נפוצים.
 *  3. שורה שנותנת ערך אמיתי לאחד המשתנים הסודיים של האתר (WEBHOOK_URL וכו').
 *     שם בלי ערך, או ערך לדוגמה כמו <...>, מותר (ככה כתובים TEMPLATE.md ו-.env.example).
 *
 * הלוגיקה (findSecrets) טהורה, בלי git ובלי הדפסה, כדי שהבדיקות ישתמשו בה.
 * ההודעות לא מדפיסות את הסוד עצמו, רק איפה הוא.
 *
 * שימוש:
 *   node scripts/secret-guard.mjs staged   מה שעומד להישמר (pre-commit)
 *   node scripts/secret-guard.mjs push     כל גרסה שעולה (pre-push, הענפים מגיעים מ-git). בלי קלט: הגרסה האחרונה
 *   node scripts/secret-guard.mjs all      כל הקבצים בגרסה האחרונה, לבדיקה ידנית (npm run guard)
 *   node scripts/secret-guard.mjs install  מחבר את .githooks לתיקייה. בלי git: לא עושה כלום
 */
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// המשתנים הסודיים של האתר (TEMPLATE.md, "משתני סביבה")
export const SECRET_NAMES = [
  "WEBHOOK_URL",
  "ALERT_WEBHOOK_URL",
  "META_CAPI_TOKEN",
  "META_CAPI_TEST_CODE",
  "BLOB_READ_WRITE_TOKEN",
  "VERCEL_TOKEN",
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "VERCEL_OIDC_TOKEN",
];

const CONTENT_RULES = [
  {
    re: /hook\.[a-z0-9]+\.(?:make\.com|make\.celonis\.com|integromat\.com)\/[A-Za-z0-9]{10,}/i,
    what: "כתובת וובהוק של Make",
  },
  { re: /hooks\.slack\.com\/services\/[A-Za-z0-9/]{20,}/, what: "כתובת וובהוק של Slack" },
  { re: /hooks\.zapier\.com\/hooks\/catch\/\d+\/[A-Za-z0-9]+/, what: "כתובת וובהוק של Zapier" },
  { re: /\bnpm_[A-Za-z0-9]{36}\b/, what: "טוקן של npm" },
  {
    re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    what: "טוקן גישה (JWT)",
  },
  { re: /\bEAA[A-Za-z0-9]{30,}/, what: "טוקן של מטא" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{30,}/, what: "טוקן של GitHub" },
  { re: /\bgithub_pat_[A-Za-z0-9_]{30,}/, what: "טוקן של GitHub" },
  { re: /\bvercel_blob_rw_[A-Za-z0-9_]{10,}/, what: "טוקן של אחסון Vercel" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, what: "מפתח פרטי" },
  { re: /\bsk-ant-[A-Za-z0-9_-]{20,}/, what: "מפתח API של Anthropic" },
  { re: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}/, what: "מפתח API של OpenAI" },
  { re: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/, what: "מפתח של Stripe" },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/, what: "מפתח API של גוגל" },
  { re: /\bAKIA[0-9A-Z]{16}\b/, what: "מפתח של AWS" },
];

// NAME=value / NAME: "value" / NAME = 'value'. הערך נבדק בנפרד (looksReal)
const ASSIGN_RE = new RegExp(
  `\\b(${SECRET_NAMES.join("|")})\\b["']?\\s*[=:]\\s*["'\`]?([^\\s"'\`,;)]*)`,
);

/** ערך אמיתי, לא דוגמה: ארוך מספיק, ובלי < > ... או מילים של דוגמה */
function looksReal(value) {
  if (!value || value.length < 12) return false;
  if (/[<>{}$]|\.\.\.|example|xxx|your[-_]|placeholder/i.test(value))
    return false;
  // כתובת מקומית לבדיקה במחשב (קולט הלידים של /page-check), לא סוד
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(value)) return false;
  // קוד שקורא את המשתנה (e.WEBHOOK_URL, process.env.X), לא ערך
  if (/^[A-Za-z_]\w*(\.\w+)+$/.test(value) && !value.includes("://")) return false;
  return /^[A-Za-z0-9_\-:/.?=&%+]+$/.test(value);
}

/** האם קובץ חסום לפי השם/הנתיב שלו. מחזיר את הסיבה, או null */
export function blockedPath(path) {
  const parts = path.split("/");
  const name = parts[parts.length - 1];
  if (
    name === ".env" ||
    name === ".envrc" ||
    name === "env.local" ||
    (name.startsWith(".env.") && name !== ".env.example")
  )
    return "קובץ סביבה, יכולים להיות בו סודות";
  if (parts.includes(".vercel")) return "התיקייה .vercel שייכת רק למחשב הזה";
  if (
    /\.(pem|key|p12|pfx)$/i.test(name) ||
    /^id_(rsa|ed25519|ecdsa)/.test(name)
  )
    return "קובץ מפתח";
  if (parts.slice(0, -1).some((p) => p === "leads" || p.startsWith("leads-")))
    return "נראה כמו גיבוי לידים, עם פרטים של לקוחות";
  if (/^leads.*\.(csv|json|xlsx?)$/i.test(name))
    return "נראה כמו ייצוא לידים, עם פרטים של לקוחות";
  return null;
}

/**
 * @param {{ path: string, text: string | null }[]} files  text = null לקובץ בינארי
 * @returns {{ path: string, line?: number, what: string }[]}
 */
export function findSecrets(files) {
  const out = [];
  for (const { path, text } of files) {
    const why = blockedPath(path);
    if (why) {
      out.push({ path, what: why });
      continue;
    }
    if (text == null) continue;
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      for (const r of CONTENT_RULES)
        if (r.re.test(line)) out.push({ path, line: i + 1, what: r.what });
      const m = ASSIGN_RE.exec(line);
      if (m && looksReal(m[2]))
        out.push({ path, line: i + 1, what: `ערך אמיתי ל-${m[1]}` });
    });
  }
  return out;
}

// ---------- מכאן: git ---------- //

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function git(args, opts = {}) {
  return execFileSync("git", args, {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}

/** תוכן של קובץ מתוך git (שמור או בגרסה), או null לבינארי */
// קובץ גדול (וידאו, תמונה כבדה) נבדק רק לפי השם
const MAX_SCAN = 5 * 1024 * 1024;

function blobText(spec) {
  const size = Number(git(["cat-file", "-s", spec]).toString("utf8").trim());
  if (size > MAX_SCAN) return null;
  const buf = git(["show", spec]);
  if (buf.includes(0)) return null;
  return buf.toString("utf8");
}

function listZ(args) {
  return git(args).toString("utf8").split("\0").filter(Boolean);
}

const ZERO = /^0+$/;

/** הגרסאות שעולות: מהשורות ש-git נותן ל-pre-push (local_ref local_sha remote_ref remote_sha) */
function pushedCommits(stdin) {
  const out = new Set();
  for (const line of stdin.split("\n")) {
    const [, local, , remote] = line.trim().split(/\s+/);
    if (!local || ZERO.test(local)) continue; // מחיקת ענף: אין מה לבדוק
    const range = !remote || ZERO.test(remote) ? [local, "--not", "--remotes"] : [`${remote}..${local}`];
    for (const c of git(["rev-list", ...range]).toString("utf8").split("\n").filter(Boolean))
      out.add(c);
  }
  return [...out];
}

function collectPush(stdin) {
  const files = [];
  for (const c of pushedCommits(stdin)) {
    const paths = listZ(["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "--root", "-m", "--diff-filter=ACMR", c]);
    for (const path of paths) files.push({ path: `${path} (בגרסה ${c.slice(0, 7)})`, rel: path, text: blobText(`${c}:${path}`) });
  }
  return files;
}

function collect(mode, stdin = "") {
  if (mode === "push" && stdin.trim()) {
    // השם המקורי לבדיקת הנתיב, והשם עם הגרסה להודעה
    return collectPush(stdin).map((f) => ({ ...f, path: f.rel, shown: f.path }));
  }
  if (mode === "staged") {
    return listZ([
      "diff",
      "--cached",
      "--name-only",
      "--diff-filter=ACMR",
      "-z",
    ]).map((path) => ({ path, text: blobText(`:${path}`) }));
  }
  const hasHead = (() => {
    try {
      git(["rev-parse", "--verify", "HEAD"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();
  if (!hasHead) return [];
  return listZ(["ls-tree", "-r", "--name-only", "-z", "HEAD"]).map((path) => ({
    path,
    text: blobText(`HEAD:${path}`),
  }));
}

function report(problems, mode) {
  const act = mode === "staged" ? "השמירה" : "ההעלאה";
  console.error(`\n🛑 ${act} נחסמה: יש כאן משהו שאסור שיגיע ל-GitHub.\n`);
  for (const p of problems)
    console.error(`  • ${p.path}${p.line ? `:${p.line}` : ""}  ${p.what}`);
  console.error(
    "\nמה עושים: מוציאים את הקוד הסודי מהקובץ (הוא שייך רק ל-Vercel, להגדרות של הפרויקט),",
  );
  console.error(
    "או מוציאים את הקובץ מהתיקייה. אחר כך שומרים שוב. לא עוקפים את הבדיקה הזו.\n",
  );
}

function install() {
  try {
    git(["--version"], { stdio: "ignore" });
    const top = git(["rev-parse", "--show-toplevel"], {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString("utf8")
      .trim();
    // רק כשהאתר עצמו הוא המאגר, לא תיקייה שבתוך מאגר אחר
    if (realpathSync(top) !== realpathSync(resolve(ROOT))) return;
  } catch {
    return; // אין git, או שזו לא תיקיית git (למשל בבנייה ב-Vercel)
  }
  for (const hook of ["pre-commit", "pre-push"]) {
    const p = join(ROOT, ".githooks", hook);
    if (existsSync(p)) chmodSync(p, 0o755);
  }
  git(["config", "core.hooksPath", ".githooks"]);
  console.log("שומר הסודות מחובר ✓");
}

function main(mode) {
  if (mode === "install") return install();
  if (!["staged", "push", "all"].includes(mode)) {
    console.error("שימוש: secret-guard.mjs staged | push | all | install");
    process.exit(2);
  }
  let stdin = "";
  if (mode === "push") {
    try {
      stdin = readFileSync(0, "utf8");
    } catch {
      stdin = "";
    }
  }
  let files;
  try {
    files = collect(mode, stdin);
  } catch {
    console.error("\n🛑 שומר הסודות לא הצליח לבדוק את מה שעולה, ולכן ההעלאה נחסמה.");
    console.error("מה עושים: `git fetch origin`, ומנסים שוב. לא עוקפים את הבדיקה.\n");
    process.exit(1);
  }
  const shown = new Map(files.map((f) => [f.path, f.shown]));
  const problems = findSecrets(files).map((p) => ({ ...p, path: shown.get(p.path) ?? p.path }));
  if (problems.length) {
    report(problems, mode);
    process.exit(1);
  }
  console.log("שומר הסודות: נקי ✓");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv[2]);
}
