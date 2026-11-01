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
