#!/usr/bin/env node
/**
 * בדיקות הדף שלא צריכות דפדפן. מדפיס JSON אחד:
 *   { ok, checks: [{ name, ok, required, details, items? }] }
 * ok של בדיקה: true = עבר, false = נכשל, null = לא נבדק (ו-details אומר למה).
 * ok הכללי הוא false אם בדיקת חובה נכשלה. אז גם קוד היציאה 1.
 *
 * שימוש (מתוך תיקיית האתר):
 *   npm run check -- [--copy-scan <הנתיב ל-copy-scan.mjs של הפלאגין>] [--skip build,tests]
 *
 * למה copy-scan מגיע מהפלאגין ולא מועתק לכאן: התבנית מועתקת לכל דף פעם אחת ולא
 * מתעדכנת, והסורק של copy.md שייך לפלאגין (הוא מכיר את הפורמט של copy.md).
 * עותק כאן היה קופא עם הכללים של היום. בלי הנתיב הבדיקה מסומנת "לא נבדק".
 *
 * לא קורא קבצי סביבה (.env). הלוגיקה בפונקציות טהורות, עם בדיקות ב-tests/check-page.test.ts.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, extname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scanForTodos } from "./todo-scan.mjs";

const MARK = "[למלא]";

// ---------- site.config.ts: ערך של שדה בתוך סקשן ----------

/** הערך של section.key ב-`export const site`: מחרוזת, null (TODO), או undefined (לא נמצא) */
export function configValue(text, section, key) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /export\s+const\s+site\b/.test(l));
  if (start === -1) return undefined;
  let current = "";
  for (let i = start + 1; i < lines.length; i++) {
    const open = /^\s{2}(\w+)\s*:\s*\{/.exec(lines[i]);
    if (open) current = open[1];
    if (current !== section) continue;
    const m = new RegExp(
      `^\\s*${key}\\s*:\\s*(TODO\\b|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`,
    ).exec(lines[i]);
    if (!m) continue;
    if (m[1] === "TODO") return null;
    const inner = m[1].slice(1, -1);
    try {
      return m[1][0] === '"' ? JSON.parse(m[1]) : inner.replace(/\\'/g, "'");
    } catch {
      return inner;
    }
  }
  return undefined;
}

/** האם זו כתובת https מלאה ותקינה (אותו כלל כמו ב-todo-scan) */
export function isHttpsUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && /^[^.\s]+(\.[^.\s]+)+$/.test(u.hostname);
  } catch {
    return false;
  }
}

// ---------- 1. [למלא] ----------

const isUrlHit = (h) =>
  h.file === "site.config.ts" && /^url\s*:\s*TODO\b/.test(h.text);

/**
 * check:todo, בלי page.url שעוד לא נקבע: הוא נקבע רק ב-/page-live,
 * ויש לו בדיקה משלו (checkPageUrl).
 */
export function checkTodos(root) {
  const { hits } = scanForTodos(root);
  const rest = hits.filter((h) => !isUrlHit(h));
  const total = rest.reduce((s, h) => s + h.count, 0);
  return {
    name: "check:todo",
    ok: total === 0,
    required: true,
    details:
      total === 0
        ? "אין [למלא] באתר"
        : `נשארו ${total} דברים למלא (בלי page.url, שנבדק בנפרד)`,
    items: rest.map((h) => `${h.file}:${h.line}  ${h.text}`),
  };
}

export function checkPageUrl(configText) {
  const url = configValue(configText, "page", "url");
  const base = { name: "page.url", required: false };
  if (url === undefined)
    return {
      ...base,
      ok: false,
      details: "לא מצאתי את page.url ב-site.config.ts",
    };
  if (url === null || url.includes(MARK))
    return {
      ...base,
      ok: null,
      details:
        "עוד לא נקבעה כתובת לדף. היא נקבעת ב-/page-live, ושם הבדיקה רצה שוב",
    };
  if (!isHttpsUrl(url))
    return {
      ...base,
      required: true,
      ok: false,
      details: `page.url חייב להיות כתובת https מלאה, למשל https://example.co.il (כרגע: "${url}")`,
    };
  return { ...base, ok: true, details: url };
}

// ---------- 2. תמונות ----------

/** התקרות מ-scripts/optimize-images.mjs (KB = 1000 בתים) */
export const IMAGE_CAPS = { hero: 200_000, inline: 100_000 };
const RASTER = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
]);
const OK_EXT = new Set([".webp", ".avif", ".svg"]);

function listFiles(dir) {
  const out = [];
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names.sort()) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listFiles(p));
    else out.push({ path: p, bytes: st.size });
  }
  return out;
}

const kb = (b) => `${Math.round(b / 1000)}KB`;

/**
 * כל קובץ ב-public/assets: webp/avif/svg בלבד (כלומר עבר דרך npm run images),
 * עד 200KB לתמונת הירו (שם שמתחיל ב-hero) ועד 100KB לכל השאר.
 */
export function checkImages(assetsDir) {
  const files = listFiles(assetsDir);
  const items = [];
  for (const f of files) {
    const name = relative(assetsDir, f.path).split(sep).join("/");
    const ext = extname(name).toLowerCase();
    const base = name.split("/").pop();
    if (RASTER.has(ext)) {
      items.push(
        `${name}: ${ext} ולא webp. כנראה לא עבר דרך npm run images (${kb(f.bytes)})`,
      );
      continue;
    }
    if (!OK_EXT.has(ext)) continue;
    const isHero = /^hero/.test(base);
    const cap = isHero ? IMAGE_CAPS.hero : IMAGE_CAPS.inline;
    if (f.bytes > cap)
      items.push(
        `${name}: ${kb(f.bytes)}, מעל התקרה של ${kb(cap)} (${isHero ? "תמונת הירו" : "תמונה בתוך הדף"})`,
      );
  }
  return {
    name: "images",
    ok: items.length === 0,
    required: true,
    details:
      files.length === 0
        ? "אין תמונות ב-public/assets"
        : items.length === 0
          ? `${files.length} קבצים, כולם מתחת לתקרה`
          : `${items.length} קבצים לא עומדים בתקרה`,
    items,
  };
}

// ---------- 3. copy.json: פיסוק ודפוסי AI ----------

/** מפתחות שהם כותרת, כפתור או בולט: בלי נקודה בסוף */
const NO_DOT_KEY =
  /(^|\.)(title|heading|eyebrow|cta\d*|bullet\d*)$/i;

/** דפוסים מסעיף 6 של writing-rules.md שאפשר לזהות במכונה בלי הרבה טעויות */
export const AI_PATTERNS = [
  [/מהוו(ה|ים|ות)/, "מהווה"],
  [/משמש(ת|ים|ות)? כ/, "משמש כ"],
  [/לצלול לעומק/, "לצלול לעומק"],
  [/פורצ?(י|ת)? דרך/, "פורץ דרך"],
  [/מהפכני/, "מהפכני"],
  [/חשוב לציין|ראוי להדגיש|יש לזכור/, "חשוב לציין"],
  [/בעולם של היום|בעידן הדיגיטלי|בנוף העסקי/, "קלישאת עידן"],
  [/מומחים טוענים|מחקרים מראים|רבים סבורים/, "ייחוס עמום"],
  [/(^|[.!?]\s*)(לסיכום|בשורה התחתונה|בסופו של דבר)/, "סיכום מכני"],
  [/(^|[.!?]\s*)(בנוסף|יתרה מכך|זאת ועוד|כמו כן)[ ,]/, "פתיח המשך"],
  [/לשלב הבא|להגשים את הפוטנציאל|הפתרון המושלם/, "שפת שיווק ריקה"],
  [/(ביטחון|מהפכה|עוצמה) שקטה?/, "שקט כמגבר"],
  [/חוויה בלתי נשכחת|מגוון רחב|שלל /, "תואר גנרי"],
  [/לא רק[^.!?]*אלא/, "לא רק... אלא"],
  [/בכנות\?|נשמע מוכר\?/, "וידוי ריק / שאלת קואצ'ר"],
];
const EMPTY_BUTTONS = new Set([
  "שלח",
  "שליחה",
  "לחצו כאן",
  "לחץ כאן",
  "הרשמה",
  "למידע נוסף",
]);

/**
 * @param {Record<string,string>} copy content/copy.json
 * @param {string} voiceText brand/voice.md (ביטוי שרשום שם הוא הקול של בעל העסק, לא דפוס)
 */
export function checkCopyJson(copy, voiceText = "") {
  const items = [];
  for (const [key, value] of Object.entries(copy)) {
    if (typeof value !== "string") continue;
    const v = value.trim();
    if (NO_DOT_KEY.test(key) && /[^.]\.$/.test(v))
      items.push(`${key}: נקודה בסוף כותרת, כפתור או בולט`);
    if (v.includes("—")) items.push(`${key}: מקף ארוך (—)`);
    if (/[“”„‘’]/.test(v)) items.push(`${key}: מירכאות מסולסלות`);
    if (/(^|\.)cta\d*$/i.test(key) && EMPTY_BUTTONS.has(v))
      items.push(`${key}: כפתור ריק ("${v}"). הכפתור אומר מה מקבלים`);
    for (const [re, label] of AI_PATTERNS) {
      const m = re.exec(v);
      if (!m) continue;
      const phrase = m[0].replace(/^[.!?\s]+|[\s,]+$/g, "").trim();
      if (voiceText && voiceText.includes(phrase)) continue;
      items.push(`${key}: "${phrase}" (${label})`);
    }
  }
  return {
    name: "copy.json",
    ok: items.length === 0,
    required: true,
    details:
      items.length === 0
        ? "בלי נקודות בכותרות, בלי מקף ארוך ובלי דפוסי AI מוכרים"
        : `${items.length} מקומות לתקן בטקסטים של הדף`,
    items,
  };
}

// ---------- 4. כפתורים ----------

/** הווריאציה לכפתור האחרון, מהטבלה בראש 2-copy/copy.md. אין ← null */
export function copyVariation(copyMd) {
  const m = /^\|\s*וריאציה לכפתור האחרון\s*\|\s*(.*?)\s*\|/m.exec(copyMd ?? "");
  if (!m) return null;
  const v = m[1].trim();
  if (!v || v === "אין" || v.startsWith("[")) return null;
  return v;
}

/**
 * כל מפתח cta ב-copy.json (hero.cta, offer.cta…) וכפתור השליחה (form.submitLabel)
 * צריכים להיות טקסט הכפתור של הדף, או הווריאציה האחת מ-copy.md.
 */
export function checkCtas(copy, { submitLabel, variation } = {}) {
  const keys = Object.keys(copy).filter((k) => /(^|\.)cta\d*$/i.test(k));
  const base = { name: "cta", required: true };
  if (keys.length === 0)
    return {
      ...base,
      ok: false,
      details: "אין ב-copy.json מפתח לכפתור (hero.cta)",
      items: [],
    };
  const mainKey = keys.includes("hero.cta") ? "hero.cta" : keys[0];
  const main = String(copy[mainKey] ?? "").trim();
  if (!main || main.includes(MARK))
    return {
      ...base,
      ok: false,
      details: `טקסט הכפתור (${mainKey}) עוד לא מולא`,
      items: [],
    };
  const allowed = new Set([main, ...(variation ? [variation] : [])]);
  const items = [];
  for (const k of keys) {
    const v = String(copy[k] ?? "").trim();
    if (!allowed.has(v)) items.push(`${k}: "${v}" במקום "${main}"`);
  }
  if (
    submitLabel === null ||
    submitLabel === undefined ||
    submitLabel.includes(MARK)
  )
    items.push("form.submitLabel (כפתור השליחה ב-site.config.ts) עוד לא מולא");
  else if (!allowed.has(submitLabel.trim()))
    items.push(`form.submitLabel: "${submitLabel}" במקום "${main}"`);
  return {
    ...base,
    ok: items.length === 0,
    details:
      items.length === 0
        ? `כל הכפתורים: "${main}"${variation ? ` (וריאציה מותרת: "${variation}")` : ""}`
        : "יש כפתור עם טקסט אחר",
    items,
  };
}

// ---------- 5. copy.md דרך הסורק של הפלאגין ----------

export async function checkCopyMd(copyMdPath, copyScanPath) {
  const base = { name: "copy-scan", required: true };
  if (!copyScanPath)
    return {
      ...base,
      ok: null,
      details: "לא נבדק: לא הועבר הנתיב לסורק (--copy-scan)",
    };
  if (!existsSync(copyScanPath))
    return {
      ...base,
      ok: null,
      details: `לא נבדק: לא מצאתי את הסורק ב-${copyScanPath}`,
    };
  if (!existsSync(copyMdPath))
    return {
      ...base,
      ok: null,
      details: "לא נבדק: אין 2-copy/copy.md לדף הזה",
    };
  const { scanCopy } = await import(pathToFileURL(copyScanPath).href);
  const text = readFileSync(copyMdPath, "utf8");
  const scan = scanCopy(text);
  const variation = copyVariation(text);
  const items = [];
  for (const s of scan.sections)
    if (!/^(אושר|הוסר)/.test(s.state ?? ""))
      items.push(
        `סקשן ${s.number} (${s.title}): המצב "${s.state ?? "לא כתוב"}" ולא "אושר"`,
      );
  for (const d of scan.longDashes) items.push(`שורה ${d.line}: מקף ארוך`);
  for (const q of scan.curlyQuotes)
    items.push(`שורה ${q.line}: מירכאות מסולסלות`);
  const extra = scan.buttonTexts.filter((t, i) => i > 0 && t !== variation);
  if (extra.length)
    items.push(
      `יותר מטקסט כפתור אחד: ${scan.buttonTexts.map((t) => `"${t}"`).join(", ")}`,
    );
  return {
    ...base,
    ok: items.length === 0,
    details:
      items.length === 0
        ? `copy.md תקין. [למלא] בקופי: ${scan.todos.length}`
        : `${items.length} דברים לתקן ב-copy.md`,
    items,
  };
}

// ---------- 6–7. בנייה ובדיקות ----------

const tail = (s, n) => s.trim().split(/\r?\n/).slice(-n);

export function runNpm(root, script, { timeout = 600_000 } = {}) {
  const r = spawnSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    timeout,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  return {
    status: r.status,
    output: `${r.stdout ?? ""}\n${r.stderr ?? ""}`,
    error: r.error,
  };
}

function checkBuild(root) {
  const r = runNpm(root, "build");
  const ok = r.status === 0;
  return {
    name: "build",
    ok,
    required: true,
    details: ok
      ? "האתר נבנה בלי שגיאות"
      : r.error
        ? `הבנייה לא רצה: ${r.error.message}`
        : "הבנייה נכשלה",
    items: ok ? [] : tail(r.output, 20),
  };
}

function checkTests(root) {
  const r = runNpm(root, "test");
  const ok = r.status === 0;
  const passed = /Tests\s+(?:\d+ failed \|\s*)?(\d+) passed/.exec(r.output);
  const failed = /(\d+) failed/.exec(r.output);
  return {
    name: "tests",
    ok,
    required: true,
    details: ok
      ? `${passed ? passed[1] : "כל ה"} בדיקות עברו`
      : `${failed ? failed[1] : "חלק מה"} בדיקות נכשלו`,
    items: ok ? [] : tail(r.output, 25),
  };
}

// ---------- הכול ----------

/**
 * @param {string} root תיקיית האתר
 * @param {{ copyScan?: string, skip?: string[], copyMd?: string, voice?: string }} o
 */
export async function runChecks(root, o = {}) {
  const skip = new Set(o.skip ?? []);
  const copyMd = o.copyMd ?? join(root, "..", "2-copy", "copy.md");
  const voice = o.voice ?? join(root, "..", "..", "..", "brand", "voice.md");
  const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
  const configText = read(join(root, "site.config.ts"));
  let copy = {};
  let copyError = null;
  try {
    copy = JSON.parse(read(join(root, "content", "copy.json")) || "{}");
  } catch (e) {
    copyError = e.message;
  }
  const say = (s) => process.stderr.write(`בודק: ${s}\n`);
  const checks = [];

  say("[למלא]");
  checks.push(checkTodos(root));
  checks.push(checkPageUrl(configText));
  say("תמונות");
  checks.push(checkImages(join(root, "public", "assets")));
  if (copyError) {
    checks.push({
      name: "copy.json",
      ok: false,
      required: true,
      details: `content/copy.json לא JSON תקין: ${copyError}`,
    });
  } else {
    say("טקסטים וכפתורים");
    checks.push(checkCopyJson(copy, read(voice)));
    checks.push(
      checkCtas(copy, {
        submitLabel: configValue(configText, "form", "submitLabel"),
        variation: copyVariation(read(copyMd)),
      }),
    );
  }
  say("copy.md");
  checks.push(await checkCopyMd(copyMd, o.copyScan));
  for (const [name, fn] of [
    ["tests", checkTests],
    ["build", checkBuild],
  ]) {
    if (skip.has(name)) {
      checks.push({
        name,
        ok: null,
        required: true,
        details: "לא נבדק: דולג בבקשה (--skip)",
      });
      continue;
    }
    say(name === "build" ? "בנייה (כדקה)" : "הבדיקות של התבנית");
    checks.push(fn(root));
  }
  const ok = !checks.some((c) => c.required && c.ok === false);
  return { ok, checks };
}

function parseCli(argv) {
  const o = { skip: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--copy-scan") o.copyScan = argv[++i];
    else if (argv[i] === "--skip")
      o.skip = String(argv[++i] ?? "")
        .split(",")
        .filter(Boolean);
    else
      throw new Error(
        `לא הבנתי את "${argv[i]}". שימוש: npm run check -- [--copy-scan <נתיב>] [--skip build,tests]`,
      );
  }
  return o;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  try {
    const result = await runChecks(root, parseCli(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
}
