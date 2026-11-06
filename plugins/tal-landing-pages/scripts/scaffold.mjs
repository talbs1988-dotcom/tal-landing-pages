#!/usr/bin/env node
import { mkdir, writeFile, readFile, readdir, access, cp } from "node:fs/promises";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { initStatus, readStatus } from "./status.mjs";
import { syncBusiness } from "./business-sync.mjs";

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
  // The business's own legal texts (optional). sync-business copies them to each page.
  "legal/texts",
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

// What never gets copied from the site template. `.env.example` is the one
// `.env*` file that does (names only, no values).
const SITE_TEMPLATE = join(TEMPLATES, "site");
export function isExcludedFromSite(name) {
  if (name === ".env.example") return false;
  return (
    name === "node_modules" ||
    name === ".next" ||
    name === ".vercel" ||
    name === ".env" ||
    name.startsWith(".env.") ||
    name === "next-env.d.ts" ||
    name === ".DS_Store" ||
    name.endsWith(".tsbuildinfo") ||
    // קבצי גיבוי (page.tsx.bak וכו'): כל מה שב-site/ עולה לאוויר
    name.endsWith(".bak")
  );
}

// Copies templates/site/ into <pageDir>/site/. Never overwrites: a non-empty
// site/ folder (a lone .gitkeep counts as empty) is an error and nothing is written.
export async function scaffoldSite(pageDir, { templateDir = SITE_TEMPLATE } = {}) {
  if (blank(pageDir)) throw new Error("חסרה תיקיית הדף");
  const page = resolve(pageDir);
  if (!(await exists(join(page, ".page", "status.json"))))
    throw new Error(
      `זו לא תיקיית דף: ${page}. תיקיית דף נוצרת עם /page-start ויש בה את .page/status.json.`,
    );
  if (!(await exists(join(templateDir, "package.json"))))
    throw new Error(`לא נמצאה תבנית האתר: ${templateDir}`);
  const site = join(page, "site");
  const existing = (await readdir(site).catch(() => [])).filter(
    (n) => n !== ".gitkeep",
  );
  if (existing.length > 0)
    throw new Error(
      `התיקייה site כבר לא ריקה, לא דורסים אותה: ${site}. כדי להתחיל מחדש צריך קודם למחוק אותה בעצמך.`,
    );
  await mkdir(site, { recursive: true });
  await cp(templateDir, site, {
    recursive: true,
    filter: (src) => src === templateDir || !isExcludedFromSite(basename(src)),
  });
  return site;
}

// Motion tools for a site that was created before they joined the template
// (pages started on an older version of the plugin). Idempotent: each part is
// added only if missing. Returns what was done; `install` means package.json
// gained `motion` and `npm install` must run.
const MOTION_CSS_MARKER = "===== כלי התנועה (components/motion) =====";
export async function scaffoldMotion(pageDir, { templateDir = SITE_TEMPLATE } = {}) {
  if (blank(pageDir)) throw new Error("חסרה תיקיית הדף");
  const site = join(resolve(pageDir), "site");
  if (!(await exists(join(site, "package.json"))))
    throw new Error(`אין עדיין אתר בתיקיית הדף: ${site}. קודם scaffold.mjs site.`);
  const done = [];
  if (!(await exists(join(site, "components", "motion", "index.ts")))) {
    await cp(join(templateDir, "components", "motion"), join(site, "components", "motion"), {
      recursive: true,
      filter: (src) => !isExcludedFromSite(basename(src)),
    });
    done.push("components/motion");
  }
  const cssPath = join(site, "app", "globals.css");
  const css = await readFile(cssPath, "utf8");
  if (!css.includes(MOTION_CSS_MARKER)) {
    const tpl = await readFile(join(templateDir, "app", "globals.css"), "utf8");
    const at = tpl.lastIndexOf("/*", tpl.indexOf(MOTION_CSS_MARKER));
    await writeFile(cssPath, `${css.trimEnd()}\n\n${tpl.slice(at)}`);
    done.push("globals.css");
  }
  const layoutPath = join(site, "app", "layout.tsx");
  let layout = await readFile(layoutPath, "utf8");
  if (!layout.includes("MotionRoot")) {
    const wrapped = layout.replace(/\{children\}/, "<MotionRoot>{children}</MotionRoot>");
    if (wrapped === layout)
      throw new Error(`לא מצאתי את {children} ב-${layoutPath}. צריך לעטוף אותו ב-<MotionRoot> בעצמך.`);
    layout = `import { MotionRoot } from "@/components/motion/MotionRoot";\n${wrapped}`;
    await writeFile(layoutPath, layout);
    done.push("app/layout.tsx");
  }
  const pkgPath = join(site, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  const tplPkg = JSON.parse(await readFile(join(templateDir, "package.json"), "utf8"));
  let install = false;
  if (!pkg.dependencies?.motion) {
    pkg.dependencies = { ...(pkg.dependencies ?? {}), motion: tplPkg.dependencies.motion };
    await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    done.push("package.json");
    install = true;
  }
  return { done, install };
}

// The section gallery (templates/gallery/) goes into the site as a temporary,
// noindex route: <site>/app/gallery-preview/. The design stage shows it to the
// business owner and reads its code, then deletes it (like brand-preview).
// Never overwrites: an existing gallery-preview is left as is.
const GALLERY_TEMPLATE = join(TEMPLATES, "gallery");
export async function scaffoldGallery(pageDir, { galleryDir = GALLERY_TEMPLATE } = {}) {
  if (blank(pageDir)) throw new Error("חסרה תיקיית הדף");
  const site = join(resolve(pageDir), "site");
  if (!(await exists(join(site, "package.json"))))
    throw new Error(`אין עדיין אתר בתיקיית הדף: ${site}. קודם scaffold.mjs site.`);
  const motion = await scaffoldMotion(pageDir);
  const target = join(site, "app", "gallery-preview");
  if (await exists(target)) return { created: false, path: target, motion };
  await cp(galleryDir, target, {
    recursive: true,
    filter: (src) => src === galleryDir || !isExcludedFromSite(basename(src)),
  });
  return { created: true, path: target, motion };
}

// The template files each stage starts from: [template name, path inside the
// page folder]. The only placeholder they get is {{pageName}}; design.md and
// references.md have none.
export const STAGE_FILES = {
  brief: [
    ["brief.md", "1-brief/brief.md"],
    ["customer-words.md", "1-brief/customer-words.md"],
  ],
  copy: [
    ["copy.md", "2-copy/copy.md"],
    ["images-list.md", "2-copy/images-list.md"],
  ],
  design: [
    ["design.md", "3-design/design.md"],
    ["references.md", "3-design/references.md"],
  ],
  check: [["report.md", "4-checks/report.md"]],
  // live has no file of its own: the address goes to the status note and site.config.ts
  connect: [["connections.md", "5-connect/connections.md"]],
};

// Copies the stage's template files into the page folder. Never overwrites:
// a file that is already there (even empty) is left as is and listed in `skipped`.
export async function scaffoldStageFiles(pageDir, stageId, { templatesDir = TEMPLATES } = {}) {
  if (blank(pageDir)) throw new Error("חסרה תיקיית הדף");
  if (blank(stageId) || !Object.hasOwn(STAGE_FILES, stageId))
    throw new Error(
      `שלב לא מוכר: ${stageId ?? ""}. אפשר: ${Object.keys(STAGE_FILES).join(", ")}`,
    );
  const page = resolve(pageDir);
  if (!(await exists(join(page, ".page", "status.json"))))
    throw new Error(
      `זו לא תיקיית דף: ${page}. תיקיית דף נוצרת עם /page-start ויש בה את .page/status.json.`,
    );
  const { pageName } = await readStatus(page);
  const created = [];
  const skipped = [];
  for (const [tpl, target] of STAGE_FILES[stageId]) {
    const p = join(page, target);
    if (await exists(p)) {
      skipped.push(p);
      continue;
    }
    let text = await readFile(join(templatesDir, tpl), "utf8");
    text = text.replaceAll("{{pageName}}", pageName || basename(page));
    await mkdir(dirname(p), { recursive: true });
    // "wx": if the file appeared in the meantime, fail instead of overwriting it.
    await writeFile(p, text, { flag: "wx" });
    created.push(p);
  }
  return { created, skipped };
}

const USAGE = [
  "שימוש:",
  "  scaffold.mjs business <תיקיית העסק> <שם העסק>",
  "  scaffold.mjs page <תיקיית העסק> <שם הדף>",
  "  scaffold.mjs site <תיקיית הדף>",
  "  scaffold.mjs gallery <תיקיית הדף>",
  "  scaffold.mjs motion <תיקיית הדף>",
  "  scaffold.mjs stage-files <תיקיית הדף> <brief|copy|design|check|connect>",
  "  scaffold.mjs sync-business <תיקיית הדף>",
  "  scaffold.mjs is-business <תיקייה>",
  "  scaffold.mjs find-root <תיקייה>",
  "  scaffold.mjs find-below <תיקייה>",
].join("\n");

class UsageError extends Error {}

async function cli([cmd, root, ...name]) {
  const value = name.join(" ");
  if (
    ![
      "business",
      "page",
      "site",
      "gallery",
      "motion",
      "stage-files",
      "sync-business",
      "is-business",
      "find-root",
      "find-below",
    ].includes(cmd) ||
    blank(root)
  )
    throw new UsageError(USAGE);
  if (cmd === "business")
    console.log(await scaffoldBusiness(root, { businessName: value }));
  else if (cmd === "page")
    console.log(await scaffoldPage(root, { pageName: value }));
  else if (cmd === "site") console.log(await scaffoldSite(root));
  else if (cmd === "gallery")
    console.log(JSON.stringify(await scaffoldGallery(root), null, 2));
  else if (cmd === "motion")
    console.log(JSON.stringify(await scaffoldMotion(root), null, 2));
  else if (cmd === "sync-business")
    console.log(
      JSON.stringify(await syncBusiness(root, { findBusinessRoot }), null, 2),
    );
  else if (cmd === "stage-files") {
    if (blank(value)) throw new UsageError(USAGE);
    console.log(JSON.stringify(await scaffoldStageFiles(root, value), null, 2));
  }
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
