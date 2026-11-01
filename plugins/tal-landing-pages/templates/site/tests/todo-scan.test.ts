import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
// @ts-expect-error קובץ mjs בלי טיפוסים
import { scanForTodos } from "../scripts/todo-scan.mjs";

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "todo-"));
  dirs.push(root);
  for (const [rel, text] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
  return root;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("scanForTodos", () => {
  it("מוצא את הסימון בקבצים, עם קובץ ושורה", () => {
    const root = fixture({
      "app/page.tsx": "<h1>שלום</h1>\n<p>[למלא]</p>\n",
      "components/A.tsx": "x [למלא] y [למלא]\n",
      "public/note.txt": "[למלא]\n",
    });
    const r = scanForTodos(root);
    expect(r.total).toBe(4);
    expect(r.hits.map((h: any) => `${h.file}:${h.line}`)).toEqual([
      "app/page.tsx:2",
      "components/A.tsx:1",
      "public/note.txt:1",
    ]);
  });

  it("ב-site.config.ts סופר TODO שמוצב בקוד, לא הערות ולא import", () => {
    const root = fixture({
      "site.config.ts": [
        'import { TODO } from "@/lib/todo";',
        "// TODO בהערה",
        "/** TODO בבלוק */",
        "export const site = {",
        "  name: TODO,",
        "  url: `https://${TODO}.co.il`,",
        '  note: "TODO במחרוזת רגילה",',
        '  phone: "[למלא]",',
        "};",
      ].join("\n"),
    });
    const r = scanForTodos(root);
    expect(r.hits.map((h: any) => h.line)).toEqual([5, 6, 8]);
    expect(r.total).toBe(3);
  });

  it("קוד שרק משתמש ב-isTodo לא נספר", () => {
    const root = fixture({
      "components/Footer.tsx":
        'import { isTodo } from "@/lib/todo";\nconst x = isTodo(v) ? null : v;\n',
      "site.config.ts": "export const site = { a: 1 };\n",
    });
    expect(scanForTodos(root).total).toBe(0);
  });

  it("לא סורק lib/todo.ts, node_modules, .next ו-tests", () => {
    const root = fixture({
      "lib/todo.ts": 'export const TODO = "[למלא]";\n',
      "lib/other.ts": "const a = '[למלא]';\n",
      "components/node_modules/x.ts": "[למלא]\n",
      "app/.next/y.ts": "[למלא]\n",
      "app/tests/z.ts": "[למלא]\n",
    });
    const r = scanForTodos(root);
    expect(r.hits.map((h: any) => h.file)).toEqual(["lib/other.ts"]);
  });

  it("לא קורא קבצי .env, ומתעלם מקבצים שאינם טקסט", () => {
    const root = fixture({
      "public/.env": "[למלא]\n",
      "public/pic.png": "[למלא]",
    });
    expect(scanForTodos(root).total).toBe(0);
  });

  it("תיקייה ריקה או חסרה נותנת אפס", () => {
    expect(scanForTodos(fixture({ "README.md": "x" })).total).toBe(0);
  });
});
