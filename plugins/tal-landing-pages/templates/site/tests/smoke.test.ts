import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { site } from "@/site.config";
import { TODO, isTodo, isFilled } from "@/lib/todo";
import { siteUrl } from "@/lib/siteUrl";
import { PRISTINE } from "./templateState";

/** כל הערכים (מחרוזות) בעומק האובייקט */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}

/** יחס ניגודיות לפי WCAG 2 */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** צבע hex שמונח בשקיפות alpha על רקע (hex), כמו שהעין רואה אותו */
function blend(fg: string, bg: string, alpha: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  const out = [1, 3, 5].map((i) =>
    Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha)),
  );
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** כל קבצי ה-tsx ב-app/ וב-components/ */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return tsxFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

/**
 * טקסט שקוף: כל class של opacity-NN או text-…/NN (בלי מצב כמו disabled: או hover:).
 * מחזיר את השקיפות ואיפה היא.
 */
function transparentText(): { where: string; alpha: number }[] {
  const out: { where: string; alpha: number }[] = [];
  for (const file of [...tsxFiles(join(ROOT, "app")), ...tsxFiles(join(ROOT, "components"))]) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      const re = /(?<![\w:-])(?:opacity-(\d{1,3})|text-(?:foreground|black|current|inherit)\/(\d{1,3}))(?![\w-])/g;
      for (const m of line.matchAll(re)) {
        const n = Number(m[1] ?? m[2]);
        if (n < 100)
          out.push({ where: `${relative(ROOT, file)}:${i + 1}`, alpha: n / 100 });
      }
    });
  }
  return out;
}

describe("site.config", () => {
  it("נטען ויש בו את כל החלקים", () => {
    expect(site.business).toBeDefined();
    expect(site.page).toBeDefined();
    expect(site.brand).toBeDefined();
    expect(site.form).toBeDefined();
    expect(site.collects).toBeDefined();
  });

  it.skipIf(!PRISTINE)("בתבנית: מייל וטלפון חובה, ושירות כברירת מחדל בתקנון", () => {
    expect(site.form.email).toBe("required");
    expect(site.form.phone).toBe("required");
    expect(site.legal.offerType).toBe("service");
  });

  // רק בתבנית הריקה: בדף שמילאו עד הסוף אין TODO, וזה המצב הרצוי
  it.skipIf(!PRISTINE)("בתבנית הריקה יש לפחות TODO אחד", () => {
    expect(strings(site).filter(isTodo).length).toBeGreaterThan(0);
  });

  // רץ על הצבעים האמיתיים של הדף בכוונה: מיתוג שלא עובר ניגודיות הוא ממצא אמיתי
  it("צבעי המותג הם hex תקין ועוברים ניגודיות AA", () => {
    for (const color of Object.values(site.brand)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(
      contrast(site.brand.text, site.brand.background),
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", site.brand.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it("טקסט שקוף (opacity) עדיין עובר 4.5:1 בצבעי המותג, על הרקע ועל כרטיס לבן", () => {
    const failures: string[] = [];
    for (const { where, alpha } of transparentText()) {
      for (const bg of [site.brand.background, "#FFFFFF"]) {
        const seen = blend(site.brand.text, bg, alpha);
        const ratio = contrast(seen, bg);
        if (ratio < 4.5)
          failures.push(`${where}: שקיפות ${alpha} על ${bg} נותנת ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("הבדיקה של טקסט שקוף תופסת צבע אפור שעובר רק בצבע מלא", () => {
    // #4B5563 על #FAFAF9 עובר (7.2) בצבע מלא, אבל נכשל בשקיפות 0.7 על לבן
    expect(contrast("#4B5563", "#FAFAF9")).toBeGreaterThan(4.5);
    expect(contrast(blend("#4B5563", "#FFFFFF", 0.7), "#FFFFFF")).toBeLessThan(4.5);
  });

  it("אין שקיפות על טקסט בטופס, ביידוע הפרטיות ובפוטר", () => {
    const where = transparentText().map((t) => t.where);
    for (const f of ["components/LeadFormClient.tsx", "components/Footer.tsx", "components/AccessibilityWidget.tsx"])
      expect(where.filter((w) => w.startsWith(f))).toEqual([]);
  });

  it("placeholder: צבע מלא שעובר 4.5:1 על לבן, ובמצב ניגודיות צבע אחר ונטוי", () => {
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    const base = /@layer base\s*\{[\s\S]*?::placeholder\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    const color = /color:\s*(#[0-9a-f]{6})/i.exec(base)?.[1] ?? "";
    expect(color).not.toBe("");
    expect(base).toMatch(/opacity:\s*1/);
    expect(contrast(color, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    const hc = /html\.a11y-contrast ::placeholder\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(hc).toMatch(/font-style:\s*italic/);
    const hcColor = /color:\s*(#[0-9a-f]{6})/i.exec(hc)?.[1]?.toLowerCase() ?? "";
    expect(hcColor).not.toBe("");
    expect(hcColor).not.toBe("#ffffff");
    expect(hcColor).not.toBe("#d4d4d4");
    expect(contrast(hcColor, "#000000")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("lib/todo", () => {
  it("TODO הוא הסימון הקבוע", () => {
    expect(TODO).toBe("[למלא]");
  });

  it("isTodo מזהה את הסימון, גם בתוך טקסט", () => {
    expect(isTodo(TODO)).toBe(true);
    expect(isTodo(`רחוב ${TODO} 5`)).toBe(true);
    expect(isTodo("ערך אמיתי")).toBe(false);
    expect(isTodo(undefined)).toBe(false);
    expect(isTodo(3)).toBe(false);
  });

  it("isFilled דורש טקסט אמיתי", () => {
    expect(isFilled("ערך")).toBe(true);
    expect(isFilled("")).toBe(false);
    expect(isFilled("   ")).toBe(false);
    expect(isFilled(TODO)).toBe(false);
    expect(isFilled(null)).toBe(false);
  });
});

describe("lib/siteUrl", () => {
  it("כתובת שלא מולאה או לא תקינה נופלת ל-localhost", () => {
    expect(siteUrl(TODO).href).toBe("http://localhost:3000/");
    expect(siteUrl("לא כתובת").href).toBe("http://localhost:3000/");
    expect(siteUrl("javascript:alert(1)").href).toBe("http://localhost:3000/");
  });

  it("כתובת בלי https:// מקבלת אותו אוטומטית", () => {
    expect(siteUrl("www.example.co.il").href).toBe("https://www.example.co.il/");
    expect(siteUrl("example.co.il").origin).toBe("https://example.co.il");
    expect(siteUrl("  example.co.il/  ").origin).toBe("https://example.co.il");
  });

  it("כתובת תקינה נשמרת", () => {
    expect(siteUrl("https://example.co.il").origin).toBe(
      "https://example.co.il",
    );
  });
});
