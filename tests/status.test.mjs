import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STAGES,
  STATES,
  stageIndex,
} from "../plugins/tal-landing-pages/scripts/stages.mjs";

test("eight stages in the fixed order", () => {
  assert.deepEqual(
    STAGES.map((s) => s.id),
    ["start", "brief", "copy", "design", "legal", "check", "live", "connect"],
  );
});

test("every stage has a hebrew label and a /page- command", () => {
  for (const s of STAGES) {
    assert.match(s.command, /^\/page-[a-z]+$/);
    assert.ok(s.label.length > 0);
  }
});

test("stageIndex finds stages and rejects unknown ids", () => {
  assert.equal(stageIndex("copy"), 2);
  assert.throws(() => stageIndex("nope"), /שלב לא מוכר/);
});

test("three states exist", () => {
  assert.deepEqual(Object.keys(STATES), ["todo", "doing", "done"]);
});

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initStatus,
  readStatus,
  setStage,
  nextStage,
  renderMarkdown,
} from "../plugins/tal-landing-pages/scripts/status.mjs";

async function tmpPage() {
  return mkdtemp(join(tmpdir(), "page-"));
}

test("initStatus writes json and markdown with all stages todo", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "סדנת גיוס" });
  const s = await readStatus(dir);
  assert.equal(s.pageName, "סדנת גיוס");
  assert.equal(
    Object.values(s.stages).every((x) => x.state === "todo"),
    true,
  );
  const md = await readFile(join(dir, "status.md"), "utf8");
  assert.match(md, /סדנת גיוס/);
  assert.match(md, /\/page-start/);
});

test("initStatus does not overwrite an existing status", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "א" });
  await setStage(dir, "start", "done");
  await initStatus(dir, { pageName: "ב" });
  const s = await readStatus(dir);
  assert.equal(s.pageName, "א");
  assert.equal(s.stages.start.state, "done");
});

test("cannot approve a stage before the previous one is approved", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "א" });
  await assert.rejects(
    setStage(dir, "brief", "done"),
    /קודם צריך לאשר את: 0\. הכנה/,
  );
});

test("doing is allowed out of order, done is not", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "א" });
  await setStage(dir, "design", "doing", "מסתכלים על רפרנסים");
  const s = await readStatus(dir);
  assert.equal(s.stages.design.state, "doing");
  assert.equal(s.stages.design.note, "מסתכלים על רפרנסים");
});

test("rejects unknown state", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "א" });
  await assert.rejects(setStage(dir, "start", "finished"), /מצב לא מוכר/);
});

test("nextStage returns the first stage not approved", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "א" });
  await setStage(dir, "start", "done");
  await setStage(dir, "brief", "done");
  const s = await readStatus(dir);
  assert.equal(nextStage(s).id, "copy");
});

test("nextStage returns null when everything is approved", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "א" });
  for (const id of [
    "start",
    "brief",
    "copy",
    "design",
    "legal",
    "check",
    "live",
    "connect",
  ]) {
    await setStage(dir, id, "done");
  }
  assert.equal(nextStage(await readStatus(dir)), null);
});

test("renderMarkdown shows the next command", () => {
  const md = renderMarkdown({
    pageName: "א",
    stages: Object.fromEntries(
      [
        "start",
        "brief",
        "copy",
        "design",
        "legal",
        "check",
        "live",
        "connect",
      ].map((id, i) => [
        id,
        { state: i === 0 ? "done" : "todo", note: "", updated: "" },
      ]),
    ),
  });
  assert.match(md, /הפקודה הבאה: `\/page-brief`/);
});

// ---- review fixes ----
import { writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const STATUS_CLI = fileURLToPath(
  new URL(  "../plugins/tal-landing-pages/scripts/status.mjs", import.meta.url),
);

test("setStage without a note keeps the existing note", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "א" });
  await setStage(dir, "copy", "doing", "סקשן 3 מתוך 7 אושר");
  await setStage(dir, "copy", "doing");
  assert.equal((await readStatus(dir)).stages.copy.note, "סקשן 3 מתוך 7 אושר");
  await setStage(dir, "copy", "doing", "  ");
  assert.equal((await readStatus(dir)).stages.copy.note, "סקשן 3 מתוך 7 אושר");
  await setStage(dir, "copy", "doing", "סקשן 4 מתוך 7 אושר");
  assert.equal((await readStatus(dir)).stages.copy.note, "סקשן 4 מתוך 7 אושר");
});

test("readStatus on a folder that is not a page gives a hebrew error", async () => {
  const dir = await tmpPage();
  await assert.rejects(readStatus(dir), new RegExp(`אין כאן דף של הסיסטם: ${dir}`));
});

test("readStatus fills in stages missing from an older status.json", async () => {
  const dir = await tmpPage();
  await mkdir(join(dir, ".page"));
  await writeFile(
    join(dir, ".page", "status.json"),
    JSON.stringify({
      pageName: "ישן",
      stages: { start: { state: "done", note: "היה", updated: "2026-01-01" } },
    }),
  );
  const s = await readStatus(dir);
  assert.equal(s.stages.start.state, "done");
  assert.deepEqual(s.stages.connect, { state: "todo", note: "", updated: "" });
  assert.equal(Object.keys(s.stages).length, STAGES.length);
  await setStage(dir, "brief", "done", "עובד");
  assert.equal((await readStatus(dir)).stages.brief.state, "done");
});

test("renderMarkdown keeps the table intact with pipes and newlines", () => {
  const stages = Object.fromEntries(
    STAGES.map((s) => [s.id, { state: "todo", note: "", updated: "" }]),
  );
  stages.start = { state: "doing", note: "שורה א | שורה ב\nשורה ג", updated: "" };
  const md = renderMarkdown({ pageName: "דף | עם\nשבירה", stages });
  assert.match(md, /^# דף ｜ עם שבירה — /);
  const row = md.split("\n").find((l) => l.startsWith("| 0. הכנה"));
  assert.match(row, /שורה א ｜ שורה ב שורה ג/);
  assert.equal(row.split("|").length - 1, 6);
});

test("CLI status with missing arguments prints hebrew usage and exits 1", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "א" });
  for (const args of [
    [],
    ["show"],
    ["next"],
    ["list"],
    ["init", dir],
    ["set"],
    ["set", dir],
    ["set", dir, "start"],
  ]) {
    const r = spawnSync(process.execPath, [STATUS_CLI, ...args], { encoding: "utf8" });
    assert.equal(r.status, 1, args.join(" "));
    assert.match(r.stderr, /שימוש:/, args.join(" "));
    assert.doesNotMatch(r.stderr, /TypeError|ERR_|at /);
  }
});

test("CLI show on a folder that is not a page gives the hebrew error", async () => {
  const dir = await tmpPage();
  const r = spawnSync(process.execPath, [STATUS_CLI, "show", dir], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /אין כאן דף של הסיסטם/);
});

test("CLI set keeps a note that has several words", async () => {
  const dir = await tmpPage();
  await initStatus(dir, { pageName: "א" });
  const r = spawnSync(
    process.execPath,
    [STATUS_CLI, "set", dir, "copy", "doing", "סקשן 3 מתוך 7 אושר"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.equal((await readStatus(dir)).stages.copy.note, "סקשן 3 מתוך 7 אושר");
});
