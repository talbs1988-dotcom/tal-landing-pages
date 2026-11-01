import { describe, expect, it } from "vitest";
import { effectiveCollects } from "@/lib/legal";

const off = { form: true, pixel: false, analytics: false };

describe("effectiveCollects", () => {
  it("בלי משתני פיקסל: כמו ב-config", () => {
    expect(effectiveCollects(off, {})).toEqual(off);
  });

  it("פיקסל בדפדפן מוגדר (מזהה תקין): pixel=true גם אם ב-config שכחו", () => {
    expect(
      effectiveCollects(off, { NEXT_PUBLIC_META_PIXEL_ID: "123456789012345" })
        .pixel,
    ).toBe(true);
  });

  it("CAPI מוגדר בשרת (מזהה + טוקן): pixel=true", () => {
    expect(
      effectiveCollects(off, {
        META_PIXEL_ID: "123456789012345",
        META_CAPI_TOKEN: "tok",
      }).pixel,
    ).toBe(true);
    expect(
      effectiveCollects(off, { META_PIXEL_ID: "123456789012345" }).pixel,
    ).toBe(false);
    expect(effectiveCollects(off, { META_CAPI_TOKEN: "tok" }).pixel).toBe(
      false,
    );
  });

  it("מזהה לא תקין לא נחשב (הפיקסל גם לא נטען איתו)", () => {
    expect(
      effectiveCollects(off, { NEXT_PUBLIC_META_PIXEL_ID: "abc" }).pixel,
    ).toBe(false);
    expect(
      effectiveCollects(off, { NEXT_PUBLIC_META_PIXEL_ID: "" }).pixel,
    ).toBe(false);
  });

  it("config עם pixel=true נשאר true גם בלי משתנים", () => {
    expect(effectiveCollects({ ...off, pixel: true }, {}).pixel).toBe(true);
  });

  it("שאר השדות לא משתנים", () => {
    const r = effectiveCollects(
      { form: false, pixel: false, analytics: true },
      {
        NEXT_PUBLIC_META_PIXEL_ID: "123456789012345",
      },
    );
    expect(r).toEqual({ form: false, pixel: true, analytics: true });
  });
});
