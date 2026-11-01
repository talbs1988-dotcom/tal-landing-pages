#!/usr/bin/env node
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
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

export function renderMarkdown(status) {
  const rows = STAGES.map((s) => {
    const st = status.stages[s.id];
    return `| ${s.label} | ${STATES[st.state]} | \`${s.command}\` | ${st.note || ""} | ${st.updated || ""} |`;
  });
  const next = nextStage(status);
  const nextLine = next
    ? `**הפקודה הבאה: \`${next.command}\`** (${next.label})`
    : "**כל השלבים אושרו. הדף באוויר ומחובר.**";
  return [
    `# ${status.pageName} — איפה אנחנו`,
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

async function save(dir, status) {
  await mkdir(join(dir, ".page"), { recursive: true });
  await writeFile(jsonPath(dir), JSON.stringify(status, null, 2));
  await writeFile(mdPath(dir), renderMarkdown(status));
}

export async function initStatus(dir, { pageName }) {
  if (await exists(jsonPath(dir))) return readStatus(dir);
  const status = {
    pageName,
    stages: Object.fromEntries(
      STAGES.map((s) => [s.id, { state: "todo", note: "", updated: "" }]),
    ),
  };
  await save(dir, status);
  return status;
}

export async function readStatus(dir) {
  return JSON.parse(await readFile(jsonPath(dir), "utf8"));
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
  status.stages[id] = { state, note, updated: today() };
  await save(dir, status);
  return status;
}

export function nextStage(status) {
  return STAGES.find((s) => status.stages[s.id].state !== "done") ?? null;
}

async function cli([cmd, dir, ...rest]) {
  if (cmd === "init") {
    await initStatus(dir, { pageName: rest.join(" ") });
  } else if (cmd === "set") {
    const [id, state, ...note] = rest;
    await setStage(dir, id, state, note.join(" "));
  } else if (cmd !== "show" && cmd !== "next") {
    throw new Error("שימוש: status.mjs <init|set|show|next> <תיקיית-הדף> ...");
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
    console.error(e.message);
    process.exit(1);
  });
}
