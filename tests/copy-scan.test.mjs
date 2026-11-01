import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  parseCopy,
  scanCopy,
} from "../plugins/tal-landing-pages/scripts/copy-scan.mjs";

const CLI = fileURLToPath(
  new URL(
    "../plugins/tal-landing-pages/scripts/copy-scan.mjs",
    import.meta.url,
  ),
);
const TEMPLATE = fileURLToPath(
  new URL("../plugins/tal-landing-pages/templates/copy.md", import.meta.url),
);

const SAMPLE = `# הקופי של סדנה

<!--
(כפתור: לא נספר כי זו הערה)
[למלא]
-->

| מה          | ערך              |
| ----------- | ---------------- |
| טקסט הכפתור | שמרו לי מקום     |

## המבנה

מצב: אושר

| # | סקשן | מה הוא יגיד | מאיפה | מצב |
| 1 | הירו | (כפתור: לא נספר) | brief | יש חומר |

## 1. הירו

מצב: אושר
מקורות:

- הכאב: customer-words.md #2 [למלא] לא נספר כי זה מקור
- הכפתור: brief.md › הפעולה האחת

שורת סמכות

כותרת עם “מירכאות מסולסלות”

(כפתור: שמרו לי מקום)
(תמונה: עידו עם כלב בפארק, אנכית, כדי שיראו טיול רגוע)

## 2. הבעיה

מצב: טיוטה
מקורות:

- customer-words.md #1

- רגע ראשון כבולט אחרי שורה ריקה — עם מקף ארוך
[למלא: כמה זמן נמשך הטיול]

## 6. הפתרון

מצב: אושר
מקורות:

- brief.md › מה הדף מציע

בשביל זה בניתי את "רצועה רפויה"
(כפתור: שמרו לי מקום)

## 8. בונוסים

מצב: הוסר

## 9. המלצות

מצב: לא נכתב
מקורות:

- [למלא]

[למלא]

## 13. טופס

מצב: אושר
מקורות:

- brief.md › מה קורה אחרי הטופס

| טקסט        | נוסח             |
| ----------- | ---------------- |
| כפתור שליחה | שמרו לי מקום ממש |

## [למלא] פתוחים

| סקשן | מה חסר | מה צריך |
| 2 | [למלא: זמן] | שאלה |
`;

test("parseCopy finds numbered sections, their state and only the copy lines", () => {
  const s = parseCopy(SAMPLE);
  assert.deepEqual(
    s.map((x) => [x.number, x.title, x.state]),
    [
      [1, "הירו", "אושר"],
      [2, "הבעיה", "טיוטה"],
      [6, "הפתרון", "אושר"],
      [8, "בונוסים", "הוסר"],
      [9, "המלצות", "לא נכתב"],
      [13, "טופס", "אושר"],
    ],
  );
  const hero = s[0].body.map((b) => b.text).filter(Boolean);
  assert.equal(hero[0], "שורת סמכות");
  assert.ok(
    !hero.some((t) => t.includes("customer-words")),
    "sources are not copy",
  );
  // a bullet after a blank line is copy, not a source
  assert.ok(s[1].body.some((b) => b.text.startsWith("- רגע ראשון")));
});

test("scanCopy lists buttons, media and todos of written sections only", () => {
  const r = scanCopy(SAMPLE);
  assert.deepEqual(
    r.buttons.map((b) => [b.section, b.text]),
    [
      [1, "שמרו לי מקום"],
      [6, "שמרו לי מקום"],
      [13, "שמרו לי מקום ממש"],
    ],
  );
  assert.equal(r.buttons[2].formSubmit, true);
  assert.deepEqual(r.buttonTexts, ["שמרו לי מקום", "שמרו לי מקום ממש"]);
  assert.deepEqual(r.media, [
    {
      section: 1,
      line: r.media[0].line,
      kind: "תמונה",
      text: "עידו עם כלב בפארק, אנכית, כדי שיראו טיול רגוע",
    },
  ]);
  // the [למלא] in sources, in the unwritten section 9 and in the closing table do not count
  assert.deepEqual(
    r.todos.map((t) => [t.section, t.text]),
    [[2, "כמה זמן נמשך הטיול"]],
  );
  assert.deepEqual(
    r.longDashes.map((d) => d.section),
    [2],
  );
  assert.deepEqual(
    r.curlyQuotes.map((d) => d.section),
    [1],
  );
});

test("scanCopy --name reports the first section where the product name appears", () => {
  assert.deepEqual(scanCopy(SAMPLE, { name: "רצועה רפויה" }).productName, {
    name: "רצועה רפויה",
    firstSection: 6,
  });
  assert.deepEqual(scanCopy(SAMPLE, { name: "לא קיים" }).productName, {
    name: "לא קיים",
    firstSection: null,
  });
});

test("the empty copy.md template has 13 unwritten sections and nothing to report", async () => {
  const r = scanCopy(await readFile(TEMPLATE, "utf8"));
  assert.equal(r.sections.length, 13);
  assert.ok(r.sections.every((s) => s.state === "לא נכתב"));
  assert.deepEqual(r.buttons, []);
  assert.deepEqual(r.todos, []);
  assert.deepEqual(r.media, []);
});

test("CLI prints JSON, and hebrew errors", async () => {
  const dir = await mkdtemp(join(tmpdir(), "copy-"));
  const f = join(dir, "copy.md");
  await writeFile(f, SAMPLE);
  const ok = spawnSync(process.execPath, [CLI, f, "--name", "רצועה", "רפויה"], {
    encoding: "utf8",
  });
  assert.equal(ok.status, 0, ok.stderr);
  const out = JSON.parse(ok.stdout);
  assert.equal(out.productName.firstSection, 6);
  assert.equal(out.buttons.length, 3);
  const none = spawnSync(process.execPath, [CLI], { encoding: "utf8" });
  assert.equal(none.status, 1);
  assert.match(none.stderr, /שימוש:/);
  const missing = spawnSync(process.execPath, [CLI, join(dir, "nope.md")], {
    encoding: "utf8",
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /לא הצלחתי לקרוא את הקובץ/);
});

test("the short version's form texts count, under ## טקסטי הטופס", () => {
  const r = scanCopy(`## 5. CTA מוקדם

מצב: אושר
מקורות:

- brief.md › הפעולה האחת

(כפתור: שלחו לי את הצ'קליסט)

## טקסטי הטופס

| טקסט        | נוסח                  |
| ----------- | --------------------- |
| כפתור שליחה | שלחו לי את הצ'קליסט  |
| מה קורה אחרי | [למלא: תוך כמה זמן מגיע המייל] |
`);
  assert.deepEqual(r.buttonTexts, ["שלחו לי את הצ'קליסט"]);
  assert.deepEqual(r.buttons.map((b) => b.section), [5, 0]);
  assert.deepEqual(r.todos.map((t) => [t.section, t.text]), [[0, "תוך כמה זמן מגיע המייל"]]);
});
