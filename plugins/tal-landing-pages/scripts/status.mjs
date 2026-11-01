#!/usr/bin/env node
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  access,
} from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { STAGES, STATES, stageIndex } from "./stages.mjs";

const jsonPath = (dir) => join(dir, ".page", "status.json");
const mdPath = (dir) => join(dir, "status.md");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const today = () => new Date().toISOString().slice(0, 10);

// A table cell or heading must stay on one line and must not open a new column.
const cell = (s) =>
  String(s ?? "")
    .replace(/\r\n|\r|\n/g, " ")
    .replaceAll("|", "｜");

export function renderMarkdown(status) {
  const rows = STAGES.map((s) => {
    const st = status.stages[s.id];
    return `| ${s.label} | ${STATES[st.state]} | \`${s.command}\` | ${cell(st.note)} | ${cell(st.updated)} |`;
  });
  const next = nextStage(status);
  const nextLine = next
    ? `**הפקודה הבאה: \`${next.command}\`** (${next.label})`
    : "**כל השלבים אושרו. הדף באוויר ומחובר.**";
  return [
    `# ${cell(status.pageName)} — איפה אנחנו`,
    "",
    "הקובץ הזה מתעדכן לבד. לא צריך לערוך אותו.",
    "",
    nextLine,
    "",
    "| שלב | מצב | פקודה | הערה | עודכן |",
    "|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

async function writeAtomic(path, text) {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, text);
  await rename(tmp, path);
}

async function save(dir, status) {
  await mkdir(join(dir, ".page"), { recursive: true });
  await writeAtomic(jsonPath(dir), JSON.stringify(status, null, 2));
  await writeAtomic(mdPath(dir), renderMarkdown(status));
}

const emptyStage = () => ({ state: "todo", note: "", updated: "" });

export async function initStatus(dir, { pageName }) {
  if (await exists(jsonPath(dir))) return readStatus(dir);
  const status = {
    pageName,
    stages: Object.fromEntries(STAGES.map((s) => [s.id, emptyStage()])),
  };
  await save(dir, status);
  return status;
}

export async function readStatus(dir) {
  const p = jsonPath(dir);
  if (!(await exists(p))) throw new Error(`אין כאן דף של הסיסטם: ${dir}`);
  let status;
  try {
    status = JSON.parse(await readFile(p, "utf8"));
  } catch {
    throw new Error(`קובץ המצב של הדף פגום ואי אפשר לקרוא אותו: ${p}`);
  }
  status.stages ??= {};
  for (const s of STAGES) status.stages[s.id] ??= emptyStage();
  return status;
}

export async function setStage(dir, id, state, note = "") {
  if (!(state in STATES))
    throw new Error(
      `מצב לא מוכר: ${state}. אפשר: ${Object.keys(STATES).join(", ")}`,
    );
  const i = stageIndex(id);
  const status = await readStatus(dir);
  if (state === "done" && i > 0) {
    const prev = STAGES[i - 1];
    if (status.stages[prev.id].state !== "done") {
      throw new Error(`קודם צריך לאשר את: ${prev.label} (${prev.command})`);
    }
  }
  const keepNote = !note || !String(note).trim();
  status.stages[id] = {
    state,
    note: keepNote ? status.stages[id].note : note,
    updated: today(),
  };
  await save(dir, status);
  return status;
}

export function nextStage(status) {
  return STAGES.find((s) => status.stages[s.id].state !== "done") ?? null;
}

// Every page folder under <business-root>/landing-pages that has a status file.
export async function listPages(root) {
  const base = join(root, "landing-pages");
  const entries = await readdir(base, { withFileTypes: true }).catch(() => []);
  const pages = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = join(base, e.name);
    if (!(await exists(jsonPath(dir)))) continue;
    const status = await readStatus(dir);
    const n = nextStage(status);
    pages.push({
      dir,
      folder: e.name,
      pageName: status.pageName,
      next: n ? { id: n.id, label: n.label, command: n.command } : null,
    });
  }
  return pages.sort((a, b) =>
    a.folder.localeCompare(b.folder, undefined, { numeric: true }),
  );
}

const USAGE = [
  "שימוש:",
  "  status.mjs init <תיקיית-הדף> <שם הדף>",
  "  status.mjs set <תיקיית-הדף> <שלב> <todo|doing|done> [הערה]",
  "  status.mjs show <תיקיית-הדף>",
  "  status.mjs next <תיקיית-הדף>",
  "  status.mjs list <תיקיית-העסק>",
].join("\n");

class UsageError extends Error {}
const need = (...values) => {
  if (values.some((v) => !v || !String(v).trim())) throw new UsageError(USAGE);
};

async function cli([cmd, dir, ...rest]) {
  if (cmd === "list") {
    need(dir);
    console.log(JSON.stringify(await listPages(dir), null, 2));
    return;
  }
  if (cmd === "init") {
    need(dir, rest.join(" "));
    await initStatus(dir, { pageName: rest.join(" ") });
  } else if (cmd === "set") {
    const [id, state, ...note] = rest;
    need(dir, id, state);
    await setStage(dir, id, state, note.join(" "));
  } else if (cmd === "show" || cmd === "next") {
    need(dir);
  } else {
    throw new UsageError(USAGE);
  }
  const status = await readStatus(dir);
  if (cmd === "next") {
    const n = nextStage(status);
    console.log(n ? JSON.stringify(n) : "null");
  } else {
    console.log(renderMarkdown(status));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch((e) => {
    console.error(
      e.code
        ? `לא הצלחתי לגשת לקובץ או לתיקייה (${e.code}): ${e.path ?? ""}`
        : e.message,
    );
    process.exit(1);
  });
}
