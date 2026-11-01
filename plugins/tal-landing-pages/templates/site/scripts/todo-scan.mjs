/**
 * סריקת חוסרים: כל מה שעוד מסומן "[למלא]".
 * פונקציה טהורה (בלי הדפסה ובלי exit), כדי ששני הצדדים ישתמשו בה: הסקריפט והבדיקה.
 * לא קוראת קבצי סביבה (.env) בכלל.
 *
 * מה נספר:
 *  1. הסימון עצמו, [למלא], בכל קובץ טקסט שנסרק (כולל content/copy.json, הקופי של הדף).
 *  2. ב-site.config.ts בלבד: הערך TODO שמוצב בקוד (כי שם הוא כתוב כמשתנה ולא כטקסט).
 *     שורות הערה ושורות import לא נספרות.
 *  3. ב-site.config.ts: בדיקות ערכים (configProblems), כל בעיה נספרת כחוסר אחד:
 *     page.url שמולא אבל אינו כתובת https תקינה.
 * קוד שרק משתמש ב-isTodo(...) או ב-isFilled(...) לא נספר.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";

export const MARK = "[למלא]";
export const TARGETS = ["site.config.ts", "content", "app", "components", "lib", "public"];
// lib/todo.ts מגדיר את הסימון עצמו
const SKIP_FILES = new Set(["lib/todo.ts"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "tests"]);
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".md", ".json",
  ".txt", ".svg", ".html", ".xml", ".webmanifest",
]);

function walk(path, root, out) {
  let st;
  try {
    st = statSync(path);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    for (const name of readdirSync(path).sort()) {
      if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
      walk(join(path, name), root, out);
    }
  } else if (TEXT_EXT.has(extname(path))) {
    const rel = relative(root, path).split(sep).join("/");
    if (!SKIP_FILES.has(rel)) out.push({ path, rel });
  }
}

const count = (line, re) => (line.match(re) ?? []).length;

/** הערך של שדה בשורה: "..." / '...' ← המחרוזת, TODO ← null (נספר בנפרד), אחר ← undefined */
function literalValue(line, key) {
  const m = new RegExp(
    `^\\s*${key}\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|TODO\\b|\\S)`,
  ).exec(line);
  if (!m) return undefined;
  if (m[1] === "TODO") return null;
  if (m[1].length < 2) return undefined;
  return m[1].slice(1, -1);
}

/** האם זו כתובת https מלאה ותקינה, כמו https://example.co.il */
function isHttpsUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && /^[^.\s]+(\.[^.\s]+)+$/.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * בדיקות ערכים ב-site.config.ts (מעבר לספירת TODO).
 * @param {string[]} lines שורות הקובץ
 * @returns {{ line: number, text: string, count: number }[]}
 */
export function configProblems(lines) {
  const out = [];
  const start = lines.findIndex((l) => /export\s+const\s+site\b/.test(l));
  if (start === -1) return out;
  let section = "";
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const open = /^\s*(\w+)\s*:\s*\{/.exec(line);
    if (open && /^\s{2}\S/.test(line)) section = open[1];
    if (section === "page") {
      const url = literalValue(line, "url");
      if (url !== undefined && url !== null && !isHttpsUrl(url)) {
        out.push({
          line: i + 1,
          text: `page.url חייב להיות כתובת https מלאה, למשל https://example.co.il (כרגע: "${url}")`,
          count: 1,
        });
      }
    }
  }
  return out;
}

/**
 * @param {string} root תיקיית האתר
 * @returns {{ hits: {file: string, line: number, text: string, count: number}[], total: number }}
 */
export function scanForTodos(root) {
  const files = [];
  for (const t of TARGETS) walk(join(root, t), root, files);

  const hits = [];
  for (const { path, rel } of files) {
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      let n = count(line, /\[למלא\]/g);
      if (rel === "site.config.ts") {
        const trimmed = line.trim();
        const isComment = /^(\/\/|\/\*|\*)/.test(trimmed);
        if (!isComment && !/^import\s/.test(trimmed)) {
          // תבנית עם ${TODO} נספרת לפני שמסירים מחרוזות
          n += count(line, /`[^`]*\$\{\s*TODO\s*\}[^`]*`/g);
          // מסירים מחרוזות ואז הערת סוף שורה (בסדר הזה, כי "https://" הוא לא הערה)
          const code = line
            .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""')
            .replace(/\/\/.*$/, "");
          n += count(code, /\bTODO\b/g);
        }
      }
      if (n > 0) hits.push({ file: rel, line: i + 1, text: line.trim(), count: n });
    });
    if (rel === "site.config.ts") {
      for (const p of configProblems(lines)) hits.push({ file: rel, ...p });
      hits.sort((a, b) => (a.file === b.file ? a.line - b.line : 0));
    }
  }
  return { hits, total: hits.reduce((s, h) => s + h.count, 0) };
}
