import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startCatcher } from "../plugins/tal-landing-pages/scripts/lead-catcher.mjs";

test("the catcher saves every POST body to the file", async () => {
  const file = join(await mkdtemp(join(tmpdir(), "catch-")), "lead.json");
  const { server, port } = await startCatcher({ port: 0, file });
  try {
    const r = await fetch(`http://127.0.0.1:${port}/lead`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "ליד בדיקה", utm_source: "test" }),
    });
    assert.equal(r.status, 200);
    const saved = JSON.parse(await readFile(file, "utf8"));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].body.name, "ליד בדיקה");
    assert.equal(saved[0].path, "/lead");
    const get = await fetch(`http://127.0.0.1:${port}/lead`);
    assert.equal(get.status, 405);
  } finally {
    server.close();
  }
});
