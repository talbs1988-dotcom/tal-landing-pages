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
