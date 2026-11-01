import { describe, expect, it } from "vitest";
import { site } from "@/site.config";
import { TODO, isTodo, isFilled } from "@/lib/todo";
import { siteUrl } from "@/lib/siteUrl";

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

describe("site.config", () => {
  it("נטען ויש בו את כל החלקים", () => {
    expect(site.business).toBeDefined();
    expect(site.page).toBeDefined();
    expect(site.brand).toBeDefined();
    expect(site.form).toBeDefined();
    expect(site.collects).toBeDefined();
  });

  it("בתבנית הריקה יש לפחות TODO אחד", () => {
    expect(strings(site).filter(isTodo).length).toBeGreaterThan(0);
  });

  it("צבעי ברירת המחדל הם hex תקין ועוברים ניגודיות AA", () => {
    for (const color of Object.values(site.brand)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(
      contrast(site.brand.text, site.brand.background),
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", site.brand.primary)).toBeGreaterThanOrEqual(4.5);
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
