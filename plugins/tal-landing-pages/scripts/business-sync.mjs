// Copies the business details from legal/business.md (one file per business)
// into site/site.config.ts of one page (`business` and `legal`), so there is
// one source and no two places that disagree.
//
// It never rewrites the config. It finds each mapped field on its own line
// (`legalName: TODO,` / `legalName: "…",`) and replaces only the value there.
// Anything it cannot find as a plain one-line value is left alone and listed
// as missing. The result is checked before it is written, and written
// atomically (temp file + rename).
//
// It also mirrors the business's own legal texts, legal/texts/<slug>.md and
// <slug>.additions.md, into site/content/legal/ of the page (syncLegalTexts).
import { readFile, writeFile, rename, access, mkdir, unlink } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";

// ---------------------------------------------------------------------------
// The mapping table: one row per line in business.md.
//
// label     the text before ":" in business.md. Fixed, the parser matches on it.
// path      where the value goes in `export const site` of site.config.ts.
// none      what "אין" means for this field. undefined = "אין" is not allowed.
// check     validates and normalizes a value. Returns {value} or {reason}.
// needed    when the field is needed at all (ctx: what is already known).
//           Returns true, false, or null (not known yet).
// unneeded  what to write when the field is not needed and has no value.
//           undefined = leave the config as is.
// stripDot  the legal pages put a "." right after this value.
// ---------------------------------------------------------------------------

export const BUSINESS_TYPES = ["עוסק פטור", "עוסק מורשה", 'חברה בע"מ', "עמותה"];

const IS_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkType(v) {
  const s = v.replace(/״/g, '"').replace(/\s+/g, " ").trim();
  if (BUSINESS_TYPES.includes(s)) return { value: s };
  if (/פטור/.test(s)) return { value: "עוסק פטור" };
  if (/מורשה/.test(s)) return { value: "עוסק מורשה" };
  if (/חברה|בע"?מ/.test(s)) return { value: 'חברה בע"מ' };
  if (/עמותה/.test(s)) return { value: "עמותה" };
  return { reason: `צריך להיות אחד מאלה: ${BUSINESS_TYPES.join(", ")}` };
}

function checkId(v) {
  const digits = v.replace(/\D/g, "");
  if (/^\d{8,9}$/.test(digits)) return { value: digits };
  return { reason: "מספר עוסק או ח.פ.: 8 או 9 ספרות" };
}

function checkEmail(v) {
  const s = v.trim();
  if (IS_EMAIL.test(s)) return { value: s };
  return { reason: "כתובת מייל, למשל dana@example.co.il" };
}

function checkPostal(v) {
  const s = v.trim();
  if (s.includes("@") || /^https?:/i.test(s))
    return { reason: "מען למשלוח דואר (ת\"ד או רחוב ועיר), לא מייל ולא אתר" };
  return { value: s };
}

function checkPhone(v) {
  const s = v.trim();
  const digits = s.replace(/^\+972/, "0").replace(/\D/g, "");
  if (digits.length >= 9 && digits.length <= 10) return { value: s };
  return { reason: "מספר טלפון ישראלי, למשל 050-1234567" };
}

// What the business sells → legal.offerType. Decides the return wording in the terms page.
function checkOfferType(v) {
  const s = v.replace(/\s+/g, " ").trim();
  const product = /מוצר/.test(s);
  const service = /שירות|ליווי|סדנה|קורס|פגישה|טיפול|ייעוץ/.test(s);
  if (/גם וגם|שניהם|גם מוצר|גם שירות/.test(s) || (product && service))
    return { value: "both" };
  if (product) return { value: "product" };
  if (service) return { value: "service" };
  if (/^(service|product|both)$/.test(s)) return { value: s };
  return { reason: "צריך להיות אחד מאלה: שירות, מוצר, גם וגם" };
}

const noAddress = (ctx) =>
  ctx.street === undefined || ctx.city === undefined
    ? null
    : ctx.street === "" && ctx.city === "";

export const FIELDS = [
  // ---- העסק
  { label: "שם משפטי", path: "business.legalName" },
  { label: "השם שהקהל מכיר", path: "business.displayName" },
  { label: "סוג", path: "business.type", check: checkType },
  { label: "מספר עוסק / ח.פ.", path: "business.idNumber", check: checkId },
  // ---- כתובת ("אין" בשלוש השורות, או "- כתובת: אין" = לא מפרסמים כתובת)
  { label: "רחוב ומספר", path: "business.address.street", none: "" },
  { label: "עיר", path: "business.address.city", none: "" },
  { label: "מיקוד", path: "business.address.postalCode", none: "" },
  // ---- יצירת קשר
  { label: "טלפון", path: "business.phone", check: checkPhone },
  { label: "מייל ליצירת קשר", path: "business.email", check: checkEmail },
  // ---- רכז/ת נגישות
  { label: "רכז/ת נגישות, שם", path: "business.accessibilityCoordinator.name" },
  {
    label: "רכז/ת נגישות, טלפון",
    path: "business.accessibilityCoordinator.phone",
    check: checkPhone,
  },
  {
    label: "רכז/ת נגישות, מייל",
    path: "business.accessibilityCoordinator.email",
    check: checkEmail,
  },
  // ---- משפטי
  { label: "מה העסק מוכר", path: "legal.offerType", check: checkOfferType },
  {
    label: "מען להודעות ביטול והחזרות",
    path: "legal.noticeAddress",
    check: checkPostal,
    none: "",
    needed: noAddress,
    neededWhen: "רק אם לא מפרסמים כתובת",
  },
  {
    label: "כלי אוטומציה שמקבל את הליד",
    path: "legal.processors.automation",
    none: "",
  },
  { label: "מערכת דיוור", path: "legal.processors.mailing", none: "" },
  { label: "CRM או טבלת לקוחות", path: "legal.processors.crm", none: "" },
  {
    label: "כלי ניתוח תנועה",
    path: "legal.processors.analytics",
    none: "",
    needed: (ctx) => ctx.analytics,
    neededWhen: "רק אם באתר יש כלי ניתוח תנועה (collects.analytics)",
  },
  {
    label: "כמה זמן שומרים פרטי לידים",
    path: "legal.retention",
    stripDot: true,
  },
  {
    label: "תוך כמה זמן מטפלים בבקשת מחיקה",
    path: "legal.deletionTimeframe",
    stripDot: true,
  },
  {
    label: "מוצרים או שירותים שאי אפשר לבטל",
    path: "legal.cancellationExceptions",
    none: "אין",
    stripDot: true,
  },
  {
    label: "רכיבים באתר שעוד לא נגישים",
    path: "legal.accessibilityLimitations",
    none: "לא ידוע לנו על רכיבים כאלה",
    stripDot: true,
  },
  {
    label: "נגישות במקום העסק",
    path: "legal.physicalAccessibility",
    none: "אין קבלת קהל בכתובת העסק",
    needed: (ctx) => {
      const n = noAddress(ctx);
      return n === null ? null : !n;
    },
    neededWhen: "רק אם מפרסמים כתובת",
    // The section is hidden without an address, but a TODO would still count.
    unneeded: "",
  },
];

// One line that stands for all three address lines.
export const ADDRESS_ALIAS = "כתובת";
const ADDRESS_LABELS = ["רחוב ומספר", "עיר", "מיקוד"];

// ---------------------------------------------------------------------------
// business.md
// ---------------------------------------------------------------------------

/** label → raw value, from lines "- <label>: <value>". HTML comments skipped. */
export function parseBusinessMd(text) {
  const out = new Map();
  let inComment = false;
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (inComment) {
      if (line.includes("-->")) inComment = false;
      continue;
    }
    if (line.trim().startsWith("<!--")) {
      if (!line.includes("-->")) inComment = true;
      continue;
    }
    const m = /^[-*]\s+([^:]+?)\s*:\s*(.*?)\s*$/.exec(line);
    if (m && !out.has(m[1])) out.set(m[1], m[2]);
  }
  return out;
}

const isBlank = (v) => v === undefined || v.trim() === "";
// "[למלא]", "[למלא: …]", or a hint in brackets like "[עוסק פטור / …]"
const isPlaceholder = (v) => /\[למלא/.test(v) || /^\[.*\]$/.test(v.trim());
const isNone = (v) => /^אין\.?$/.test(v.trim());

// ---------------------------------------------------------------------------
// site.config.ts
// ---------------------------------------------------------------------------

const LITERAL =
  /^(TODO\b|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|true\b|false\b)\s*,?\s*(\/\/.*)?$/;

function parseLiteral(raw) {
  if (raw === "TODO") return null; // not filled
  if (raw === "true") return true;
  if (raw === "false") return false;
  const inner = raw.slice(1, -1);
  const asJson =
    raw[0] === '"'
      ? inner.replace(/\\'/g, "'")
      : inner.replace(/\\'/g, "'").replace(/(^|[^\\])"/g, '$1\\"');
  try {
    return JSON.parse(`"${asJson}"`);
  } catch {
    return inner;
  }
}

// Strings and line comments removed, to count braces safely.
const codeOnly = (line) =>
  line
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/\/\/.*$/, "");

/**
 * Every one-line value inside `export const site = { … }`:
 * "business.legalName" → { line, col, raw, value }. value null = TODO.
 */
export function configFields(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^export\s+const\s+site\b/.test(l));
  if (start === -1)
    throw new Error("לא מצאתי את `export const site` בקובץ site.config.ts");
  const fields = new Map();
  const stack = [];
  let inBlock = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (inBlock) {
      if (line.includes("*/")) inBlock = false;
      continue;
    }
    if (/^\s*\/\*/.test(line) && !line.includes("*/")) {
      inBlock = true;
      continue;
    }
    if (/^\s*(\/\/|\/\*)/.test(line)) continue;
    const key = /^(\s*)([A-Za-z_$][\w$]*)\s*:\s*/.exec(line);
    const code = codeOnly(line);
    const net =
      (code.match(/\{/g) ?? []).length - (code.match(/\}/g) ?? []).length;
    if (key) {
      const rest = line.slice(key[0].length);
      const lit = LITERAL.exec(rest);
      if (lit) {
        const path = [...stack, key[2]].join(".");
        fields.set(path, {
          line: i,
          col: key[0].length,
          raw: lit[1],
          value: parseLiteral(lit[1]),
        });
        continue;
      }
      if (net > 0) {
        stack.push(key[2]);
        for (let k = 1; k < net; k++) stack.push("?");
        continue;
      }
    }
    if (net > 0) for (let k = 0; k < net; k++) stack.push("?");
    if (net < 0) {
      for (let k = 0; k < -net; k++) {
        if (stack.length === 0) return fields; // the end of `site`
        stack.pop();
      }
    }
  }
  return fields;
}

/** The config text with the given values put in place. Throws if it would break. */
export function applyValues(text, values) {
  const before = configFields(text);
  const lines = text.split("\n");
  for (const [path, value] of values) {
    const f = before.get(path);
    if (!f) throw new Error(`השדה ${path} לא נמצא ב-site.config.ts`);
    const line = lines[f.line];
    lines[f.line] =
      line.slice(0, f.col) +
      JSON.stringify(value) +
      line.slice(f.col + f.raw.length);
  }
  const out = lines.join("\n");
  // Check: same lines, same fields, and each new value reads back as written.
  const after = configFields(out);
  const sameShape =
    out.split("\n").length === text.split("\n").length &&
    after.size === before.size &&
    [...before.keys()].every((k) => after.has(k));
  const readsBack = [...values].every(([p, v]) => after.get(p)?.value === v);
  if (!sameShape || !readsBack)
    throw new Error(
      "העדכון היה משנה את המבנה של site.config.ts, אז לא כתבתי כלום. כדאי לבדוק את הקובץ.",
    );
  return out;
}

// ---------------------------------------------------------------------------
// The sync
// ---------------------------------------------------------------------------

/**
 * What each field resolves to, from the business.md text and the config text.
 * Pure: no files. Returns { values: Map(path → value), updated, missing }.
 */
export function planSync(businessText, configText) {
  const md = parseBusinessMd(businessText);
  const cfg = configFields(configText);

  // "- כתובת: אין" fills the three address lines that have no answer yet.
  const alias = md.get(ADDRESS_ALIAS);
  const aliasNone = alias !== undefined && isNone(alias);
  if (aliasNone)
    for (const l of ADDRESS_LABELS)
      if (isBlank(md.get(l)) || isPlaceholder(md.get(l))) md.set(l, "אין");

  const resolved = new Map(); // label → { value } | { reason } | {}
  for (const f of FIELDS) {
    const raw = md.get(f.label);
    if (raw === undefined) {
      const aliasUsed =
        ADDRESS_LABELS.includes(f.label) && alias !== undefined && !aliasNone;
      resolved.set(f.label, {
        reason: aliasUsed
          ? 'לפרק את "כתובת" לשלוש שורות: רחוב ומספר, עיר, מיקוד'
          : "השורה חסרה ב-business.md",
      });
      continue;
    }
    if (isBlank(raw) || isPlaceholder(raw)) {
      resolved.set(f.label, {});
      continue;
    }
    if (isNone(raw)) {
      resolved.set(
        f.label,
        f.none === undefined
          ? { reason: 'שדה חובה, אי אפשר "אין"' }
          : { value: f.none },
      );
      continue;
    }
    let value = raw.trim();
    if (f.check) {
      const r = f.check(value);
      if (r.reason) {
        resolved.set(f.label, { reason: `${r.reason} (כרגע: "${value}")` });
        continue;
      }
      value = r.value;
    }
    if (f.stripDot) value = value.replace(/\.+$/, "").trim();
    resolved.set(f.label, { value });
  }

  // A half address is worse than none: street and city go together.
  const street = resolved.get("רחוב ומספר");
  const city = resolved.get("עיר");
  if ("value" in street && "value" in city) {
    if ((street.value === "") !== (city.value === "")) {
      const reason = 'כתובת חלקית: צריך גם רחוב וגם עיר, או "אין" בשניהם';
      resolved.set("רחוב ומספר", { reason });
      resolved.set("עיר", { reason });
    } else if (street.value === "") {
      // No public address → the postal code alone must not show up as one.
      resolved.set("מיקוד", { value: "" });
    }
  }

  const known = (label) => {
    const r = resolved.get(label);
    return r && "value" in r ? r.value : undefined;
  };
  const analytics = cfg.get("collects.analytics")?.value;
  const ctx = {
    street: known("רחוב ומספר"),
    city: known("עיר"),
    analytics: typeof analytics === "boolean" ? analytics : null,
  };

  const values = new Map();
  const updated = [];
  const missing = [];
  for (const f of FIELDS) {
    const r = resolved.get(f.label);
    const needed = f.needed ? f.needed(ctx) : true;
    const current = cfg.get(f.path);
    if (!current) {
      missing.push({
        field: f.path,
        label: f.label,
        reason: "השדה לא נמצא ב-site.config.ts",
      });
      continue;
    }
    let value = "value" in r ? r.value : undefined;
    if (value === undefined) {
      if (needed === false) {
        if (f.unneeded === undefined || current.value === f.unneeded) continue;
        value = f.unneeded;
      } else {
        const entry = { field: f.path, label: f.label };
        if (r.reason) entry.reason = r.reason;
        else if (needed === null) entry.reason = f.neededWhen;
        missing.push(entry);
        continue;
      }
    }
    if (current.value === value) continue;
    values.set(f.path, value);
    updated.push({ field: f.path, label: f.label, value });
  }
  return { values, updated, missing };
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// The business folder: the first folder at or above the page with the marker.
async function businessRootOf(pageDir, findBusinessRoot) {
  const root = await findBusinessRoot(pageDir);
  if (!root)
    throw new Error(
      `לא מצאתי את תיקיית העסק מעל ${pageDir}. הדף צריך להיות בתוך landing-pages של תיקיית עסק.`,
    );
  return root;
}

async function writeAtomic(path, text) {
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.tmp`);
  await writeFile(tmp, text);
  await rename(tmp, path);
}

// ---------------------------------------------------------------------------
// The legal texts: legal/texts/ of the business → site/content/legal/ of the page
// ---------------------------------------------------------------------------

// The only names that move: per page, a full replacement and additions.
// Must match LEGAL_SLUGS in templates/site/lib/legalText.ts.
export const LEGAL_TEXT_SLUGS = ["terms", "privacy", "accessibility", "data-deletion"];
export const LEGAL_TEXT_FILES = LEGAL_TEXT_SLUGS.flatMap((s) => [
  `${s}.md`,
  `${s}.additions.md`,
]);

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}

/**
 * Mirrors the 8 legal text files from <businessRoot>/legal/texts/ to
 * <siteDir>/content/legal/. At the business → copied over the site's copy
 * (only when the content differs, so a second run reports nothing). Not at
 * the business but in the site → removed. Any other file in either folder is
 * not touched. No legal/texts/ folder = no texts, not an error.
 * Returns { copied: [name], removed: [name] }.
 */
export async function syncLegalTexts(businessRoot, siteDir) {
  const from = join(businessRoot, "legal", "texts");
  const to = join(siteDir, "content", "legal");
  const copied = [];
  const removed = [];
  for (const name of LEGAL_TEXT_FILES) {
    const [source, target] = await Promise.all([
      readOptional(join(from, name)),
      readOptional(join(to, name)),
    ]);
    if (source !== null) {
      if (source === target) continue;
      await mkdir(to, { recursive: true });
      await writeAtomic(join(to, name), source);
      copied.push(name);
    } else if (target !== null) {
      await unlink(join(to, name));
      removed.push(name);
    }
  }
  return { copied, removed };
}

/**
 * legal/business.md → <pageDir>/site/site.config.ts, and legal/texts/ →
 * <pageDir>/site/content/legal/.
 * Returns { updated: [{field,label,value}], missing: [{field,label,reason?}],
 * texts: { copied: [name], removed: [name] } }.
 */
export async function syncBusiness(pageDir, { findBusinessRoot }) {
  const page = resolve(pageDir);
  if (!(await exists(join(page, ".page", "status.json"))))
    throw new Error(
      `זו לא תיקיית דף: ${page}. תיקיית דף נוצרת עם /page-start ויש בה את .page/status.json.`,
    );
  const configPath = join(page, "site", "site.config.ts");
  if (!(await exists(configPath)))
    throw new Error(
      `אין עדיין אתר בדף הזה (לא מצאתי את ${configPath}). האתר נוצר בשלב העיצוב, /page-design.`,
    );
  const root = await businessRootOf(page, findBusinessRoot);
  const businessPath = join(root, "legal", "business.md");
  if (!(await exists(businessPath)))
    throw new Error(`לא מצאתי את פרטי העסק: ${businessPath}`);
  const [businessText, configText] = await Promise.all([
    readFile(businessPath, "utf8"),
    readFile(configPath, "utf8"),
  ]);
  const { values, updated, missing } = planSync(businessText, configText);
  if (values.size > 0)
    await writeAtomic(configPath, applyValues(configText, values));
  const texts = await syncLegalTexts(root, join(page, "site"));
  return { updated, missing, texts };
}
