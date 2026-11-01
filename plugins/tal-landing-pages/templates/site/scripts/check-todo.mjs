#!/usr/bin/env node
/**
 * בודק כמה "[למלא]" נשארו באתר.
 * מדפיס קובץ:שורה לכל מופע, ובסוף כמה נשארו. יוצא עם קוד 1 אם נשאר משהו.
 * לא קורא קבצי סביבה (.env) בכלל.
 *
 * גרסה ראשונה. הגרסה הסופית נכתבת במשימה 7 של תוכנית 2.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MARK = "[למלא]";
const TARGETS = ["site.config.ts", "app", "components", "public"];
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".css",
  ".md",
  ".json",
  ".txt",
  ".svg",
  ".html",
  ".xml",
]);
// lib/todo.ts מגדיר את הסימון עצמו, ולכן לא נסרק (הוא גם לא ברשימת התיקיות)

function walk(path, out) {
  let st;
  try {
    st = statSync(path);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(join(path, name), out);
    }
  } else if (TEXT_EXT.has(extname(path))) {
    out.push(path);
  }
}

const files = [];
for (const t of TARGETS) walk(join(ROOT, t), files);

let count = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    let from = 0;
    while ((from = line.indexOf(MARK, from)) !== -1) {
      count++;
      from += MARK.length;
    }
    if (line.includes(MARK)) console.log(`${relative(ROOT, file)}:${i + 1}`);
  });
}

// בתוך site.config.ts רוב ה-TODO כתובים כמשתנה TODO ולא כטקסט, אז סופרים גם אותם
const configPath = join(ROOT, "site.config.ts");
try {
  const lines = readFileSync(configPath, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // שורות הערה (/** ... */, // ...) לא נספרות
    if (/^(\/\/|\/\*|\*)/.test(trimmed)) return;
    const code = line.replace(/\/\/.*$/, "");
    if (/\bTODO\b/.test(code) && !/^import\s/.test(trimmed)) {
      const n = code.match(/\bTODO\b/g).length;
      count += n;
      console.log(`site.config.ts:${i + 1}`);
    }
  });
} catch {
  // אין קובץ config: אין מה לספור
}

if (count > 0) {
  console.log(`\nנשארו ${count} דברים למלא`);
  process.exit(1);
}
console.log("אין דברים למלא. הכול מלא.");
