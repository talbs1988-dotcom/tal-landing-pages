import { describe, expect, it } from "vitest";
import { TODO } from "@/lib/todo";
import {
  ACCESSIBILITY_SECTIONS,
  DELETION_SECTIONS,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  collectedFields,
  display,
  formatAddress,
  formatHebrewDate,
  hasAddress,
  idLabel,
  listHe,
  noticeAddress,
  parseIsoDate,
  vatNote,
  visibleSections,
  type SectionContext,
} from "@/lib/legal";

const NONE: SectionContext = {
  form: false,
  pixel: false,
  analytics: false,
  hasAddress: false,
};
const ids = (defs: readonly { id: string }[]) => defs.map((d) => d.id);

describe("display", () => {
  it("ערך מלא נשאר, חסר הופך ל-TODO גלוי", () => {
    expect(display(" ערך ")).toBe("ערך");
    expect(display("")).toBe(TODO);
    expect(display(TODO)).toBe(TODO);
  });
});

describe("כתובת", () => {
  it("שלושה שדות ריקים = אין כתובת", () => {
    const a = { street: "", city: " ", postalCode: "" };
    expect(hasAddress(a)).toBe(false);
    expect(formatAddress(a)).toBe("");
  });

  it("כתובת שלא מולאה ← TODO אחד", () => {
    expect(formatAddress({ street: TODO, city: TODO, postalCode: TODO })).toBe(
      TODO,
    );
  });

  it("כתובת מלאה בשורה אחת, בלי מיקוד ריק", () => {
    expect(
      formatAddress({ street: "הרצל 5", city: "חיפה", postalCode: "" }),
    ).toBe("הרצל 5, חיפה");
    expect(
      formatAddress({ street: "הרצל 5", city: "חיפה", postalCode: "3303105" }),
    ).toBe("הרצל 5, חיפה, 3303105");
  });

  it("כתובת חלקית: מה שחסר נשאר גלוי", () => {
    expect(
      formatAddress({ street: "הרצל 5", city: TODO, postalCode: "" }),
    ).toBe(`הרצל 5, ${TODO}`);
  });
});

describe("idLabel", () => {
  it("לפי סוג העסק", () => {
    expect(idLabel("עוסק פטור")).toBe("מס' עוסק");
    expect(idLabel("עוסק מורשה")).toBe("מס' עוסק");
    expect(idLabel('חברה בע"מ')).toBe("ח.פ.");
    expect(idLabel("עמותה")).toBe("מס' עמותה");
    expect(idLabel(TODO)).toBe("מס' עוסק / ח.פ.");
  });
});

describe("תאריכים", () => {
  it("parseIsoDate דוחה תאריכים לא אמיתיים", () => {
    expect(parseIsoDate("2026-11-01")?.toISOString()).toBe(
      "2026-11-01T00:00:00.000Z",
    );
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("1/11/2026")).toBeNull();
    expect(parseIsoDate(TODO)).toBeNull();
  });

  it("formatHebrewDate", () => {
    expect(formatHebrewDate("2026-11-01")).toBe("1 בנובמבר 2026");
    expect(formatHebrewDate(TODO)).toBe(TODO);
    expect(formatHebrewDate("")).toBe(TODO);
  });
});

describe("טקסטים לפי ה-config", () => {
  it("listHe מחבר בעברית", () => {
    expect(listHe(["שם", "מייל", "טלפון"])).toBe("שם, מייל וטלפון");
  });

  it('vatNote: עוסק פטור לא גובה מע"מ', () => {
    expect(vatNote("עוסק פטור")).toContain("עוסק פטור");
    expect(vatNote("עוסק מורשה")).toContain('כוללים מע"מ');
    expect(vatNote(TODO)).toContain('כוללים מע"מ');
  });

  it("collectedFields לפי הגדרת הטלפון", () => {
    expect(collectedFields({ phone: "required" })).toEqual([
      { label: "שם", required: true },
      { label: "כתובת מייל", required: true },
      { label: "מספר טלפון", required: true },
    ]);
    expect(collectedFields({ phone: "optional" })[2]).toEqual({
      label: "מספר טלפון",
      required: false,
    });
    expect(collectedFields({ phone: "hidden" })).toHaveLength(2);
  });
});

describe("סעיפים מותנים", () => {
  it("בלי פיקסל, ניתוח וטופס, הסעיפים שלהם לא מופיעים", () => {
    const privacy = ids(visibleSections(PRIVACY_SECTIONS, NONE));
    expect(privacy).not.toContain("pixel");
    expect(privacy).not.toContain("analytics");
    expect(privacy).not.toContain("collected");
    expect(privacy).toContain("rights");
    expect(privacy).toContain("abroad");
    expect(ids(visibleSections(DELETION_SECTIONS, NONE))).not.toContain("meta");
    expect(ids(visibleSections(ACCESSIBILITY_SECTIONS, NONE))).not.toContain(
      "physical",
    );
  });

  it("עם פיקסל, ניתוח, טופס וכתובת, הם מופיעים", () => {
    const all = { form: true, pixel: true, analytics: true, hasAddress: true };
    expect(ids(visibleSections(PRIVACY_SECTIONS, all))).toEqual(
      ids(PRIVACY_SECTIONS),
    );
    expect(ids(visibleSections(DELETION_SECTIONS, all))).toContain("meta");
    expect(ids(visibleSections(ACCESSIBILITY_SECTIONS, all))).toContain(
      "physical",
    );
  });

  it("הסדר נשמר ואין מזהים כפולים", () => {
    for (const defs of [
      PRIVACY_SECTIONS,
      TERMS_SECTIONS,
      ACCESSIBILITY_SECTIONS,
      DELETION_SECTIONS,
    ]) {
      expect(new Set(ids(defs)).size).toBe(defs.length);
    }
    expect(
      ids(visibleSections(PRIVACY_SECTIONS, { ...NONE, pixel: true })),
    ).toEqual(
      ids(PRIVACY_SECTIONS).filter(
        (id) => id !== "analytics" && id !== "collected",
      ),
    );
  });

  it("בתקנון יש #cancellation (הפוטר והטופס מקשרים אליו)", () => {
    expect(ids(TERMS_SECTIONS)).toContain("cancellation");
  });
});

describe("noticeAddress (מען להודעות ביטול ולהחזרות)", () => {
  const empty = { street: "", city: "", postalCode: "" };
  it("כשיש כתובת לעסק: הכתובת עצמה", () => {
    expect(
      noticeAddress({ street: "הרצל 5", city: "חיפה", postalCode: "" }, "ת\"ד 1, חיפה"),
    ).toBe("הרצל 5, חיפה");
  });
  it("בלי כתובת פומבית: המען מ-legal.noticeAddress", () => {
    expect(noticeAddress(empty, "ת\"ד 123, תל אביב")).toBe("ת\"ד 123, תל אביב");
  });
  it("בלי כתובת ובלי מען: TODO גלוי", () => {
    expect(noticeAddress(empty, TODO)).toBe(TODO);
    expect(noticeAddress(empty, "")).toBe(TODO);
  });
});
