import { describe, expect, it } from "vitest";
import { bannerLayout, closeFocusTarget, focusTitleOnAutoOpen } from "@/lib/banner";

describe("bannerLayout: מקום הבאנר וכפתור הנגישות", () => {
  it("באנר רגיל בטלפון: הכפתור עולה מעליו, ו-scroll-padding מכסה את שניהם", () => {
    // 320×568, באנר בגובה 380 (top=176), לכל הרוחב
    const l = bannerLayout({ innerHeight: 568, top: 176, left: 12 });
    expect(l.occupied).toBe(400);
    expect(l.buttonLift).toBe(400);
    expect(l.scrollPadding).toBeGreaterThanOrEqual(l.occupied);
  });

  it("באנר גבוה (טקסט 130%): הכפתור נשאר על המסך", () => {
    // הבאנר מוגבל לגובה המסך, top=12
    const l = bannerLayout({ innerHeight: 568, top: 12, left: 12 });
    const buttonTopFromBottom = 16 + (l.buttonLift ?? 0) + 48;
    expect(buttonTopFromBottom).toBeLessThanOrEqual(568);
    expect(l.buttonLift).toBeGreaterThanOrEqual(0);
    // scroll-padding לא גדול מהמסך
    expect(l.scrollPadding).toBeLessThan(568);
  });

  it("טלפון שוכב (375 גובה): הכפתור עדיין על המסך", () => {
    const l = bannerLayout({ innerHeight: 375, top: -14, left: 63 });
    expect(16 + (l.buttonLift ?? 0) + 48).toBeLessThanOrEqual(375);
  });

  it("באנר בצד ימין (דסקטופ): הכפתור לא זז, ה-scroll-padding לפחות 88", () => {
    const l = bannerLayout({ innerHeight: 900, top: 600, left: 900 });
    expect(l.buttonLift).toBeNull();
    expect(l.scrollPadding).toBeGreaterThanOrEqual(88);
    expect(l.scrollPadding).toBeGreaterThanOrEqual(l.occupied);
  });
});

describe("פוקוס בבאנר", () => {
  it("פתיחה אוטומטית: מעבירים לכותרת רק אם הפוקוס היה על body", () => {
    expect(focusTitleOnAutoOpen({ activeIsBody: true })).toBe(true);
    expect(focusTitleOnAutoOpen({ activeIsBody: false })).toBe(false);
  });

  it("סגירה: הפוקוס בבאנר (או על body) ← חוזר לאלמנט הקודם אם הוא עוד בדף, אחרת ל-main", () => {
    expect(closeFocusTarget({ inPanel: true, onBody: false, savedConnected: true })).toBe("saved");
    expect(closeFocusTarget({ inPanel: true, onBody: false, savedConnected: false })).toBe("main");
    expect(closeFocusTarget({ inPanel: false, onBody: true, savedConnected: true })).toBe("saved");
    expect(closeFocusTarget({ inPanel: false, onBody: true, savedConnected: false })).toBe("main");
  });

  it("סגירה כשהפוקוס כבר במקום אחר בדף (למשל בשדה): לא מזיזים אותו", () => {
    expect(closeFocusTarget({ inPanel: false, onBody: false, savedConnected: true })).toBe("stay");
  });
});
