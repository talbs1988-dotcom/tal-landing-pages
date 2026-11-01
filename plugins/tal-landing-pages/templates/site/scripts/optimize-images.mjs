#!/usr/bin/env node
/**
 * מכין תמונה לדף: מסובב לפי EXIF, מטשטש אזורים רגישים, חותך, מקטין, דוחס ל-webp
 * עד שהמשקל מתחת לתקרה של התפקיד, ושומר ב-public/assets/<שם>.webp בלי שום metadata.
 *
 * שימוש:
 *   node scripts/optimize-images.mjs <קובץ-מקור> <שם-יעד> --role hero|inline|thumb
 *        [--blur x,y,w,h ...] [--crop x,y,w,h] [--force]
 *   node scripts/optimize-images.mjs <קובץ-מקור> --info      ← רק מידות (אחרי סיבוב)
 *
 * הקואורדינטות של --blur ו---crop בפיקסלים של המקור, כמו שהוא נראה ישר (אחרי סיבוב EXIF).
 * --blur אפשר כמה פעמים. הטשטוש קורה לפני החיתוך, ולכן שניהם באותן קואורדינטות.
 *
 * הלוגיקה ב-optimizeImage (מיוצאת, עם בדיקות ב-tests/optimize-images.test.ts).
 */
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import sharp from "sharp";

/** תקרות לפי תפקיד. KB = 1000 בתים, כמו ב-Finder. */
export const ROLES = {
  hero: { maxWidth: 2000, maxBytes: 200_000 },
  inline: { maxWidth: 1200, maxBytes: 100_000 },
  thumb: { maxWidth: 600, maxBytes: 50_000 },
};

/** האיכות יורדת בצעדים. אם גם 40 כבד מדי, מקטינים את הרוחב ומתחילים שוב מלמעלה. */
export const QUALITIES = [82, 76, 70, 64, 58, 52, 46, 40];
const SHRINK = 0.85;
const MIN_WIDTH = 160;

export const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SITE_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const DEFAULT_OUT_DIR = join(SITE_ROOT, "public", "assets");

/** "x,y,w,h" ← {x,y,w,h}. מספרים שלמים, x,y ≥ 0, w,h > 0. */
export function parseRect(text, flag = "--blur") {
  const parts = String(text)
    .split(",")
    .map((s) => s.trim());
  const nums = parts.map((s) => (/^\d+$/.test(s) ? Number(s) : NaN));
  if (parts.length !== 4 || nums.some((n) => Number.isNaN(n))) {
    throw new Error(
      `${flag} צריך ארבעה מספרים שלמים בפורמט x,y,w,h (למשל 120,340,400,60). קיבלתי: "${text}"`,
    );
  }
  const [x, y, w, h] = nums;
  if (w === 0 || h === 0)
    throw new Error(
      `${flag}: רוחב וגובה חייבים להיות גדולים מ-0. קיבלתי: "${text}"`,
    );
  return { x, y, w, h };
}

/** חותך מלבן לגבולות התמונה. מחזיר null אם לא נשאר כלום. */
function clampRect(r, width, height) {
  const x = Math.min(r.x, width);
  const y = Math.min(r.y, height);
  const w = Math.min(r.x + r.w, width) - x;
  const h = Math.min(r.y + r.h, height) - y;
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

function fmtRect(r) {
  return `${r.x},${r.y},${r.w},${r.h}`;
}

/** קורא את המקור, מסובב לפי EXIF, וממיר ל-sRGB של 8 ביט (פיקסלים גולמיים). */
async function loadUpright(input) {
  if (!existsSync(input)) throw new Error(`לא מצאתי את הקובץ: ${input}`);
  try {
    const { data, info } = await sharp(input)
      .autoOrient()
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    return {
      data,
      width: info.width,
      height: info.height,
      channels: info.channels,
    };
  } catch {
    throw new Error(
      `לא הצלחתי לפתוח את התמונה: ${input}. ` +
        "אם זה קובץ HEIC מאייפון, לייצא אותו כ-JPG (או לשלוח אותו לעצמכם בוואטסאפ ולשמור משם) ולנסות שוב.",
    );
  }
}

/** מידות התמונה כמו שהיא נראית ישר (אחרי סיבוב EXIF). בשביל להעריך קואורדינטות. */
export async function imageInfo(input) {
  const img = await loadUpright(input);
  return { width: img.width, height: img.height };
}

/**
 * טשטוש שאי אפשר לשחזר, בתוך המלבן בלבד (הפיקסלים בחוץ לא משתנים):
 * 1. פיקסליזציה בבלוקים גדולים (לפחות חצי מהצד הקצר) — המידע המקורי מתמצע ונעלם.
 * 2. רעש אקראי — כדי שאי אפשר יהיה "לנחש" את המקור מהממוצעים.
 * 3. טשטוש גאוסי חזק — שייראה רך ולא כמו משבצות.
 * משנה את data במקום.
 */
export async function redactRect(img, rect) {
  const { data, width, channels } = img;
  const color = Math.min(channels, 3); // לא נוגעים בשקיפות
  const block = Math.max(12, Math.ceil(Math.min(rect.w, rect.h) / 2));

  for (let by = rect.y; by < rect.y + rect.h; by += block) {
    for (let bx = rect.x; bx < rect.x + rect.w; bx += block) {
      const ex = Math.min(bx + block, rect.x + rect.w);
      const ey = Math.min(by + block, rect.y + rect.h);
      const sum = [0, 0, 0];
      let n = 0;
      for (let y = by; y < ey; y++) {
        for (let x = bx; x < ex; x++) {
          const i = (y * width + x) * channels;
          for (let c = 0; c < color; c++) sum[c] += data[i + c];
          n++;
        }
      }
      for (let y = by; y < ey; y++) {
        for (let x = bx; x < ex; x++) {
          const i = (y * width + x) * channels;
          for (let c = 0; c < color; c++) data[i + c] = Math.round(sum[c] / n);
        }
      }
    }
  }

  const noise = randomBytes(rect.w * rect.h * color);
  let k = 0;
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const i = (y * width + x) * channels;
      for (let c = 0; c < color; c++) {
        const v = data[i + c] + ((noise[k++] % 33) - 16);
        data[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }

  // טשטוש של המלבן בלבד: מחלצים, מטשטשים, ומחזירים למקום
  const region = Buffer.alloc(rect.w * rect.h * channels);
  for (let y = 0; y < rect.h; y++) {
    const from = ((rect.y + y) * width + rect.x) * channels;
    data.copy(region, y * rect.w * channels, from, from + rect.w * channels);
  }
  const blurred = await sharp(region, {
    raw: { width: rect.w, height: rect.h, channels },
  })
    .blur(Math.max(4, block / 2))
    .raw()
    .toBuffer();
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const i = ((rect.y + y) * width + rect.x + x) * channels;
      const j = (y * rect.w + x) * channels;
      for (let c = 0; c < color; c++) data[i + c] = blurred[j + c];
    }
  }
}

/**
 * הפונקציה הראשית.
 * @param {object} o
 * @param {string} o.input        קובץ המקור
 * @param {string} o.name         שם היעד (בלי סיומת): אותיות לטיניות קטנות, ספרות ומקפים
 * @param {"hero"|"inline"|"thumb"} o.role
 * @param {Array<{x:number,y:number,w:number,h:number}|string>} [o.blurs]
 * @param {{x:number,y:number,w:number,h:number}|string} [o.crop]
 * @param {boolean} [o.force]     לדרוס קובץ קיים
 * @param {string} [o.outDir]     ברירת מחדל: public/assets של האתר
 * @returns {Promise<{file:string,width:number,height:number,bytes:number,quality:number,source:{width:number,height:number},notes:string[]}>}
 */
export async function optimizeImage({
  input,
  name,
  role,
  blurs = [],
  crop,
  force = false,
  outDir = DEFAULT_OUT_DIR,
}) {
  if (typeof name !== "string" || !NAME_RE.test(name)) {
    throw new Error(
      `שם היעד "${name ?? ""}" לא תקין. מותר רק אותיות לטיניות קטנות, ספרות ומקפים, בלי סיומת ובלי רווחים. למשל: hero-dana או whatsapp-review-1`,
    );
  }
  const spec = ROLES[role];
  if (!spec)
    throw new Error(
      `--role חייב להיות hero, inline או thumb. קיבלתי: "${role ?? ""}"`,
    );

  const file = join(outDir, `${name}.webp`);
  if (existsSync(file) && !force) {
    throw new Error(
      `כבר יש תמונה בשם ${name}.webp. לבחור שם אחר, או להוסיף --force כדי להחליף אותה.`,
    );
  }

  const img = await loadUpright(input);
  const notes = [];

  for (const b of blurs) {
    const r = typeof b === "string" ? parseRect(b, "--blur") : b;
    const c = clampRect(r, img.width, img.height);
    if (!c) {
      throw new Error(
        `--blur ${fmtRect(r)} כולו מחוץ לתמונה (המידות ${img.width}×${img.height}). לבדוק את הקואורדינטות.`,
      );
    }
    if (fmtRect(c) !== fmtRect(r))
      notes.push(`--blur ${fmtRect(r)} חרג מהתמונה, וטושטש ${fmtRect(c)}`);
    await redactRect(img, c);
  }

  let area = { x: 0, y: 0, w: img.width, h: img.height };
  if (crop) {
    const r = typeof crop === "string" ? parseRect(crop, "--crop") : crop;
    const c = clampRect(r, img.width, img.height);
    if (!c) {
      throw new Error(
        `--crop ${fmtRect(r)} כולו מחוץ לתמונה (המידות ${img.width}×${img.height}). לבדוק את הקואורדינטות.`,
      );
    }
    if (fmtRect(c) !== fmtRect(r))
      notes.push(`--crop ${fmtRect(r)} חרג מהתמונה, ונחתך ${fmtRect(c)}`);
    area = c;
  }

  const raw = { width: img.width, height: img.height, channels: img.channels };
  let width = Math.min(area.w, spec.maxWidth);
  for (;;) {
    const resized = await sharp(img.data, { raw })
      .extract({ left: area.x, top: area.y, width: area.w, height: area.h })
      .resize({ width, withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const r = resized.info;
    for (const quality of QUALITIES) {
      // sharp לא כותב metadata אלא אם מבקשים (withMetadata/keepMetadata). לא מבקשים.
      const out = await sharp(resized.data, {
        raw: { width: r.width, height: r.height, channels: r.channels },
      })
        .webp({ quality, effort: 5 })
        .toBuffer();
      if (out.length <= spec.maxBytes) {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, out);
        return {
          file,
          width: r.width,
          height: r.height,
          bytes: out.length,
          quality,
          source: { width: img.width, height: img.height },
          notes,
        };
      }
    }
    const next = Math.floor(width * SHRINK);
    if (next < MIN_WIDTH) {
      throw new Error(
        `לא הצלחתי להוריד את התמונה מתחת ל-${spec.maxBytes / 1000}KB גם ברוחב ${width}. לנסות role אחר או תמונה פשוטה יותר.`,
      );
    }
    width = next;
  }
}

export function formatResult(res, root = SITE_ROOT) {
  const rel = relative(root, res.file).split("\\").join("/");
  return `נשמר ${rel} · ${res.width}×${res.height} פיקסלים · ${Math.round(res.bytes / 1000)}KB · איכות ${res.quality}`;
}

async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        role: { type: "string" },
        blur: { type: "string", multiple: true },
        crop: { type: "string" },
        force: { type: "boolean" },
        info: { type: "boolean" },
      },
    });
  } catch (e) {
    throw new Error(
      "לא הבנתי את הפקודה. השימוש: node scripts/optimize-images.mjs <קובץ-מקור> <שם-יעד> --role hero|inline|thumb [--blur x,y,w,h ...] [--crop x,y,w,h] [--force]",
    );
  }
  const { values, positionals } = parsed;
  const [input, name] = positionals;
  if (!input)
    throw new Error(
      "חסר קובץ מקור. למשל: node scripts/optimize-images.mjs ../images-inbox/IMG_2041.jpg hero-dana --role hero",
    );

  if (values.info) {
    const i = await imageInfo(resolve(input));
    console.log(
      `מידות (כמו שהתמונה נראית ישר): ${i.width}×${i.height} פיקסלים`,
    );
    return;
  }
  if (!name) throw new Error("חסר שם יעד. למשל: hero-dana");
  if (positionals.length > 2)
    throw new Error(
      `יש יותר מדי מילים בפקודה: ${positionals.slice(2).join(" ")}. נתיב עם רווחים עוטפים במירכאות.`,
    );

  const res = await optimizeImage({
    input: resolve(input),
    name,
    role: values.role,
    blurs: values.blur ?? [],
    crop: values.crop,
    force: values.force ?? false,
  });
  for (const n of res.notes) console.log(`שימו לב: ${n}`);
  console.log(formatResult(res));
}

const isMain = (() => {
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
})();

if (isMain) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`שגיאה: ${e.message}`);
    process.exit(1);
  });
}
