import { afterEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkCopyJson,
  checkCopyMd,
  checkCtas,
  checkImages,
  checkPageUrl,
  checkTodos,
  configValue,
  copyVariation,
  runChecks,
} from "../scripts/check-page.mjs";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const CONFIG = readFileSync(join(SITE, "site.config.ts"), "utf8");
// הסורק של הפלאגין, שלוש תיקיות מעל התבנית (בתוך הפלאגין עצמו)
const COPY_SCAN = join(SITE, "..", "..", "scripts", "copy-scan.mjs");

const dirs: string[] = [];
function fixture(files: Record<string, string | Buffer>): string {
  const root = mkdtempSync(join(tmpdir(), "check-"));
  dirs.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, body);
  }
  return root;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

const withUrl = (url: string) =>
  CONFIG.replace(/^(\s*url:\s*)TODO,/m, `$1${JSON.stringify(url)},`);

describe("configValue", () => {
  it("קורא ערך מתוך סקשן, ו-TODO הוא null", () => {
    expect(configValue(CONFIG, "page", "url")).toBeNull();
    expect(configValue(CONFIG, "brand", "primary")).toBe("#0F766E");
    expect(configValue(withUrl("https://a.co.il"), "page", "url")).toBe(
      "https://a.co.il",
    );
  });
});

describe("page.url", () => {
  it("TODO ← לא נבדק עדיין (נקבע ב-/page-live), לא נכשל", () => {
    const r = checkPageUrl(CONFIG);
    expect(r.ok).toBeNull();
    expect(r.required).toBe(false);
  });
  it("כתובת בלי https ← נכשל, וזו בדיקת חובה", () => {
    const r = checkPageUrl(withUrl("example.co.il"));
    expect(r.ok).toBe(false);
    expect(r.required).toBe(true);
  });
  it("https מלא ← עבר", () => {
    expect(checkPageUrl(withUrl("https://lp.dana.co.il")).ok).toBe(true);
  });
});

describe("check:todo", () => {
  it("לא סופר את page.url שעוד TODO, אבל כן סופר כל השאר", () => {
    const only = CONFIG.replace(/TODO/g, '"x"').replace(
      /^(\s*url:\s*)"x",/m,
      "$1TODO,",
    );
    const root = fixture({ "site.config.ts": only });
    expect(checkTodos(root).ok).toBe(true);
    const root2 = fixture({
      "site.config.ts": only,
      "content/copy.json": '{"hero.title":"[למלא]"}',
    });
    const r = checkTodos(root2);
    expect(r.ok).toBe(false);
    expect(r.items[0]).toMatch(/content\/copy.json:1/);
  });
});

describe("תמונות", () => {
  it("הירו עד 200KB, שאר התמונות עד 100KB, ו-jpg לא עובר", () => {
    const root = fixture({
      "hero-dana.webp": Buffer.alloc(150_000),
      "small.webp": Buffer.alloc(40_000),
      "big.webp": Buffer.alloc(120_000),
      "raw.jpg": Buffer.alloc(10_000),
      ".gitkeep": "",
    });
    const r = checkImages(root);
    expect(r.ok).toBe(false);
    expect(r.items.join("\n")).toMatch(/big.webp: 120KB/);
    expect(r.items.join("\n")).toMatch(/raw.jpg/);
    expect(r.items.join("\n")).not.toMatch(/hero-dana|small/);
  });
  it("תיקייה ריקה עוברת", () => {
    expect(checkImages(fixture({ ".gitkeep": "" })).ok).toBe(true);
  });
});

describe("copy.json", () => {
  it("מוצא נקודה בכותרת, מקף ארוך, מירכאות מסולסלות ודפוסי AI", () => {
    const r = checkCopyJson({
      "hero.title": "הסדנה שתשנה לך את העסק.",
      "hero.subtitle": "משפט רגיל. עם נקודה.",
      "pain.body1": "זה מהווה בעיה — גדולה",
      "pain.body2": "“ציטוט”",
      "offer.body1": "בנוסף, יש בונוס",
      "hero.cta": "שלח",
    });
    const all = r.items.join("\n");
    expect(r.ok).toBe(false);
    expect(all).toMatch(/hero.title: נקודה/);
    expect(all).not.toMatch(/hero.subtitle/);
    expect(all).toMatch(/pain.body1: מקף ארוך/);
    expect(all).toMatch(/"מהווה"/);
    expect(all).toMatch(/pain.body2: מירכאות/);
    expect(all).toMatch(/offer.body1: "בנוסף"/);
    expect(all).toMatch(/hero.cta: כפתור ריק/);
  });
  it("ביטוי שרשום ב-voice.md הוא הקול של בעל העסק, לא דפוס", () => {
    const r = checkCopyJson(
      { "a.body": "בשורה התחתונה, זה עובד" },
      "אני תמיד אומרת: בשורה התחתונה",
    );
    expect(r.ok).toBe(true);
  });
  it("שלוש נקודות בסוף כותרת מותרות", () => {
    expect(checkCopyJson({ "hero.title": "ואז זה קרה..." }).ok).toBe(true);
  });
});

describe("כפתורים", () => {
  const md = "| וריאציה לכפתור האחרון | שמרו לי מקום אחרון |\n";
  it("כל ה-cta זהים לכפתור השליחה ← עבר", () => {
    const r = checkCtas(
      { "hero.cta": "שמרו לי מקום", "offer.cta": "שמרו לי מקום" },
      { submitLabel: "שמרו לי מקום" },
    );
    expect(r.ok).toBe(true);
  });
  it("הווריאציה מ-copy.md מותרת, טקסט אחר לא", () => {
    const variation = copyVariation(md);
    expect(variation).toBe("שמרו לי מקום אחרון");
    const ok = checkCtas(
      { "hero.cta": "שמרו לי מקום", "final.cta": "שמרו לי מקום אחרון" },
      { submitLabel: "שמרו לי מקום", variation },
    );
    expect(ok.ok).toBe(true);
    const bad = checkCtas(
      { "hero.cta": "שמרו לי מקום", "final.cta": "הרשמו עכשיו" },
      { submitLabel: "שמרו לי מקום", variation },
    );
    expect(bad.ok).toBe(false);
    expect(bad.items[0]).toMatch(/final.cta/);
  });
  it("כפתור שלא מולא או כפתור שליחה חסר ← נכשל", () => {
    expect(checkCtas({ "hero.cta": "[למלא]" }, { submitLabel: "x" }).ok).toBe(
      false,
    );
    expect(checkCtas({ "hero.cta": "א" }, { submitLabel: null }).ok).toBe(
      false,
    );
    expect(
      copyVariation('| וריאציה לכפתור האחרון | [למלא, או "אין"] |'),
    ).toBeNull();
  });
});

describe("copy-scan מהפלאגין", () => {
  const good = [
    "| וריאציה לכפתור האחרון | אין |",
    "## המבנה",
    "",
    "מצב: אושר",
    "",
    "## 1. הירו",
    "",
    "מצב: אושר",
    "מקורות:",
    "",
    "- הכאב: brief",
    "",
    "כותרת",
    "",
    "(כפתור: שמרו לי מקום)",
    "",
  ].join("\n");
  it("בלי נתיב לסורק ← לא נבדק, לא עבר", async () => {
    const r = await checkCopyMd("/nope/copy.md", undefined);
    expect(r.ok).toBeNull();
  });
  // הסורק יושב בפלאגין. בעותק של התבנית בתוך דף הוא לא שם, אז הבדיקה מדלגת
  it.skipIf(!existsSync(COPY_SCAN))("copy.md מאושר ← עבר. סקשן בטיוטה או מקף ארוך ← נכשל", async () => {
    const root = fixture({
      "good.md": good,
      "bad.md": good
        .replace("מצב: אושר\nמקורות", "מצב: טיוטה\nמקורות")
        .replace("כותרת", "כותרת — ארוכה"),
    });
    expect((await checkCopyMd(join(root, "good.md"), COPY_SCAN)).ok).toBe(true);
    const bad = await checkCopyMd(join(root, "bad.md"), COPY_SCAN);
    expect(bad.ok).toBe(false);
    expect((bad.items ?? []).join("\n")).toMatch(/טיוטה/);
    expect((bad.items ?? []).join("\n")).toMatch(/מקף ארוך/);
  });
});

describe("runChecks", () => {
  it("מחזיר JSON עם name, ok ו-details לכל בדיקה, ו-ok כללי false כשחובה נכשלה", async () => {
    const root = fixture({
      "site.config.ts": CONFIG,
      "content/copy.json": '{"hero.cta":"[למלא]"}',
    });
    const r = await runChecks(root, { skip: ["build", "tests"] });
    expect(r.ok).toBe(false);
    const names = r.checks.map((c: { name: string }) => c.name);
    expect(names).toEqual([
      "check:todo",
      "page.url",
      "images",
      "copy.json",
      "cta",
      "copy-scan",
      "tests",
      "build",
    ]);
    for (const c of r.checks) {
      expect(c).toHaveProperty("ok");
      expect(typeof c.details).toBe("string");
    }
    expect(
      r.checks.find((c: { name: string }) => c.name === "build")?.ok,
    ).toBeNull();
  });
});
