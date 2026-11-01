import { PRISTINE } from "./templateState";
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

  it("סופר [למלא] גם ב-content/copy.json, שורה לכל מפתח", () => {
    const root = fixture({
      "content/copy.json":
        '{\n  "hero.title": "[למלא]",\n  "hero.subtitle": "כבר מולא",\n  "hero.cta": "[למלא]"\n}\n',
    });
    const r = scanForTodos(root);
    expect(r.total).toBe(2);
    expect(r.hits.map((h: any) => `${h.file}:${h.line}`)).toEqual([
      "content/copy.json:2",
      "content/copy.json:4",
    ]);
  });

  it.skipIf(!PRISTINE)("התבנית עצמה: content/copy.json נספר", () => {
    const r = scanForTodos(fileURLToPath(new URL("..", import.meta.url)));
    expect(r.hits.some((h: any) => h.file === "content/copy.json")).toBe(true);
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

  it("page.url ממולא בלי https תקין: שורה בעברית ונספר כחוסר", () => {
    for (const bad of ['"www.example.co.il"', '"http://example.co.il"', '"https://"', '""']) {
      const root = fixture({
        "site.config.ts": [
          "export const site = {",
          "  page: {",
          `    url: ${bad},`,
          '    title: "x",',
          "  },",
          "};",
        ].join("\n"),
      });
      const r = scanForTodos(root);
      expect(r.total).toBe(1);
      expect(r.hits[0].file).toBe("site.config.ts");
      expect(r.hits[0].line).toBe(3);
      expect(r.hits[0].text).toMatch(/page\.url/);
      expect(r.hits[0].text).toMatch(/https/);
      expect(r.hits[0].text).toMatch(/[\u0590-\u05FF]/);
    }
  });

  it("page.url תקין או TODO: אין שורה נוספת", () => {
    const ok = fixture({
      "site.config.ts": 'export const site = {\n  page: {\n    url: "https://example.co.il",\n  },\n};\n',
    });
    expect(scanForTodos(ok).total).toBe(0);
    const todo = fixture({
      "site.config.ts": "export const site = {\n  page: {\n    url: TODO,\n  },\n};\n",
    });
    const r = scanForTodos(todo);
    expect(r.total).toBe(1);
    expect(r.hits[0].text).toBe("url: TODO,");
  });

  const cfg = (street: string, notice: string) =>
    [
      "export const site = {",
      "  business: {",
      "    address: {",
      `      street: ${street},`,
      `      city: ${street},`,
      `      postalCode: ${street},`,
      "    },",
      "  },",
      "  legal: {",
      `    noticeAddress: ${notice},`,
      "  },",
      "};",
    ].join("\n");

  it("noticeAddress נספר רק כשאין לעסק כתובת פומבית", () => {
    // אין כתובת ("") ← המען חובה
    let r = scanForTodos(fixture({ "site.config.ts": cfg('""', "TODO") }));
    expect(r.total).toBe(1);
    expect(r.hits[0].line).toBe(10);
    // כתובת מלאה ← המען לא נחוץ
    r = scanForTodos(fixture({ "site.config.ts": cfg('"הרצל 5"', "TODO") }));
    expect(r.total).toBe(0);
    // כתובת עוד לא מולאה ← רק שלושת שדות הכתובת נספרים
    r = scanForTodos(fixture({ "site.config.ts": cfg("TODO", "TODO") }));
    expect(r.total).toBe(3);
    expect(r.hits.every((h: any) => h.line !== 10)).toBe(true);
  });

  it("אין כתובת והמען ריק: שורה בעברית ונספר", () => {
    const r = scanForTodos(fixture({ "site.config.ts": cfg('""', '""') }));
    expect(r.total).toBe(1);
    expect(r.hits[0].line).toBe(10);
    expect(r.hits[0].text).toMatch(/noticeAddress/);
    expect(r.hits[0].text).toMatch(/[\u0590-\u05FF]/);
  });

  it("אין כתובת והמען מולא: אפס", () => {
    const r = scanForTodos(fixture({ "site.config.ts": cfg('""', '"ת.ד. 123, חיפה"') }));
    expect(r.total).toBe(0);
  });
});

describe("התבנית עצמה", () => {
  it("בקוד הקבוע של התבנית (lib, components בלי sections) אין [למלא]", () => {
    const site = fileURLToPath(new URL("..", import.meta.url));
    const files = scanForTodos(site)
      .hits.map((h: { file: string }) => h.file)
      .filter((f: string) => /^(lib|components)\//.test(f) && !f.startsWith("components/sections/"));
    expect(files).toEqual([]);
  });
});

describe("form: לפחות מייל או טלפון", () => {
  const cfg = (email: string, phone: string) =>
    [
      "export const site = {",
      "  business: {",
      '    phone: "050-1234567",',
      '    email: "a@b.co.il",',
      "  },",
      "  form: {",
      `    email: ${email},`,
      `    phone: ${phone},`,
      "  },",
      "};",
      "",
    ].join("\n");
  it('שניהם "hidden" ← נספר כחוסר, עם הסבר', () => {
    const r = scanForTodos(fixture({ "site.config.ts": cfg('"hidden"', '"hidden"') }));
    expect(r.total).toBe(1);
    expect(r.hits[0].text).toMatch(/לפחות מייל או טלפון/);
  });
  it("אחד מהם מוצג ← תקין. פרטי העסק (business.phone/email) לא מתבלבלים עם הטופס", () => {
    for (const [e, p] of [
      ['"hidden"', '"required"'],
      ['"optional"', '"hidden"'],
      ['"required"', '"required"'],
    ])
      expect(scanForTodos(fixture({ "site.config.ts": cfg(e, p) })).total, `${e}/${p}`).toBe(0);
  });
});
