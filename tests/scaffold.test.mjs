import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
import { listPages } from "../plugins/tal-landing-pages/scripts/status.mjs";

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
