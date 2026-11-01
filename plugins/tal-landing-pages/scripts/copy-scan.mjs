#!/usr/bin/env node
// Reads 2-copy/copy.md and lists what /page-copy checks by machine instead of
// by eye: the state of each section, every button text, every image/video/mockup
// marker, every [למלא], long dashes and curly quotes, and where a product name
// first shows up. Only the copy itself is scanned: not the sources list of a
// section, not the header table, the structure table or the closing tables.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SECTION = /^##\s+(\d+)\.\s+(.+?)\s*$/;
const OTHER_HEADING = /^##\s+/;
const STATE = /^מצב:\s*(.+?)\s*$/;
const MEDIA = /\((תמונה|וידאו|מוקאפ):\s*([^)]*)\)/g;
const BUTTON = /\(כפתור:\s*([^)]*)\)/g;
const TODO = /\[למלא(?::\s*([^\]]*))?\]/g;
const CURLY = /[“”„‘’]/;

// Splits the file into numbered sections. Each section: number, title, state,
// and the copy lines (with their line numbers in the file).
export function parseCopy(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let cur = null;
  let inComment = false;
  // phase: "head" (before מקורות), "sources" (the bullet list), "body"
  let phase = "head";
  let sawSource = false;
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    if (inComment) {
      if (line.includes("-->")) inComment = false;
      return;
    }
    if (line.trim().startsWith("<!--")) {
      if (!line.includes("-->")) inComment = true;
      return;
    }
    const m = SECTION.exec(line);
    // The short version keeps its form texts under "## טקסטי הטופס" (number 0).
    const form = !m && /^##\s+טקסטי הטופס\s*$/.test(line);
    if (m || form) {
      cur = m
        ? { number: Number(m[1]), title: m[2], state: null, body: [] }
        : { number: 0, title: "טקסטי הטופס", state: null, body: [] };
      sections.push(cur);
      phase = "head";
      sawSource = false;
      return;
    }
    if (OTHER_HEADING.test(line)) {
      cur = null;
      return;
    }
    if (!cur) return;
    if (phase === "head") {
      const s = STATE.exec(line);
      if (s) cur.state = s[1];
      else if (/^מקורות:/.test(line.trim())) phase = "sources";
      else if (line.trim() && !STATE.test(line)) {
        phase = "body";
        cur.body.push({ line: lineNo, text: line });
      }
      return;
    }
    if (phase === "sources") {
      if (/^\s*-\s/.test(line)) {
        sawSource = true;
        return;
      }
      if (!line.trim()) {
        if (sawSource) phase = "body";
        return;
      }
      phase = "body";
    }
    cur.body.push({ line: lineNo, text: line });
  });
  return sections;
}

const isLive = (s) => !s.state || !/^(הוסר|לא נכתב)/.test(s.state);

export function scanCopy(text, { name } = {}) {
  const sections = parseCopy(text);
  const out = {
    sections: sections.map((s) => ({
      number: s.number,
      title: s.title,
      state: s.state,
    })),
    buttons: [],
    media: [],
    todos: [],
    longDashes: [],
    curlyQuotes: [],
    buttonTexts: [],
  };
  for (const s of sections.filter(isLive)) {
    for (const { line, text: t } of s.body) {
      const at = { section: s.number, line };
      for (const b of t.matchAll(BUTTON))
        out.buttons.push({ ...at, text: b[1].trim() });
      for (const md of t.matchAll(MEDIA))
        out.media.push({ ...at, kind: md[1], text: md[2].trim() });
      for (const td of t.matchAll(TODO))
        out.todos.push({ ...at, text: (td[1] ?? "").trim() });
      // A table row of the form section: "| כפתור שליחה | <text> |" is a button too.
      const row = /^\|\s*כפתור שליחה\s*\|\s*(.*?)\s*\|\s*$/.exec(t);
      if (row && row[1] && !/^\[למלא/.test(row[1]))
        out.buttons.push({ ...at, text: row[1], formSubmit: true });
      if (t.includes("—")) out.longDashes.push({ ...at, text: t.trim() });
      if (CURLY.test(t)) out.curlyQuotes.push({ ...at, text: t.trim() });
    }
  }
  out.buttonTexts = [...new Set(out.buttons.map((b) => b.text))];
  if (name && name.trim()) {
    const needle = name.trim();
    const first = sections
      .filter(isLive)
      .find((s) => s.body.some((b) => b.text.includes(needle)));
    out.productName = {
      name: needle,
      firstSection: first ? first.number : null,
    };
  }
  return out;
}

const USAGE = "שימוש:\n  copy-scan.mjs <הנתיב ל-copy.md> [--name <שם המוצר>]";

async function cli(args) {
  const i = args.indexOf("--name");
  let name;
  if (i !== -1) {
    name = args.slice(i + 1).join(" ");
    args = args.slice(0, i);
  }
  const [file] = args;
  if (!file || (i !== -1 && !name.trim())) {
    console.error(USAGE);
    process.exit(1);
  }
  const text = await readFile(file, "utf8");
  console.log(JSON.stringify(scanCopy(text, { name }), null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch((e) => {
    console.error(
      e.code
        ? `לא הצלחתי לקרוא את הקובץ (${e.code}): ${e.path ?? ""}`
        : e.message,
    );
    process.exit(1);
  });
}
