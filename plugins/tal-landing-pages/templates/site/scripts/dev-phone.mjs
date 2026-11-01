#!/usr/bin/env node
/**
 * npm run dev:phone — האתר המקומי פתוח לרשת, כדי לפתוח אותו מהטלפון באותה רשת WiFi.
 *
 * ההבדל מ-npm run dev: השרת מאזין לכל הרשת (ולא רק למחשב), ולכן מצב העריכה כבוי
 * (DEV_EDIT=off ← /api/dev-edit מחזיר 404). אחרת כל מי שמחובר לאותה רשת, למשל ב-WiFi
 * של סדנה או של בית קפה, יכול היה לשנות את הטקסטים של הדף.
 * כדי לערוך טקסט: עוצרים את זה ומריצים npm run dev.
 *
 * רץ דרך node (ולא "DEV_EDIT=off next dev") כדי שיעבוד גם בווינדוס.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const extra = process.argv.slice(2);

console.log(
  "האתר פתוח לרשת (לצפייה מהטלפון). מצב העריכה כבוי. לעריכה: npm run dev",
);
const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", "0.0.0.0", ...extra],
  { stdio: "inherit", env: { ...process.env, DEV_EDIT: "off" } },
);
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () => child.kill(sig));
