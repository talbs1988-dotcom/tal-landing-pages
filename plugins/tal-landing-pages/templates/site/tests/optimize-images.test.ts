import { afterEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
// הטיפוסים ב-scripts/optimize-images.d.mts
import {
  optimizeImage,
  imageInfo,
  parseRect,
  redactRect,
  ROLES,
} from "../scripts/optimize-images.mjs";

const dirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "img-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

/** תמונה "אמיתית" עם פרטים: רעש קטן שמוגדל ומטושטש, כדי שהדחיסה תעבוד קשה. */
async function detailedJpeg(path: string, width: number, height: number) {
  const sw = Math.ceil(width / 8);
  const sh = Math.ceil(height / 8);
  const buf = await sharp(randomBytes(sw * sh * 3), {
    raw: { width: sw, height: sh, channels: 3 },
  })
    .resize(width, height, { kernel: "cubic" })
    .jpeg({ quality: 95 })
    .toBuffer();
  writeFileSync(path, buf);
}

/** תמונה חלקה: צד שמאל אדום, צד ימין כחול, עם פסים שחורים באמצע (במקום "טקסט"). */
async function patternPng(path: string, width = 400, height = 300) {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const stripe = x >= 150 && x < 250 && y >= 120 && y < 180 && x % 6 < 3;
      if (stripe) continue; // שחור
      if (x < width / 2) data[i] = 220;
      else data[i + 2] = 220;
      data[i + 1] = 40;
    }
  }
  await sharp(data, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(path);
}

async function rawOf(path: string) {
  const { data, info } = await sharp(path)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, ...info };
}

/** הפרש ממוצע בין שתי תמונות בתוך/מחוץ למלבן. */
function meanDiff(
  a: { data: Buffer; width: number; channels: number },
  b: { data: Buffer },
  rect: { x: number; y: number; w: number; h: number },
  inside: boolean,
  height: number,
  margin = 0,
) {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < a.width; x++) {
      const inR =
        x >= rect.x &&
        x < rect.x + rect.w &&
        y >= rect.y &&
        y < rect.y + rect.h;
      const nearR =
        x >= rect.x - margin &&
        x < rect.x + rect.w + margin &&
        y >= rect.y - margin &&
        y < rect.y + rect.h + margin;
      if (inside ? !inR : nearR) continue;
      const i = (y * a.width + x) * a.channels;
      for (let c = 0; c < 3; c++)
        sum += Math.abs(a.data[i + c] - b.data[i + c]);
      n += 3;
    }
  }
  return sum / n;
}

describe("optimizeImage: תקרות", () => {
  it.each([
    ["hero", 3200, 2100],
    ["inline", 2400, 1600],
    ["thumb", 1500, 1000],
  ] as const)(
    "%s: רוחב ומשקל מתחת לתקרה",
    async (role, w, h) => {
      const d = tmp();
      const src = join(d, "big.jpg");
      await detailedJpeg(src, w, h);
      const res = await optimizeImage({
        input: src,
        name: `test-${role}`,
        role,
        outDir: d,
      });
      const spec = ROLES[role];
      expect(res.width).toBeLessThanOrEqual(spec.maxWidth);
      expect(res.bytes).toBeLessThanOrEqual(spec.maxBytes);
      expect(statSync(res.file).size).toBe(res.bytes);
      const meta = await sharp(res.file).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(res.width);
      expect(meta.height).toBe(res.height);
    },
    60_000,
  );

  it("לא מגדיל תמונה קטנה", async () => {
    const d = tmp();
    const src = join(d, "small.png");
    await patternPng(src, 400, 300);
    const res = await optimizeImage({
      input: src,
      name: "small",
      role: "hero",
      outDir: d,
    });
    expect(res.width).toBe(400);
    expect(res.height).toBe(300);
  });

  it("מקטין את הרוחב כשגם איכות 40 כבדה מדי", async () => {
    const d = tmp();
    const src = join(d, "noise.png");
    // רעש מלא: אי אפשר לדחוס אותו לתקרה של thumb ברוחב 600
    await sharp(randomBytes(600 * 400 * 3), {
      raw: { width: 600, height: 400, channels: 3 },
    })
      .png()
      .toFile(src);
    const res = await optimizeImage({
      input: src,
      name: "noise",
      role: "thumb",
      outDir: d,
    });
    expect(res.bytes).toBeLessThanOrEqual(ROLES.thumb.maxBytes);
    expect(res.width).toBeLessThan(600);
  }, 60_000);
});

describe("optimizeImage: metadata וסיבוב", () => {
  it("מסובב לפי EXIF ומוחק את כל ה-metadata, כולל GPS", async () => {
    const d = tmp();
    const src = join(d, "phone.jpg");
    await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#c33" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .withExifMerge({
        IFD0: { Make: "TestPhone", Model: "X1", Copyright: "secret-owner" },
        IFD3: {
          GPSLatitudeRef: "N",
          GPSLatitude: "32/1 4/1 0/1",
          GPSLongitudeRef: "E",
          GPSLongitude: "34/1 46/1 0/1",
        },
      })
      .toFile(src);
    const before = await sharp(src).metadata();
    expect(before.orientation).toBe(6);
    expect(before.exif).toBeDefined();

    const res = await optimizeImage({
      input: src,
      name: "phone",
      role: "inline",
      outDir: d,
    });
    // אוריינטציה 6 = סיבוב של 90 מעלות: 300×200 הופך ל-200×300
    expect(res.width).toBe(200);
    expect(res.height).toBe(300);

    const after = await sharp(res.file).metadata();
    expect(after.exif).toBeUndefined();
    expect(after.icc).toBeUndefined();
    expect(after.xmp).toBeUndefined();
    expect(after.orientation).toBeUndefined();
    const bytes = readFileSync(res.file).toString("latin1");
    for (const s of [
      "EXIF",
      "XMP ",
      "ICCP",
      "TestPhone",
      "secret-owner",
      "GPS",
    ])
      expect(bytes).not.toContain(s);
  });

  it("imageInfo מחזיר מידות אחרי סיבוב", async () => {
    const d = tmp();
    const src = join(d, "rot.jpg");
    await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#333" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toFile(src);
    expect(await imageInfo(src)).toEqual({ width: 200, height: 300 });
  });
});

describe("טשטוש", () => {
  const rect = { x: 140, y: 110, w: 120, h: 80 };

  it("redactRect משנה רק את הפיקסלים בתוך המלבן", async () => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    const orig = await rawOf(src);
    const img = {
      data: Buffer.from(orig.data),
      width: orig.width,
      height: orig.height,
      channels: orig.channels,
    };
    await redactRect(img, rect);

    let outsideChanged = 0;
    let insideChanged = 0;
    for (let y = 0; y < orig.height; y++) {
      for (let x = 0; x < orig.width; x++) {
        const inR =
          x >= rect.x &&
          x < rect.x + rect.w &&
          y >= rect.y &&
          y < rect.y + rect.h;
        const i = (y * orig.width + x) * orig.channels;
        const same = [0, 1, 2].every(
          (c) => img.data[i + c] === orig.data[i + c],
        );
        if (!same) inR ? insideChanged++ : outsideChanged++;
      }
    }
    expect(outsideChanged).toBe(0);
    expect(insideChanged).toBeGreaterThan(rect.w * rect.h * 0.8);
  });

  it("הפסים (ה'טקסט') נעלמים: אין יותר מעברים חדים בתוך המלבן", async () => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    const orig = await rawOf(src);
    const img = {
      data: Buffer.from(orig.data),
      width: orig.width,
      height: orig.height,
      channels: orig.channels,
    };
    await redactRect(img, rect);
    // בשורה שעוברת דרך הפסים: במקור יש קפיצות של 220 בין פיקסלים צמודים
    const y = 150;
    let maxJump = 0;
    for (let x = 151; x < 249; x++) {
      const a = (y * orig.width + x) * 3;
      const b = (y * orig.width + x - 1) * 3;
      maxJump = Math.max(
        maxJump,
        Math.abs(img.data[a] - img.data[b]),
        Math.abs(img.data[a + 2] - img.data[b + 2]),
      );
    }
    expect(maxJump).toBeLessThan(40);
  });

  it("מקצה לקצה: האזור משתנה הרבה, מחוץ לו כמעט כלום", async () => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    const plain = await optimizeImage({
      input: src,
      name: "plain",
      role: "inline",
      outDir: d,
    });
    const blurred = await optimizeImage({
      input: src,
      name: "blurred",
      role: "inline",
      outDir: d,
      blurs: [`${rect.x},${rect.y},${rect.w},${rect.h}`],
    });
    const a = await rawOf(plain.file);
    const b = await rawOf(blurred.file);
    const inside = meanDiff(a, b, rect, true, a.height);
    const outside = meanDiff(a, b, rect, false, a.height, 16); // webp עובד בבלוקים של 16
    expect(inside).toBeGreaterThan(25);
    expect(outside).toBeLessThan(3);
  });

  it("כמה מלבנים, ומלבן שחורג נחתך לגבולות עם הערה", async () => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    const res = await optimizeImage({
      input: src,
      name: "multi",
      role: "inline",
      outDir: d,
      blurs: ["10,10,50,50", "350,250,100,100"],
    });
    expect(res.notes).toHaveLength(1);
    expect(res.notes[0]).toContain("350,250,50,50");
  });

  it("מלבן שכולו מחוץ לתמונה: שגיאה", async () => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    await expect(
      optimizeImage({
        input: src,
        name: "out",
        role: "inline",
        outDir: d,
        blurs: ["500,500,10,10"],
      }),
    ).rejects.toThrow(/מחוץ לתמונה/);
  });

  it("parseRect דוחה פורמט לא תקין", () => {
    expect(parseRect("1,2,3,4")).toEqual({ x: 1, y: 2, w: 3, h: 4 });
    expect(() => parseRect("1,2,3")).toThrow(/x,y,w,h/);
    expect(() => parseRect("1,2,-3,4")).toThrow(/x,y,w,h/);
    expect(() => parseRect("1,2,0,4")).toThrow(/גדולים מ-0/);
  });
});

describe("חיתוך", () => {
  it("--crop חותך לפי קואורדינטות המקור", async () => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    const res = await optimizeImage({
      input: src,
      name: "crop",
      role: "inline",
      outDir: d,
      crop: "0,0,200,150",
    });
    expect(res.width).toBe(200);
    expect(res.height).toBe(150);
    const { data } = await rawOf(res.file);
    // כל החיתוך מהצד השמאלי, האדום
    expect(data[0]).toBeGreaterThan(180);
    expect(data[2]).toBeLessThan(60);
  });
});

describe("שם וקובץ קיים", () => {
  it.each([
    "Hero",
    "hero image",
    "hero.webp",
    "תמונה",
    "-hero",
    "hero-",
    "hero--1",
    "hero_1",
    "",
  ])('דוחה שם לא תקין: "%s"', async (name) => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    await expect(
      optimizeImage({ input: src, name, role: "inline", outDir: d }),
    ).rejects.toThrow(/אותיות לטיניות קטנות, ספרות ומקפים/);
    expect(existsSync(join(d, `${name}.webp`))).toBe(false);
  });

  it("מקבל שם תקין עם ספרות ומקפים", async () => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    const res = await optimizeImage({
      input: src,
      name: "whatsapp-review-2",
      role: "thumb",
      outDir: d,
    });
    expect(res.file).toBe(join(d, "whatsapp-review-2.webp"));
  });

  it("role לא תקין: שגיאה", async () => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    await expect(
      optimizeImage({ input: src, name: "x", role: "banner", outDir: d }),
    ).rejects.toThrow(/hero, inline או thumb/);
  });

  it("לא דורס קובץ קיים בלי force, ודורס עם force", async () => {
    const d = tmp();
    const src = join(d, "p.png");
    await patternPng(src);
    const target = join(d, "same.webp");
    writeFileSync(target, "קובץ ישן");
    await expect(
      optimizeImage({ input: src, name: "same", role: "inline", outDir: d }),
    ).rejects.toThrow(/--force/);
    expect(readFileSync(target, "utf8")).toBe("קובץ ישן");

    await optimizeImage({
      input: src,
      name: "same",
      role: "inline",
      outDir: d,
      force: true,
    });
    expect((await sharp(target).metadata()).format).toBe("webp");
  });

  it("קובץ מקור חסר או לא תמונה: שגיאה בעברית", async () => {
    const d = tmp();
    await expect(
      optimizeImage({
        input: join(d, "nope.jpg"),
        name: "x",
        role: "inline",
        outDir: d,
      }),
    ).rejects.toThrow(/לא מצאתי/);
    const bad = join(d, "bad.jpg");
    writeFileSync(bad, "זה לא באמת jpg");
    await expect(
      optimizeImage({ input: bad, name: "x", role: "inline", outDir: d }),
    ).rejects.toThrow(/HEIC/);
  });
});
