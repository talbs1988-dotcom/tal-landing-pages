import { describe, expect, it } from "vitest";
import { bidiUnits, visualText, type BidiUnit } from "@/lib/bidi";

/** תיאור קצר: טקסט + כיוון, ו-"␣" כשיש רווח אחרי */
const show = (units: BidiUnit[]) =>
  units.map((u) => `${u.text}/${u.dir}${u.spaceAfter ? "␣" : ""}`);

/**
 * מה שרואים בפועל, משמאל לימין: row-reverse הופך את סדר היחידות,
 * ו-satori מצייר כל יחידה משמאל לימין כמו שהיא (visualText).
 */
const visual = (units: BidiUnit[]) =>
  [...units]
    .reverse()
    .map((u) => (u.spaceAfter ? " " : "") + visualText(u))
    .join("");

describe("bidiUnits", () => {
  it("עברית בלבד: מילה ליחידה, עם רווחים", () => {
    expect(show(bidiUnits("שלום עולם"))).toEqual(["שלום/rtl␣", "עולם/rtl"]);
  });

  it("כותרת מעורבת: אנגלית נשארת רצף אחד, המקף והמספר בצד הנכון", () => {
    const u = bidiUnits("סדנת Claude Code ב-2026");
    expect(show(u)).toEqual([
      "סדנת/rtl␣",
      "Claude Code/ltr␣",
      "ב/rtl",
      "-/neutral",
      "2026/ltr",
    ]);
    // כמו שדפדפן מציג את המשפט בפסקה מימין לשמאל
    expect(visual(u)).toBe("2026-ב Claude Code תנדס");
  });

  it("פיסוק בסוף מילה עברית עובר לשמאלה", () => {
    const u = bidiUnits("שלום, עולם!");
    expect(show(u)).toEqual([
      "שלום/rtl",
      ",/neutral␣",
      "עולם/rtl",
      "!/neutral",
    ]);
    expect(visual(u)).toBe("!םלוע ,םולש");
  });

  it("פיסוק בתוך מילה עברית (בע\"מ) נשאר בתוכה", () => {
    expect(show(bidiUnits('חברה בע"מ'))).toEqual(["חברה/rtl␣", 'בע"מ/rtl']);
  });

  it("סוגריים מתהפכים בהקשר עברי", () => {
    const u = bidiUnits("מדריך (חינם)");
    expect(visual(u)).toBe("(םניח) ךירדמ");
  });

  it("אחוזים ושקלים נשארים צמודים למספר", () => {
    expect(show(bidiUnits("הנחה של 50%"))).toEqual([
      "הנחה/rtl␣",
      "של/rtl␣",
      "50%/ltr",
    ]);
    expect(show(bidiUnits("רק ₪100"))).toEqual(["רק/rtl␣", "₪100/ltr"]);
  });

  it("מספר בתחילת משפט עברי עומד בימין", () => {
    const u = bidiUnits("3 שלבים לגיוס");
    expect(visual(u)).toBe("סויגל םיבלש 3");
  });

  it("פיסוק אחרי אנגלית בסוף משפט עברי עובר לשמאל", () => {
    const u = bidiUnits("למדו Claude Code.");
    expect(show(u)).toEqual(["למדו/rtl␣", "Claude Code/ltr", "./neutral"]);
  });

  it("אנגלית בלבד: יחידה אחת", () => {
    expect(show(bidiUnits("Claude Code Workshop"))).toEqual([
      "Claude Code Workshop/ltr",
    ]);
  });

  it("רווחים כפולים וטקסט ריק", () => {
    expect(show(bidiUnits("  שלום   עולם  "))).toEqual([
      "שלום/rtl␣",
      "עולם/rtl",
    ]);
    expect(bidiUnits("   ")).toEqual([]);
  });
});

describe("visualText", () => {
  it("הופך מילה עברית, ולא נוגע באנגלית או במספרים", () => {
    expect(visualText({ text: "סדנת", dir: "rtl", spaceAfter: false })).toBe(
      "תנדס",
    );
    expect(
      visualText({ text: "Claude Code", dir: "ltr", spaceAfter: false }),
    ).toBe("Claude Code");
    expect(visualText({ text: "2026", dir: "ltr", spaceAfter: false })).toBe(
      "2026",
    );
  });

  it("ניקוד נשאר על האות שלו", () => {
    // שָׁלוֹם: השין עם שני סימנים, הוא"ו עם חולם
    const word = "\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD";
    const out = visualText({ text: word, dir: "rtl", spaceAfter: false });
    expect(out).toBe("\u05DD\u05D5\u05B9\u05DC\u05E9\u05C1\u05B8");
  });
});
