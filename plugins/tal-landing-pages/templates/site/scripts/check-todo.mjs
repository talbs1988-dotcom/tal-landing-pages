#!/usr/bin/env node
/**
 * בודק כמה "[למלא]" נשארו באתר.
 * מדפיס `קובץ:שורה  <השורה>` לכל מופע, ובסוף כמה נשארו.
 * יוצא עם קוד 1 אם נשאר משהו. לא קורא קבצי סביבה (.env).
 * הלוגיקה ב-todo-scan.mjs.
 */
import { fileURLToPath } from "node:url";
import { scanForTodos } from "./todo-scan.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const { hits, total } = scanForTodos(ROOT);

for (const h of hits) console.log(`${h.file}:${h.line}  ${h.text}`);

if (total > 0) {
  console.log(`\nנשארו ${total} דברים למלא`);
  process.exit(1);
}
console.log("אין חוסרים ✓");
