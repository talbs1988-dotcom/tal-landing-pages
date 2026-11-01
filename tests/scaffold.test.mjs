import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  scaffoldBusiness,
  scaffoldPage,
  isBusinessRoot,
  pageSlug,
  BUSINESS_DIRS,
  PAGE_DIRS,
} from "../plugins/tal-landing-pages/scripts/scaffold.mjs";
import { readStatus } from "../plugins/tal-landing-pages/scripts/status.mjs";

const tmp = () => mkdtemp(join(tmpdir(), "biz-"));
const isDir = async (p) => (await stat(p)).isDirectory();

test("scaffoldBusiness creates all dirs and filled templates", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "הסטודיו של דנה" });
  for (const d of BUSINESS_DIRS) assert.ok(await isDir(join(root, d)), d);
  const claude = await readFile(join(root, "CLAUDE.md"), "utf8");
  assert.match(claude, /# הסטודיו של דנה/);
  assert.doesNotMatch(claude, /\{\{/);
  assert.equal(await isBusinessRoot(root), true);
});

test("scaffoldBusiness never overwrites files the owner already filled", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  await writeFile(join(root, "brand", "brand.md"), "צבע ראשי: בורדו");
  await scaffoldBusiness(root, { businessName: "א" });
  assert.equal(
    await readFile(join(root, "brand", "brand.md"), "utf8"),
    "צבע ראשי: בורדו",
  );
});

test("isBusinessRoot is false for a random folder", async () => {
  assert.equal(await isBusinessRoot(await tmp()), false);
});

test("scaffoldPage numbers pages and creates every stage folder", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  const first = await scaffoldPage(root, { pageName: "סדנת גיוס" });
  const second = await scaffoldPage(root, { pageName: "מדריך חינמי" });
  assert.match(first, /landing-pages[/\\]01-סדנת-גיוס$/);
  assert.match(second, /landing-pages[/\\]02-מדריך-חינמי$/);
  for (const d of PAGE_DIRS) assert.ok(await isDir(join(first, d)), d);
  assert.equal((await readStatus(first)).pageName, "סדנת גיוס");
});

test("scaffoldPage refuses when the folder is not a business root", async () => {
  await assert.rejects(
    scaffoldPage(await tmp(), { pageName: "א" }),
    /זו לא תיקיית עסק/,
  );
});

test("pageSlug removes characters that break paths", () => {
  assert.equal(pageSlug('  סדנה: "גיוס" / 2026 '), "סדנה-גיוס-2026");
});

// ---- review fixes ----
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findBusinessRoot } from "../plugins/tal-landing-pages/scripts/scaffold.mjs";
import {
  listPages,
  initStatus,
} from "../plugins/tal-landing-pages/scripts/status.mjs";

const SCAFFOLD_CLI = fileURLToPath(
  new URL(  "../plugins/tal-landing-pages/scripts/scaffold.mjs", import.meta.url),
);
const MARKER = "<!-- tal-landing-pages:business -->";
const count = (text, sub) => text.split(sub).length - 1;

test("existing CLAUDE.md without the marker is kept and gets the marker", async () => {
  const root = await tmp();
  const original = "# הערות שלי\n\nלא לגעת בשורה הזו.\n";
  await writeFile(join(root, "CLAUDE.md"), original);
  await scaffoldBusiness(root, { businessName: "הסטודיו של דנה" });
  const after = await readFile(join(root, "CLAUDE.md"), "utf8");
  assert.equal(await isBusinessRoot(root), true);
  assert.ok(after.startsWith(MARKER + "\n\n" + original), after);
  assert.equal(count(after, MARKER), 1);
  assert.match(after, /\n---\n/);
  assert.match(after, /## העסק/);
  assert.doesNotMatch(after, /# הסטודיו של דנה/);
  assert.doesNotMatch(after, /\{\{/);
});

test("scaffoldBusiness twice on a pre-existing CLAUDE.md does not duplicate", async () => {
  const root = await tmp();
  await writeFile(join(root, "CLAUDE.md"), "טקסט משלי");
  await scaffoldBusiness(root, { businessName: "א" });
  const once = await readFile(join(root, "CLAUDE.md"), "utf8");
  await scaffoldBusiness(root, { businessName: "א" });
  const twice = await readFile(join(root, "CLAUDE.md"), "utf8");
  assert.equal(twice, once);
  assert.equal(count(twice, "## העסק"), 1);
  assert.equal(count(twice, "טקסט משלי"), 1);
});

test("findBusinessRoot walks up from the root and from deep inside a page", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  const page = await scaffoldPage(root, { pageName: "x" });
  assert.equal(await findBusinessRoot(root), resolve(root));
  assert.equal(await findBusinessRoot(join(page, "2-copy")), resolve(root));
});

test("findBusinessRoot returns null for an unrelated folder", async () => {
  assert.equal(await findBusinessRoot(await tmp()), null);
});

test("scaffoldBusiness refuses to nest inside another business folder", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  await assert.rejects(
    scaffoldBusiness(join(root, "landing-pages", "עוד-עסק"), {
      businessName: "ב",
    }),
    /כבר יש תיקיית עסק מעל התיקייה הזו: /,
  );
});

test("empty business name and empty page name are rejected", async () => {
  const root = await tmp();
  await assert.rejects(scaffoldBusiness(root, { businessName: "  " }), /חסר שם לעסק/);
  await assert.rejects(scaffoldBusiness(root, {}), /חסר שם לעסק/);
  await scaffoldBusiness(root, { businessName: "א" });
  await assert.rejects(scaffoldPage(root, { pageName: " \t " }), /חסר שם לדף/);
});

test("a page name that slugs to nothing gets the slug דף", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  const dir = await scaffoldPage(root, { pageName: "???" });
  assert.match(dir, /landing-pages[/\\]01-דף$/);
  assert.equal((await readStatus(dir)).pageName, "???");
});

test("page numbering uses the full number and ignores files and other folders", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  const lp = join(root, "landing-pages");
  await writeFile(join(lp, "05-notes.txt"), "x");
  await mkdir(join(lp, "ישן"));
  const first = await scaffoldPage(root, { pageName: "ראשון" });
  assert.match(first, /landing-pages[/\\]01-ראשון$/);
  await mkdir(join(lp, "99-z"));
  await initStatus(join(lp, "99-z"), { pageName: "z" });
  const next = await scaffoldPage(root, { pageName: "הבא" });
  assert.match(next, /landing-pages[/\\]100-הבא$/);
});

test("scaffoldPage refuses to reuse a target that already exists", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  await writeFile(join(root, "landing-pages", "01-א"), "קובץ ולא תיקייה");
  await assert.rejects(scaffoldPage(root, { pageName: "א" }), /כבר קיימת/);
});

test("listPages lists real pages only, sorted, with the next stage", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  const page = await scaffoldPage(root, { pageName: "סדנת גיוס" });
  await mkdir(join(root, "landing-pages", "גיבוי"));
  const pages = await listPages(root);
  assert.equal(pages.length, 1);
  assert.deepEqual(pages[0], {
    dir: page,
    folder: "01-סדנת-גיוס",
    pageName: "סדנת גיוס",
    next: { id: "start", label: "0. הכנה", command: "/page-start" },
  });
});

test("listPages on a business with no landing-pages folder returns []", async () => {
  assert.deepEqual(await listPages(await tmp()), []);
});

test("CLI find-root prints the root, or exits 2 with a hebrew message", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  const page = await scaffoldPage(root, { pageName: "x" });
  const ok = spawnSync(process.execPath, [SCAFFOLD_CLI, "find-root", join(page, "site")], {
    encoding: "utf8",
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout.trim(), resolve(root));
  const lone = await tmp();
  const no = spawnSync(process.execPath, [SCAFFOLD_CLI, "find-root", lone], {
    encoding: "utf8",
  });
  assert.equal(no.status, 2);
  assert.equal(no.stdout, "");
  assert.match(no.stderr, new RegExp(`לא נמצאה תיקיית עסק מעל ${lone}`));
});

test("CLI scaffold with a missing folder prints hebrew usage and exits 1", () => {
  for (const args of [["business"], ["page"], ["is-business"], ["find-root"], []]) {
    const r = spawnSync(process.execPath, [SCAFFOLD_CLI, ...args], { encoding: "utf8" });
    assert.equal(r.status, 1, args.join(" "));
    assert.match(r.stderr, /שימוש:/, args.join(" "));
    assert.doesNotMatch(r.stderr, /TypeError|ERR_|at /);
  }
});

test("CLI page accepts a name with quotes as one argument", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: 'דנה בע"מ' });
  const r = spawnSync(process.execPath, [SCAFFOLD_CLI, "page", root, "צ'יפס"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout.trim(), /landing-pages[/\\]01-צ'יפס$/);
});

// ---- review round 2 ----
import { findBusinessRootsBelow, assertNotHomeFolder } from "../plugins/tal-landing-pages/scripts/scaffold.mjs";

test("findBusinessRootsBelow finds business folders one level down only", async () => {
  const top = await tmp();
  await scaffoldBusiness(join(top, "הסטודיו"), { businessName: "הסטודיו" });
  await scaffoldBusiness(join(top, "עסק ב"), { businessName: "ב" });
  await mkdir(join(top, "סתם תיקייה"));
  await writeFile(join(top, "קובץ.txt"), "x");
  await scaffoldBusiness(join(top, "עמוק", "עוד", "ג"), { businessName: "ג" });
  assert.deepEqual(await findBusinessRootsBelow(top), [
    resolve(top, "הסטודיו"),
    resolve(top, "עסק ב"),
  ]);
});

test("findBusinessRootsBelow returns [] when nothing is there or the folder is missing", async () => {
  const top = await tmp();
  assert.deepEqual(await findBusinessRootsBelow(top), []);
  assert.deepEqual(await findBusinessRootsBelow(join(top, "אין")), []);
});

test("CLI find-below prints a JSON array and exits 0", async () => {
  const top = await tmp();
  const empty = spawnSync(process.execPath, [SCAFFOLD_CLI, "find-below", top], { encoding: "utf8" });
  assert.equal(empty.status, 0, empty.stderr);
  assert.deepEqual(JSON.parse(empty.stdout), []);
  await scaffoldBusiness(join(top, "הסטודיו"), { businessName: "הסטודיו" });
  const one = spawnSync(process.execPath, [SCAFFOLD_CLI, "find-below", top], { encoding: "utf8" });
  assert.equal(one.status, 0, one.stderr);
  assert.deepEqual(JSON.parse(one.stdout), [resolve(top, "הסטודיו")]);
  const usage = spawnSync(process.execPath, [SCAFFOLD_CLI, "find-below"], { encoding: "utf8" });
  assert.equal(usage.status, 1);
  assert.match(usage.stderr, /שימוש:/);
});

test("page numbering ignores numbered folders that are not pages", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  await mkdir(join(root, "landing-pages", "2026-backup"));
  const dir = await scaffoldPage(root, { pageName: "דף" });
  assert.match(dir, /landing-pages[/\\]01-דף$/);
});

test("the business name survives in CLAUDE.md, also when merged into an existing one", async () => {
  const fresh = await tmp();
  await scaffoldBusiness(fresh, { businessName: "הסטודיו של דנה" });
  assert.match(await readFile(join(fresh, "CLAUDE.md"), "utf8"), /## העסק\n\n- שם העסק: הסטודיו של דנה\n/);
  const merged = await tmp();
  await writeFile(join(merged, "CLAUDE.md"), "טקסט משלי\n");
  await scaffoldBusiness(merged, { businessName: "הסטודיו של דנה" });
  assert.match(await readFile(join(merged, "CLAUDE.md"), "utf8"), /- שם העסק: הסטודיו של דנה/);
});

test("assertNotHomeFolder refuses home, Desktop, Documents and Downloads", async () => {
  const home = await tmp();
  for (const p of [home, join(home, "Desktop"), join(home, "Documents"), join(home, "Downloads"), join(home, "Desktop") + "/"]) {
    assert.throws(() => assertNotHomeFolder(p, home), /לא יוצרים תיקיית עסק ישירות ב/, p);
  }
  for (const p of [join(home, "Desktop", "הסטודיו"), join(home, "Projects"), await tmp()]) {
    assert.doesNotThrow(() => assertNotHomeFolder(p, home), p);
  }
});

test("scaffoldBusiness checks the home rule before writing anything", async () => {
  const home = await tmp();
  await assert.rejects(
    scaffoldBusiness(join(home, "Desktop"), { businessName: "א", home }),
    /תיקייה בשם העסק/,
  );
  await assert.rejects(stat(join(home, "Desktop", "CLAUDE.md")));
  await assert.rejects(stat(join(home, "Desktop", "landing-pages")));
});

test("listPages flags a page with a corrupt or null status instead of crashing", async () => {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "א" });
  const good = await scaffoldPage(root, { pageName: "טוב" });
  for (const [folder, text] of [["02-שבור", "{ לא json"], ["03-ריק", "null"]]) {
    await mkdir(join(root, "landing-pages", folder, ".page"), { recursive: true });
    await writeFile(join(root, "landing-pages", folder, ".page", "status.json"), text);
  }
  const pages = await listPages(root);
  assert.equal(pages.length, 3);
  assert.equal(pages[0].dir, good);
  assert.equal(pages[0].error, undefined);
  for (const p of pages.slice(1)) {
    assert.equal(p.next, null);
    assert.match(p.error, /פגום/);
  }
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../plugins/tal-landing-pages/scripts/status.mjs", import.meta.url)), "list", root], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).length, 3);
});

// ---- scaffoldSite ----
import { scaffoldSite } from "../plugins/tal-landing-pages/scripts/scaffold.mjs";
import { cp, readdir } from "node:fs/promises";

const REAL_TEMPLATE = fileURLToPath(
  new URL("../plugins/tal-landing-pages/templates/site", import.meta.url),
);
const fileExists = (p) => stat(p).then(() => true, () => false);

async function pageFixture() {
  const root = await tmp();
  await scaffoldBusiness(root, { businessName: "בדיקה" });
  return scaffoldPage(root, { pageName: "דף" });
}

test("scaffoldSite copies the template into <page>/site", async () => {
  const page = await pageFixture();
  const site = await scaffoldSite(page);
  assert.equal(site, join(page, "site"));
  for (const f of ["package.json", "site.config.ts", "app/layout.tsx", ".env.example", "scripts/check-todo.mjs"])
    assert.ok(await fileExists(join(site, f)), f);
});

test("scaffoldSite leaves out node_modules, build output, env files and junk", async () => {
  const tpl = join(await tmp(), "site");
  await cp(REAL_TEMPLATE, tpl, {
    recursive: true,
    filter: (s) => !s.split("/").includes("node_modules"),
  });
  const planted = [
    "node_modules/x/index.js", ".next/cache/a", ".vercel/project.json",
    ".env", ".env.local", ".env.production", "next-env.d.ts",
    "tsconfig.tsbuildinfo", ".DS_Store", "app/.DS_Store",
  ];
  for (const f of planted) {
    await mkdir(dirname(join(tpl, f)), { recursive: true });
    await writeFile(join(tpl, f), "x");
  }
  const page = await pageFixture();
  const site = await scaffoldSite(page, { templateDir: tpl });
  for (const f of planted) assert.equal(await fileExists(join(site, f)), false, f);
  assert.ok(await fileExists(join(site, ".env.example")));
  assert.ok(await fileExists(join(site, "package.json")));
});

test("scaffoldSite refuses a non-empty site folder and writes nothing", async () => {
  const page = await pageFixture();
  await writeFile(join(page, "site", "mine.txt"), "שלי");
  await assert.rejects(() => scaffoldSite(page), /לא ריקה/);
  assert.deepEqual(await readdir(join(page, "site")), ["mine.txt"]);
  assert.equal(await readFile(join(page, "site", "mine.txt"), "utf8"), "שלי");
});

test("scaffoldSite treats a lone .gitkeep as empty", async () => {
  const page = await pageFixture();
  await writeFile(join(page, "site", ".gitkeep"), "");
  const site = await scaffoldSite(page);
  assert.ok(await fileExists(join(site, "package.json")));
  await assert.rejects(() => scaffoldSite(page), /לא ריקה/);
});

test("scaffoldSite refuses a folder that is not a page", async () => {
  const dir = await tmp();
  await assert.rejects(() => scaffoldSite(dir), /לא תיקיית דף/);
  assert.equal(await fileExists(join(dir, "site")), false);
});

// ---- stage-files ----
import { scaffoldStageFiles, STAGE_FILES } from "../plugins/tal-landing-pages/scripts/scaffold.mjs";

test("STAGE_FILES lists the template files of brief, copy, design and check", () => {
  for (const id of ["brief", "copy", "design", "check"]) assert.ok(Object.hasOwn(STAGE_FILES, id), id);
  assert.deepEqual(STAGE_FILES.check, [["report.md", "4-checks/report.md"]]);
  assert.ok(STAGE_FILES.brief.length > 0);
  assert.deepEqual(STAGE_FILES.copy, [
    ["copy.md", "2-copy/copy.md"],
    ["images-list.md", "2-copy/images-list.md"],
  ]);
  assert.deepEqual(STAGE_FILES.design, [
    ["design.md", "3-design/design.md"],
    ["references.md", "3-design/references.md"],
  ]);
});

test("every stage template exists and has no placeholder other than {{pageName}}", async () => {
  const templates = join(dirname(fileURLToPath(import.meta.url)), "..", "plugins", "tal-landing-pages", "templates");
  for (const [stage, files] of Object.entries(STAGE_FILES))
    for (const [tpl] of files) {
      const text = await readFile(join(templates, tpl), "utf8");
      const vars = [...text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1]);
      assert.deepEqual(vars.filter((v) => v !== "pageName"), [], `${stage}: ${tpl}`);
    }
});

test("stage-files copy creates copy.md and images-list.md with the page name", async () => {
  const page = await pageFixture();
  const r = await scaffoldStageFiles(page, "copy");
  assert.deepEqual(r.created, [
    join(page, "2-copy", "copy.md"),
    join(page, "2-copy", "images-list.md"),
  ]);
  assert.deepEqual(r.skipped, []);
  const { pageName } = await readStatus(page);
  for (const p of r.created) {
    const text = await readFile(p, "utf8");
    assert.doesNotMatch(text, /\{\{/, p);
    assert.ok(text.includes(pageName), p);
  }
  const copy = await readFile(join(page, "2-copy", "copy.md"), "utf8");
  assert.match(copy, /^# הקופי של /);
  assert.match(copy, /## 1\. הירו/);
  assert.match(copy, /## 13\. טופס/);
  assert.match(copy, /## סקשנים שהוסרו/);
  const images = await readFile(join(page, "2-copy", "images-list.md"), "utf8");
  assert.match(images, /^# התמונות של /);
});

test("stage-files copy keeps a half-written copy.md and only adds what is missing", async () => {
  const page = await pageFixture();
  await writeFile(join(page, "2-copy", "copy.md"), "## 1. הירו\n\nמצב: אושר\n");
  const r = await scaffoldStageFiles(page, "copy");
  assert.deepEqual(r.skipped, [join(page, "2-copy", "copy.md")]);
  assert.deepEqual(r.created, [join(page, "2-copy", "images-list.md")]);
  assert.equal(await readFile(join(page, "2-copy", "copy.md"), "utf8"), "## 1. הירו\n\nמצב: אושר\n");
});

test("stage-files design creates design.md and references.md", async () => {
  const page = await pageFixture();
  const r = await scaffoldStageFiles(page, "design");
  assert.deepEqual(r.created, [
    join(page, "3-design", "design.md"),
    join(page, "3-design", "references.md"),
  ]);
  const design = await readFile(join(page, "3-design", "design.md"), "utf8");
  assert.match(design, /# החלטות העיצוב/);
  assert.doesNotMatch(design, /\{\{/);
  const refs = await readFile(join(page, "3-design", "references.md"), "utf8");
  assert.match(refs, /# רפרנסים/);
  assert.doesNotMatch(refs, /\{\{/);
  const again = await scaffoldStageFiles(page, "design");
  assert.deepEqual(again.created, []);
  assert.equal(again.skipped.length, 2);
});

test("stage-files brief creates brief.md and customer-words.md with the page name", async () => {
  const page = await pageFixture();
  const r = await scaffoldStageFiles(page, "brief");
  assert.deepEqual(r.created, [
    join(page, "1-brief", "brief.md"),
    join(page, "1-brief", "customer-words.md"),
  ]);
  assert.deepEqual(r.skipped, []);
  const brief = await readFile(join(page, "1-brief", "brief.md"), "utf8");
  assert.match(brief, /# האפיון של דף/);
  assert.match(brief, /\[למלא\]/);
  assert.doesNotMatch(brief, /\{\{/);
  const words = await readFile(join(page, "1-brief", "customer-words.md"), "utf8");
  assert.doesNotMatch(words, /\{\{/);
});

test("stage-files never overwrites a file that is already there", async () => {
  const page = await pageFixture();
  await writeFile(join(page, "1-brief", "brief.md"), "שלי");
  const r = await scaffoldStageFiles(page, "brief");
  assert.deepEqual(r.skipped, [join(page, "1-brief", "brief.md")]);
  assert.deepEqual(r.created, [join(page, "1-brief", "customer-words.md")]);
  assert.equal(await readFile(join(page, "1-brief", "brief.md"), "utf8"), "שלי");
  const again = await scaffoldStageFiles(page, "brief");
  assert.deepEqual(again.created, []);
  assert.equal(again.skipped.length, 2);
});

test("stage-files recreates a missing stage folder", async () => {
  const page = await pageFixture();
  const { rm } = await import("node:fs/promises");
  await rm(join(page, "1-brief"), { recursive: true });
  const r = await scaffoldStageFiles(page, "brief");
  assert.equal(r.created.length, 2);
});

test("stage-files rejects an unknown stage in hebrew", async () => {
  const page = await pageFixture();
  for (const id of ["nope", "start", "toString", "__proto__"])
    await assert.rejects(() => scaffoldStageFiles(page, id), /שלב לא מוכר: .*אפשר: brief, copy, design/, id);
});

test("stage-files refuses a folder that is not a page", async () => {
  const dir = await tmp();
  await assert.rejects(() => scaffoldStageFiles(dir, "brief"), /זו לא תיקיית דף/);
  assert.equal(await fileExists(join(dir, "1-brief")), false);
});

test("CLI stage-files prints created/skipped JSON, and hebrew errors", async () => {
  const page = await pageFixture();
  const ok = spawnSync(process.execPath, [SCAFFOLD_CLI, "stage-files", page, "brief"], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  const out = JSON.parse(ok.stdout);
  assert.equal(out.created.length, 2);
  assert.deepEqual(out.skipped, []);
  const twice = JSON.parse(
    spawnSync(process.execPath, [SCAFFOLD_CLI, "stage-files", page, "brief"], { encoding: "utf8" }).stdout,
  );
  assert.equal(twice.skipped.length, 2);
  const bad = spawnSync(process.execPath, [SCAFFOLD_CLI, "stage-files", page, "nope"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /שלב לא מוכר: nope/);
  const notPage = spawnSync(process.execPath, [SCAFFOLD_CLI, "stage-files", await tmp(), "brief"], { encoding: "utf8" });
  assert.equal(notPage.status, 1);
  assert.match(notPage.stderr, /זו לא תיקיית דף/);
  const noStage = spawnSync(process.execPath, [SCAFFOLD_CLI, "stage-files", page], { encoding: "utf8" });
  assert.equal(noStage.status, 1);
  assert.match(noStage.stderr, /שימוש:/);
});

import { isExcludedFromSite } from "../plugins/tal-landing-pages/scripts/scaffold.mjs";

test("isExcludedFromSite: backups (.bak) never get copied into a page's site/", () => {
  assert.equal(isExcludedFromSite("consent.ts.bak"), true);
  assert.equal(isExcludedFromSite("page.tsx.bak"), true);
  assert.equal(isExcludedFromSite(".env"), true);
  assert.equal(isExcludedFromSite(".env.example"), false);
  assert.equal(isExcludedFromSite("consent.ts"), false);
  assert.equal(isExcludedFromSite("bakery.tsx"), false);
});
