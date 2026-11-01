#!/usr/bin/env node
import { mkdir, writeFile, readFile, readdir, access } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { initStatus } from "./status.mjs";

const TEMPLATES = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "templates",
);
const MARKER = "<!-- tal-landing-pages:business -->";

export const BUSINESS_DIRS = [
  "brand/logo",
  "brand/photos/ai",
  "brand/proof",
  "legal",
  "landing-pages",
];
export const PAGE_DIRS = [
  "1-brief",
  "2-copy",
  "3-design",
  "images-inbox",
  "site",
  "4-checks",
  "5-connect",
];
const BUSINESS_FILES = [
  ["brand.md", "brand/brand.md"],
  ["voice.md", "brand/voice.md"],
  ["business.md", "legal/business.md"],
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fill(templateName, vars) {
  let text = await readFile(join(TEMPLATES, templateName), "utf8");
  for (const [k, v] of Object.entries(vars))
    text = text.replaceAll(`{{${k}}}`, v);
  return text;
}

const blank = (s) => !s || !String(s).trim();

export async function isBusinessRoot(root) {
  const p = join(root, "CLAUDE.md");
  if (!(await exists(p))) return false;
  try {
    return (await readFile(p, "utf8")).includes(MARKER);
  } catch {
    return false;
  }
}

// The first business root at `dir` or above it, or null.
export async function findBusinessRoot(dir) {
  let d = resolve(dir);
  for (;;) {
    if (await isBusinessRoot(d)) return d;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

// CLAUDE.md: new file → the template. Existing file without the marker → keep
// the owner's text as is, add the marker on top and the template sections below.
async function writeBusinessMemory(root, businessName) {
  const p = join(root, "CLAUDE.md");
  const template = await fill("CLAUDE.md", { businessName });
  if (!(await exists(p))) {
    await writeFile(p, template);
    return;
  }
  const original = await readFile(p, "utf8");
  if (original.includes(MARKER)) return;
  const sections = template.slice(template.search(/^## /m));
  const gap = original.endsWith("\n") ? "\n" : "\n\n";
  await writeFile(p, `${MARKER}\n\n${original}${gap}---\n\n${sections}`);
}

// Business folders directly in the home folder, Desktop, Documents or
// Downloads would mix the business with everything else on the computer.
const NOT_A_BUSINESS_FOLDER = ["", "Desktop", "Documents", "Downloads"];
const samePath = (a, b) =>
  process.platform === "darwin" || process.platform === "win32"
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;

export function assertNotHomeFolder(root, home = homedir(), businessName) {
  const here = resolve(root);
  for (const name of NOT_A_BUSINESS_FOLDER) {
    const banned = resolve(home, name);
    if (samePath(here, banned))
      throw new Error(
        `לא יוצרים תיקיית עסק ישירות ב-${banned}. יוצרים בתוכה תיקייה בשם העסק, למשל: ${join(banned, businessName || "<שם העסק>")}`,
      );
  }
}

// Business folders that are direct children of `dir` (one level down only).
export async function findBusinessRootsBelow(dir) {
  const base = resolve(dir);
  const entries = await readdir(base, { withFileTypes: true }).catch(() => []);
  const found = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const child = join(base, e.name);
    if (await isBusinessRoot(child)) found.push(child);
  }
  return found.sort((a, b) => a.localeCompare(b));
}

export async function scaffoldBusiness(root, { businessName, home } = {}) {
  if (blank(businessName)) throw new Error("חסר שם לעסק");
  businessName = businessName.trim();
  assertNotHomeFolder(root, home, businessName);
  const here = resolve(root);
  const up = dirname(here);
  const above = up === here ? null : await findBusinessRoot(up);
  if (above) throw new Error(`כבר יש תיקיית עסק מעל התיקייה הזו: ${above}`);
  for (const d of BUSINESS_DIRS)
    await mkdir(join(root, d), { recursive: true });
  await writeBusinessMemory(root, businessName);
  for (const [tpl, target] of BUSINESS_FILES) {
    const p = join(root, target);
    if (!(await exists(p)))
      await writeFile(p, await fill(tpl, { businessName }));
  }
  if (!(await isBusinessRoot(root)))
    throw new Error(
      `לא הצלחתי לסמן את התיקייה כתיקיית עסק: ${root}. כדאי לבדוק את הקובץ CLAUDE.md שבה.`,
    );
  return root;
}

export function pageSlug(name) {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]/g, " ")
      .trim()
      .replace(/\s+/g, "-") || "דף"
  );
}

async function nextPageNumber(root) {
  const entries = await readdir(join(root, "landing-pages"), {
    withFileTypes: true,
  }).catch(() => []);
  // Only real pages count: NN- prefix and a status file. A "2026-backup"
  // folder must not push the next page to 2027.
  const nums = [];
  for (const e of entries) {
    const m = /^(\d+)-/.exec(e.name);
    if (!e.isDirectory() || !m) continue;
    if (!(await exists(join(root, "landing-pages", e.name, ".page", "status.json"))))
      continue;
    nums.push(parseInt(m[1], 10));
  }
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0");
}

export async function scaffoldPage(root, { pageName } = {}) {
  if (blank(pageName)) throw new Error("חסר שם לדף");
  pageName = pageName.trim();
  if (!(await isBusinessRoot(root))) {
    throw new Error(
      `זו לא תיקיית עסק: ${root}. קודם מריצים את /page-start בתיקיית העסק.`,
    );
  }
  const dir = join(
    root,
    "landing-pages",
    `${await nextPageNumber(root)}-${pageSlug(pageName)}`,
  );
  if (await exists(dir))
    throw new Error(`התיקייה של הדף כבר קיימת, לא דורסים אותה: ${dir}`);
  for (const d of PAGE_DIRS) await mkdir(join(dir, d), { recursive: true });
  await initStatus(dir, { pageName });
  return dir;
}

const USAGE = [
  "שימוש:",
  "  scaffold.mjs business <תיקיית העסק> <שם העסק>",
  "  scaffold.mjs page <תיקיית העסק> <שם הדף>",
  "  scaffold.mjs is-business <תיקייה>",
  "  scaffold.mjs find-root <תיקייה>",
  "  scaffold.mjs find-below <תיקייה>",
].join("\n");

class UsageError extends Error {}

async function cli([cmd, root, ...name]) {
  const value = name.join(" ");
  if (
    !["business", "page", "is-business", "find-root", "find-below"].includes(cmd) ||
    blank(root)
  )
    throw new UsageError(USAGE);
  if (cmd === "business")
    console.log(await scaffoldBusiness(root, { businessName: value }));
  else if (cmd === "page")
    console.log(await scaffoldPage(root, { pageName: value }));
  else if (cmd === "is-business") console.log(await isBusinessRoot(root));
  else if (cmd === "find-below")
    console.log(JSON.stringify(await findBusinessRootsBelow(root), null, 2));
  else {
    const found = await findBusinessRoot(root);
    if (!found) {
      console.error(`לא נמצאה תיקיית עסק מעל ${root}`);
      process.exitCode = 2;
      return;
    }
    console.log(found);
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
