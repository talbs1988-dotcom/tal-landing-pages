import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  scaffoldBusiness,
  scaffoldPage,
  findBusinessRoot,
} from "../plugins/tal-landing-pages/scripts/scaffold.mjs";
import {
  syncBusiness,
  planSync,
  configFields,
  applyValues,
  parseBusinessMd,
  FIELDS,
} from "../plugins/tal-landing-pages/scripts/business-sync.mjs";

const PLUGIN = fileURLToPath(
  new URL("../plugins/tal-landing-pages/", import.meta.url),
);
const TEMPLATE_CONFIG = join(PLUGIN, "templates", "site", "site.config.ts");
const SCAFFOLD_CLI = join(PLUGIN, "scripts", "scaffold.mjs");

const FILLED = {
  "שם משפטי": 'דנה כהן בע"מ',
  "השם שהקהל מכיר": "הסטודיו של דנה",
  סוג: 'חברה בע"מ',
  "מספר עוסק / ח.פ.": "515-555-555",
  "רחוב ומספר": "הרצל 5",
  עיר: "תל אביב",
  מיקוד: "6100001",
  טלפון: "050-1234567",
  "מייל ליצירת קשר": "dana@example.co.il",
  "רכז/ת נגישות, שם": "דנה כהן",
  "רכז/ת נגישות, טלפון": "050-1234567",
  "רכז/ת נגישות, מייל": "dana@example.co.il",
  "מה העסק מוכר": "שירות",
  "מען להודעות ביטול והחזרות": "אין",
  "כלי אוטומציה שמקבל את הליד": "Make",
  "מערכת דיוור": "רב מסר",
  "CRM או טבלת לקוחות": "Monday",
  "כלי ניתוח תנועה": "אין",
  "כמה זמן שומרים פרטי לידים": "עד 24 חודשים מהפנייה האחרונה.",
  "תוך כמה זמן מטפלים בבקשת מחיקה": "30 ימים",
  "מוצרים או שירותים שאי אפשר לבטל": "אין",
  "רכיבים באתר שעוד לא נגישים": "אין",
  "נגישות במקום העסק": "יש חניה ומעלית",
};

const md = (values) =>
  [
    "# פרטי העסק",
    "",
    ...Object.entries(values).map(([k, v]) => `- ${k}: ${v}`),
    "",
  ].join("\n");

async function fixture(values) {
  const root = await mkdtemp(join(tmpdir(), "sync-"));
  await scaffoldBusiness(root, { businessName: "הסטודיו של דנה" });
  const page = await scaffoldPage(root, { pageName: "סדנה" });
  await mkdir(join(page, "site"), { recursive: true });
  await writeFile(
    join(page, "site", "site.config.ts"),
    await readFile(TEMPLATE_CONFIG, "utf8"),
  );
  if (values) await writeFile(join(root, "legal", "business.md"), md(values));
  return { root, page, config: join(page, "site", "site.config.ts") };
}

const valueOf = (text, path) => configFields(text).get(path)?.value;

test("the mapping table covers every string field of business and legal in the template", async () => {
  const fields = configFields(await readFile(TEMPLATE_CONFIG, "utf8"));
  const wanted = [...fields.keys()].filter((p) =>
    /^(business|legal)\./.test(p),
  );
  const mapped = FIELDS.map((f) => f.path).sort();
  assert.deepEqual(mapped, [...wanted].sort());
});

test("the business.md template has a line for every field in the table", async () => {
  const text = await readFile(join(PLUGIN, "templates", "business.md"), "utf8");
  const labels = parseBusinessMd(text);
  for (const f of FIELDS) assert.ok(labels.has(f.label), f.label);
});

test("sync fills every mapped field and reports nothing missing", async () => {
  const { page, config } = await fixture(FILLED);
  const out = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(out.missing, []);
  const text = await readFile(config, "utf8");
  assert.equal(valueOf(text, "business.legalName"), 'דנה כהן בע"מ');
  assert.equal(valueOf(text, "business.type"), 'חברה בע"מ');
  assert.equal(valueOf(text, "business.idNumber"), "515555555");
  assert.equal(valueOf(text, "business.address.city"), "תל אביב");
  assert.equal(valueOf(text, "legal.processors.mailing"), "רב מסר");
  assert.equal(
    valueOf(text, "legal.retention"),
    "עד 24 חודשים מהפנייה האחרונה",
  );
  assert.equal(valueOf(text, "legal.cancellationExceptions"), "אין");
  assert.equal(
    valueOf(text, "legal.accessibilityLimitations"),
    "לא ידוע לנו על רכיבים כאלה",
  );
  assert.ok(out.updated.some((u) => u.field === "business.email"));
  // a second run changes nothing
  const again = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(again.updated, []);
});

test("what the business sells maps to legal.offerType", () => {
  const template = readFileSync(TEMPLATE_CONFIG, "utf8");
  const cases = [
    ["שירות", "service"],
    ["ליווי אישי", "service"],
    ["מוצר", "product"],
    ["מוצרים פיזיים", "product"],
    ["גם וגם", "both"],
    ["מוצר וגם שירות", "both"],
  ];
  for (const [answer, expected] of cases) {
    const { values, missing } = planSync(
      md({ ...FILLED, "מה העסק מוכר": answer }),
      template,
    );
    assert.ok(!missing.some((m) => m.field === "legal.offerType"), answer);
    // "service" is already the template default, so it is not an update
    if (expected === "service") assert.equal(values.has("legal.offerType"), false, answer);
    else assert.equal(values.get("legal.offerType"), expected, answer);
  }
  const bad = planSync(md({ ...FILLED, "מה העסק מוכר": "לא יודעת" }), template);
  assert.match(
    bad.missing.find((m) => m.field === "legal.offerType")?.reason ?? "",
    /שירות, מוצר, גם וגם/,
  );
  const open = planSync(md({ ...FILLED, "מה העסק מוכר": "[שירות / מוצר / גם וגם]" }), template);
  assert.ok(open.missing.some((m) => m.field === "legal.offerType"), "placeholder is still missing");
});

test("sync does not touch the rest of the file", async () => {
  const { page, config } = await fixture(FILLED);
  const before = await readFile(config, "utf8");
  await syncBusiness(page, { findBusinessRoot });
  const after = await readFile(config, "utf8");
  const a = before.split("\n");
  const b = after.split("\n");
  assert.equal(a.length, b.length);
  const changed = a
    .map((l, i) => (l === b[i] ? null : i))
    .filter((i) => i !== null);
  const mappedLines = new Set(
    FIELDS.map((f) => configFields(before).get(f.path).line),
  );
  for (const i of changed)
    assert.ok(mappedLines.has(i), `שורה ${i + 1} השתנתה: ${b[i]}`);
  // the brand, page and form values are still TODO / the same
  for (const p of ["page.url", "form.submitLabel", "audience"])
    assert.equal(valueOf(after, p), null, p);
  assert.equal(valueOf(after, "brand.primary"), "#0F766E");
  assert.equal(valueOf(after, "collects.form"), true);
  // no temp files left
  const files = await readdir(join(page, "site"));
  assert.deepEqual(files, ["site.config.ts"]);
});

test("values with double quotes, geresh and backslash read back exactly", async () => {
  const tricky = {
    ...FILLED,
    "שם משפטי": 'צ\'יפס "הטובים" בע"מ',
    "השם שהקהל מכיר": "צ'יפס של דנה \\ הסניף",
    "רחוב ומספר": "רח' הגפן 3",
  };
  const { page, config } = await fixture(tricky);
  await syncBusiness(page, { findBusinessRoot });
  const text = await readFile(config, "utf8");
  assert.equal(valueOf(text, "business.legalName"), 'צ\'יפס "הטובים" בע"מ');
  assert.equal(valueOf(text, "business.displayName"), "צ'יפס של דנה \\ הסניף");
  assert.equal(valueOf(text, "business.address.street"), "רח' הגפן 3");
  // and the line is valid JS: evaluate the string literal back
  const line = text.split("\n")[configFields(text).get("business.legalName").line];
  const literal = line.replace(/^\s*legalName:\s*/, "").replace(/,\s*$/, "");
  assert.equal(new Function(`return ${literal}`)(), 'צ\'יפס "הטובים" בע"מ');
});

test('"אין" for the address writes "" and makes the notice address required', async () => {
  const values = { ...FILLED };
  delete values["רחוב ומספר"];
  delete values["עיר"];
  delete values["מיקוד"];
  values["כתובת"] = "אין";
  values["מען להודעות ביטול והחזרות"] = "[למלא]";
  values["נגישות במקום העסק"] = "[למלא]";
  const { page, config } = await fixture(values);
  const out = await syncBusiness(page, { findBusinessRoot });
  const text = await readFile(config, "utf8");
  for (const p of ["street", "city", "postalCode"])
    assert.equal(valueOf(text, `business.address.${p}`), "", p);
  assert.deepEqual(
    out.missing.map((m) => m.field),
    ["legal.noticeAddress"],
  );
  // hidden without an address, so it is cleared instead of staying TODO
  assert.equal(valueOf(text, "legal.physicalAccessibility"), "");
});

test('"אין" is refused for a required field, and an invalid type is explained', async () => {
  const { missing } = planSync(
    md({ ...FILLED, טלפון: "אין", סוג: "עצמאי" }),
    await readFile(TEMPLATE_CONFIG, "utf8"),
  );
  const byLabel = Object.fromEntries(missing.map((m) => [m.label, m.reason]));
  assert.match(byLabel["טלפון"], /חובה/);
  assert.match(byLabel["סוג"], /עוסק פטור/);
});

test("עוסק פטור is kept as is (it changes the VAT line)", () => {
  const { values } = planSync(
    md({ ...FILLED, סוג: "עוסק פטור" }),
    TEMPLATE_TEXT,
  );
  assert.equal(values.get("business.type"), "עוסק פטור");
});

test("placeholders and a missing line are reported, and the config stays TODO", async () => {
  const values = { ...FILLED, "שם משפטי": "[למלא]" };
  delete values["טלפון"];
  const { page, config } = await fixture(values);
  const out = await syncBusiness(page, { findBusinessRoot });
  const byField = Object.fromEntries(out.missing.map((m) => [m.field, m]));
  assert.ok(byField["business.legalName"]);
  assert.match(byField["business.phone"].reason, /השורה חסרה/);
  const text = await readFile(config, "utf8");
  assert.equal(valueOf(text, "business.legalName"), null);
});

test("a half address is not written", () => {
  const { missing, values } = planSync(
    md({ ...FILLED, "רחוב ומספר": "אין" }),
    TEMPLATE_TEXT,
  );
  assert.ok(missing.some((m) => m.field === "business.address.city"));
  assert.equal(values.has("business.address.city"), false);
});

test("applyValues refuses a path that is not in the file", () => {
  assert.throws(
    () => applyValues(TEMPLATE_TEXT, new Map([["business.nope", "x"]])),
    /לא נמצא/,
  );
});

test("CLI: sync-business prints JSON with updated and missing", async () => {
  const { page } = await fixture(FILLED);
  const r = spawnSync(process.execPath, [SCAFFOLD_CLI, "sync-business", page], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(out).sort(), ["missing", "texts", "updated"]);
  assert.ok(out.updated.length > 10);
});

test("CLI: a page without a site gets a Hebrew error", async () => {
  const root = await mkdtemp(join(tmpdir(), "sync-"));
  await scaffoldBusiness(root, { businessName: "א" });
  const page = await scaffoldPage(root, { pageName: "ב" });
  const r = spawnSync(process.execPath, [SCAFFOLD_CLI, "sync-business", page], {
    encoding: "utf8",
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /אין עדיין אתר בדף הזה/);
  assert.match(r.stderr, /\/page-design/);
});

const TEMPLATE_TEXT = await readFile(TEMPLATE_CONFIG, "utf8");

test("noticeAddress rejects an email address", async () => {
  const { FIELDS } = await import("../plugins/tal-landing-pages/scripts/business-sync.mjs");
  const f = FIELDS.find((x) => x.path === "legal.noticeAddress");
  assert.ok(f.check, "noticeAddress has a check");
  assert.ok(f.check("במייל rotem@example.com").reason);
  assert.equal(f.check('ת"ד 123, תל אביב').value, 'ת"ד 123, תל אביב');
});
// ---------------------------------------------------------------------------
// The legal texts: legal/texts/ of the business → site/content/legal/ of the page
// ---------------------------------------------------------------------------

import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import {
  syncLegalTexts,
  LEGAL_TEXT_FILES,
  LEGAL_TEXT_SLUGS,
} from "../plugins/tal-landing-pages/scripts/business-sync.mjs";

async function textsFixture(businessFiles = {}, siteFiles = {}) {
  const f = await fixture(FILLED);
  const texts = join(f.root, "legal", "texts");
  const site = join(f.page, "site", "content", "legal");
  await mkdir(texts, { recursive: true });
  await mkdir(site, { recursive: true });
  for (const [n, t] of Object.entries(businessFiles))
    await writeFile(join(texts, n), t);
  for (const [n, t] of Object.entries(siteFiles))
    await writeFile(join(site, n), t);
  return { ...f, texts, site };
}

test("legal texts: the 8 names, and the same slugs as the site template", async () => {
  assert.equal(LEGAL_TEXT_FILES.length, 8);
  const src = await readFile(
    join(PLUGIN, "templates", "site", "lib", "legalText.ts"),
    "utf8",
  );
  const m = /LEGAL_SLUGS\s*=\s*\[([^\]]*)\]/.exec(src);
  assert.ok(m, "LEGAL_SLUGS in lib/legalText.ts");
  const slugs = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.deepEqual(slugs, LEGAL_TEXT_SLUGS);
});

test("legal texts: a new business gets legal/texts/", async () => {
  const { root } = await fixture();
  assert.ok(existsSync(join(root, "legal", "texts")));
});

test("legal texts: sync copies the business's texts into the site", async () => {
  const { page, site } = await textsFixture({
    "terms.md": "## תקנון שלי\nטקסט",
    "privacy.additions.md": "## תוספת\nעוד",
  });
  const out = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(out.texts, {
    copied: ["terms.md", "privacy.additions.md"],
    removed: [],
  });
  assert.equal(
    await readFile(join(site, "terms.md"), "utf8"),
    "## תקנון שלי\nטקסט",
  );
  assert.equal(
    await readFile(join(site, "privacy.additions.md"), "utf8"),
    "## תוספת\nעוד",
  );
});

test("legal texts: the site folder is created when it is not there", async () => {
  const { page, site } = await textsFixture({ "accessibility.md": "## א\nב" });
  await rm(site, { recursive: true });
  const out = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(out.texts.copied, ["accessibility.md"]);
  assert.equal(
    await readFile(join(site, "accessibility.md"), "utf8"),
    "## א\nב",
  );
});

test("legal texts: a changed business text overwrites the site's copy, and an unchanged one is not reported", async () => {
  const { page, texts, site } = await textsFixture(
    { "terms.md": "## חדש\nנוסח חדש" },
    { "terms.md": "## ישן\nנוסח ישן" },
  );
  const out = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(out.texts.copied, ["terms.md"]);
  assert.equal(
    await readFile(join(site, "terms.md"), "utf8"),
    "## חדש\nנוסח חדש",
  );
  const again = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(again.texts, { copied: [], removed: [] });
  await writeFile(join(texts, "terms.md"), "## שלישי\nעוד שינוי");
  const third = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(third.texts.copied, ["terms.md"]);
  assert.equal(
    await readFile(join(site, "terms.md"), "utf8"),
    "## שלישי\nעוד שינוי",
  );
});

test("legal texts: a text that is no longer at the business is removed from the site", async () => {
  const { page, site } = await textsFixture(
    { "terms.md": "## נשאר\nא" },
    {
      "terms.md": "## נשאר\nא",
      "data-deletion.md": "## ישן\nב",
      "privacy.additions.md": "## ישן\nג",
    },
  );
  const out = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(out.texts, {
    copied: [],
    removed: ["privacy.additions.md", "data-deletion.md"],
  });
  assert.deepEqual(await readdir(site), ["terms.md"]);
});

test("legal texts: no legal/texts/ folder is not an error, and texts in the site are removed", async () => {
  const { page, texts, site } = await textsFixture(
    {},
    { "terms.md": "## ישן\nא" },
  );
  await rm(texts, { recursive: true });
  const out = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(out.texts, { copied: [], removed: ["terms.md"] });
  assert.deepEqual(await readdir(site), []);
});

test("legal texts: no texts anywhere → nothing copied, nothing removed, no folder created", async () => {
  const { page, site } = await textsFixture();
  await rm(site, { recursive: true });
  const out = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(out.texts, { copied: [], removed: [] });
  assert.equal(existsSync(site), false);
});

test("legal texts: other files on either side are not touched", async () => {
  const { page, site } = await textsFixture(
    {
      "notes.md": "הערות שלי",
      "terms.draft.md": "טיוטה",
    },
    { "README.md": "לא לגעת", "copy-extra.md": "גם לא" },
  );
  const out = await syncBusiness(page, { findBusinessRoot });
  assert.deepEqual(out.texts, { copied: [], removed: [] });
  assert.deepEqual((await readdir(site)).sort(), [
    "README.md",
    "copy-extra.md",
  ]);
  assert.equal(await readFile(join(site, "README.md"), "utf8"), "לא לגעת");
});

test("legal texts: syncLegalTexts works on its own, without business.md", async () => {
  const root = await mkdtemp(join(tmpdir(), "texts-"));
  await mkdir(join(root, "biz", "legal", "texts"), { recursive: true });
  await writeFile(join(root, "biz", "legal", "texts", "privacy.md"), "## א\nב");
  const out = await syncLegalTexts(join(root, "biz"), join(root, "site"));
  assert.deepEqual(out, { copied: ["privacy.md"], removed: [] });
  assert.equal(
    await readFile(
      join(root, "site", "content", "legal", "privacy.md"),
      "utf8",
    ),
    "## א\nב",
  );
});

test("CLI: sync-business prints the texts it copied", async () => {
  const { page } = await textsFixture({ "terms.additions.md": "## תוספת\nא" });
  const r = spawnSync(process.execPath, [SCAFFOLD_CLI, "sync-business", page], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).texts, {
    copied: ["terms.additions.md"],
    removed: [],
  });
});

test("legal texts: content/legal/ and its files are not excluded from the site", async () => {
  const { isExcludedFromSite } = await import("../plugins/tal-landing-pages/scripts/scaffold.mjs");
  for (const name of ["content", "legal", ...LEGAL_TEXT_FILES])
    assert.equal(isExcludedFromSite(name), false, name);
  const ignore = await readFile(join(PLUGIN, "templates", "site", ".vercelignore"), "utf8");
  for (const line of ignore.split("\n").filter((l) => l.trim() && !l.startsWith("#")))
    assert.doesNotMatch(line, /content|legal|\.md\b|^\*$/, line);
});
