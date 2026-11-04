import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS = fileURLToPath(
  new URL("../plugins/tal-landing-pages/skills/", import.meta.url),
);
const EXPECTED = [
  "page",
  "page-start",
  "page-brief",
  "page-copy",
  "page-design",
  "page-legal",
  "page-check",
  "page-live",
  "page-connect",
];

function frontmatter(file) {
  const m = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/);
  assert.ok(m, `${file}: אין frontmatter`);
  return Object.fromEntries(
    m[1]
      .split("\n")
      .filter((l) => /^[a-z-]+: /.test(l))
      .map((l) => [l.slice(0, l.indexOf(": ")), l.slice(l.indexOf(": ") + 2)]),
  );
}

test("כל תשעת הסקילים קיימים", () => {
  const dirs = readdirSync(SKILLS).filter((d) =>
    existsSync(join(SKILLS, d, "SKILL.md")),
  );
  assert.deepEqual([...dirs].sort(), [...EXPECTED].sort());
});

for (const name of EXPECTED) {
  test(`${name}: ה-frontmatter תקין`, () => {
    const fm = frontmatter(join(SKILLS, name, "SKILL.md"));
    assert.equal(fm.name, name);
    assert.equal(fm["user-invocable"], "true");
    const d = fm.description ?? "";
    assert.ok(d.length > 50, "חסר תיאור");
    const quoted = /^'.*'$/.test(d) || /^".*"$/.test(d);
    // בלי מרכאות, נקודתיים ורווח או # באמצע התיאור שוברים את ה-YAML
    if (!quoted)
      assert.ok(
        !d.includes(": ") && !d.includes(" #"),
        "תיאור עם ': ' או ' #' חייב להיות בתוך מרכאות",
      );
  });
}
