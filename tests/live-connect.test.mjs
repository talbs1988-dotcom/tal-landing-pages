import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  scaffoldBusiness,
  scaffoldPage,
  scaffoldSite,
  scaffoldStageFiles,
  STAGE_FILES,
} from "../plugins/tal-landing-pages/scripts/scaffold.mjs";

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), "..", "plugins", "tal-landing-pages");
const SCAFFOLD_CLI = join(PLUGIN, "scripts", "scaffold.mjs");
const exists = (p) => access(p).then(() => true, () => false);

async function page() {
  const root = await mkdtemp(join(tmpdir(), "biz-"));
  await scaffoldBusiness(root, { businessName: "בדיקה" });
  return scaffoldPage(root, { pageName: "סדנת בדיקה" });
}

test("STAGE_FILES: connect gets 5-connect/connections.md, live gets no file", () => {
  assert.deepEqual(STAGE_FILES.connect, [["connections.md", "5-connect/connections.md"]]);
  assert.equal(Object.hasOwn(STAGE_FILES, "live"), false);
});

test("stage-files connect creates connections.md with the page name and no other placeholder", async () => {
  const dir = await page();
  const r = await scaffoldStageFiles(dir, "connect");
  const p = join(dir, "5-connect", "connections.md");
  assert.deepEqual(r, { created: [p], skipped: [] });
  const text = await readFile(p, "utf8");
  assert.match(text, /^# לאן כל ליד הולך — סדנת בדיקה$/m);
  assert.equal(/\{\{/.test(text), false);
});

test("stage-files connect never overwrites a filled connections.md", async () => {
  const dir = await page();
  const p = join(dir, "5-connect", "connections.md");
  await writeFile(p, "מילאתי");
  const r = await scaffoldStageFiles(dir, "connect");
  assert.deepEqual(r, { created: [], skipped: [p] });
  assert.equal(await readFile(p, "utf8"), "מילאתי");
});

test("CLI stage-files connect prints created JSON", async () => {
  const dir = await page();
  const out = spawnSync(process.execPath, [SCAFFOLD_CLI, "stage-files", dir, "connect"], { encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  assert.deepEqual(JSON.parse(out.stdout).created, [join(dir, "5-connect", "connections.md")]);
});

test("connections.md template has no secret-looking values", async () => {
  const text = await readFile(join(PLUGIN, "templates", "connections.md"), "utf8");
  assert.equal(/hook\.[a-z0-9]+\.make\.com\/[a-z0-9]{8,}/i.test(text), false);
  assert.equal(/EAA[A-Za-z0-9]{20,}/.test(text), false);
});

test("site template ships a .vercelignore that keeps every env file out of the upload", async () => {
  const text = await readFile(join(PLUGIN, "templates", "site", ".vercelignore"), "utf8");
  const lines = text.split("\n").map((l) => l.trim());
  assert.ok(lines.includes(".env*"), ".env* line");
  assert.equal(lines.some((l) => l.startsWith("!.env")), false, "no env file is re-included");
});

test("scaffoldSite copies .vercelignore into the page's site folder", async () => {
  const dir = await page();
  const site = await scaffoldSite(dir);
  assert.ok(await exists(join(site, ".vercelignore")));
});

test("page-live and page-connect skills exist and point to their references", async () => {
  for (const [skill, refs] of [
    ["page-live", ["domains.md", "stage-contract.md"]],
    ["page-connect", ["connect-make.md", "connect-meta.md", "connect-mailing.md", "stage-contract.md"]],
  ]) {
    const text = await readFile(join(PLUGIN, "skills", skill, "SKILL.md"), "utf8");
    assert.match(text, new RegExp(`^name: ${skill}$`, "m"));
    for (const r of refs) {
      assert.ok(text.includes(`references/${r}`), `${skill} → ${r}`);
      assert.ok(await exists(join(PLUGIN, "references", r)), r);
    }
  }
});

test("the skills never tell Claude to pull env files or pass a secret on the command line", async () => {
  for (const skill of ["page-live", "page-connect"]) {
    const text = await readFile(join(PLUGIN, "skills", skill, "SKILL.md"), "utf8");
    let heading = "";
    for (const line of text.split("\n")) {
      if (line.startsWith("#")) heading = line;
      if (/env pull/.test(line))
        assert.ok(/אסור/.test(heading) || /אסור|לא |אף פעם/.test(line), `${skill}: ${line}`);
      for (const secret of ["WEBHOOK_URL", "ALERT_WEBHOOK_URL", "META_CAPI_TOKEN"])
        if (line.includes(`env add ${secret} production --value`))
          assert.ok(line.includes("broken-test"), `${skill}: ${line}`);
    }
  }
});
