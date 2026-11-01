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
