/**
 * סריקת חוסרים: כל מה שעוד מסומן "[למלא]".
 * פונקציה טהורה (בלי הדפסה ובלי exit), כדי ששני הצדדים ישתמשו בה: הסקריפט והבדיקה.
 * לא קוראת קבצי סביבה (.env) בכלל.
 *
 * מה נספר:
 *  1. הסימון עצמו, [למלא], בכל קובץ טקסט שנסרק.
 *  2. ב-site.config.ts בלבד: הערך TODO שמוצב בקוד (כי שם הוא כתוב כמשתנה ולא כטקסט).
 *     שורות הערה ושורות import לא נספרות.
 * קוד שרק משתמש ב-isTodo(...) או ב-isFilled(...) לא נספר.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";

export const MARK = "[למלא]";
export const TARGETS = ["site.config.ts", "app", "components", "lib", "public"];
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
  }
  return { hits, total: hits.reduce((s, h) => s + h.count, 0) };
}
