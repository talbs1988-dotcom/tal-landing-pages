#!/usr/bin/env node
import { mkdir, writeFile, readFile, readdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
  ["CLAUDE.md", "CLAUDE.md"],
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

export async function isBusinessRoot(root) {
  const p = join(root, "CLAUDE.md");
  if (!(await exists(p))) return false;
  return (await readFile(p, "utf8")).includes(MARKER);
}

export async function scaffoldBusiness(root, { businessName }) {
  for (const d of BUSINESS_DIRS)
    await mkdir(join(root, d), { recursive: true });
  for (const [tpl, target] of BUSINESS_FILES) {
    const p = join(root, target);
    if (!(await exists(p)))
      await writeFile(p, await fill(tpl, { businessName }));
  }
  return root;
}

export function pageSlug(name) {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

async function nextPageNumber(root) {
  const names = await readdir(join(root, "landing-pages")).catch(() => []);
  const nums = names
    .map((n) => parseInt(n.slice(0, 2), 10))
    .filter(Number.isFinite);
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0");
}

export async function scaffoldPage(root, { pageName }) {
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
  for (const d of PAGE_DIRS) await mkdir(join(dir, d), { recursive: true });
  await initStatus(dir, { pageName });
  return dir;
}

async function cli([cmd, root, ...name]) {
  const value = name.join(" ");
  if (cmd === "business")
    console.log(await scaffoldBusiness(root, { businessName: value }));
  else if (cmd === "page")
    console.log(await scaffoldPage(root, { pageName: value }));
  else if (cmd === "is-business") console.log(await isBusinessRoot(root));
  else
    throw new Error(
      "שימוש: scaffold.mjs <business|page|is-business> <תיקייה> [שם]",
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
