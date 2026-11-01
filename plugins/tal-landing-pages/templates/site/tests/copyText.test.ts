import { PRISTINE } from "./templateState";
import { describe, expect, it } from "vitest";
import copy from "@/content/copy.json";
import {
  COPY_KEY_PATTERN,
  alt,
  altFrom,
  editProps,
  editPropsFor,
  t,
  textFrom,
} from "@/lib/copyText";
import { TODO } from "@/lib/todo";

const dict = {
  "hero.title": "כותרת",
  "hero.empty": "",
  "hero.spaces": "   ",
  "img.hero": "בעלת העסק מחייכת מול המחשב",
  "img.blank": "",
};

describe("textFrom", () => {
  it("מחזיר את הטקסט של המפתח", () => {
    expect(textFrom(dict, "hero.title")).toBe("כותרת");
  });

  it("מפתח חסר, ריק או רק רווחים: [למלא]", () => {
    expect(textFrom(dict, "hero.missing")).toBe(TODO);
    expect(textFrom(dict, "hero.empty")).toBe(TODO);
    expect(textFrom(dict, "hero.spaces")).toBe(TODO);
  });

  it("ערך שאינו מחרוזת: [למלא]", () => {
    const bad = { "a.b": 3, "a.c": null } as unknown as Record<string, string>;
    expect(textFrom(bad, "a.b")).toBe(TODO);
    expect(textFrom(bad, "a.c")).toBe(TODO);
  });

  it("לא נופל על מפתחות של Object.prototype", () => {
    expect(textFrom(dict, "toString")).toBe(TODO);
    expect(textFrom(dict, "__proto__")).toBe(TODO);
    expect(textFrom(dict, "constructor")).toBe(TODO);
  });
});

describe("altFrom", () => {
  it("קורא מ-img.<שם>", () => {
    expect(altFrom(dict, "hero")).toBe("בעלת העסק מחייכת מול המחשב");
  });

  it("חסר או ריק: [למלא]", () => {
    expect(altFrom(dict, "nope")).toBe(TODO);
    expect(altFrom(dict, "blank")).toBe(TODO);
  });
});

describe("editPropsFor", () => {
  it("ב-development: data-edit עם המפתח", () => {
    expect(editPropsFor("hero.title", "development")).toEqual({
      "data-edit": "hero.title",
    });
  });

  it("בכל סביבה אחרת: אובייקט ריק", () => {
    expect(editPropsFor("hero.title", "production")).toEqual({});
    expect(editPropsFor("hero.title", "test")).toEqual({});
    expect(editPropsFor("hero.title", undefined)).toEqual({});
  });
});

describe("t, alt ו-editProps על copy.json", () => {
  it("t קורא מהקובץ (ברירת המחדל בתבנית היא [למלא])", () => {
    const raw = copy["hero.title"];
    expect(t("hero.title")).toBe(raw.trim() === "" ? TODO : raw);
  });

  it("alt לתמונה שאין לה מפתח: [למלא]", () => {
    // שם שלא יהיה אף פעם ב-copy.json, גם בדף שמילאו בו img.hero. ה-cast עוקף את בדיקת הטיפוסים בכוונה
    expect(alt("no-such-image-in-any-page" as unknown as Parameters<typeof alt>[0])).toBe(TODO);
  });

  it("editProps בבדיקות (NODE_ENV=test) ריק", () => {
    expect(editProps("hero.title")).toEqual({});
  });
});

describe("content/copy.json", () => {
  const entries = Object.entries(copy as Record<string, unknown>);

  it("כל הערכים מחרוזות", () => {
    for (const [k, v] of entries) expect(typeof v, k).toBe("string");
  });

  it("כל המפתחות שטוחים עם נקודה (section.name)", () => {
    for (const [k] of entries) expect(k).toMatch(COPY_KEY_PATTERN);
  });

  it("יש מפתח לכל טקסט שיווקי שבתבנית", () => {
    expect(Object.keys(copy)).toEqual(
      expect.arrayContaining([
        "hero.title",
        "hero.subtitle",
        "hero.cta",
        "form.title",
        "thankYou.title",
        "thankYou.body",
      ]),
    );
  });

  // רק בתבנית הריקה: בדף שמילאו, הערכים כבר טקסט אמיתי
  it.skipIf(!PRISTINE)("בתבנית כל הערכים הם [למלא]", () => {
    for (const [k, v] of entries) expect(v, k).toBe(TODO);
  });

  it("COPY_KEY_PATTERN", () => {
    for (const ok of [
      "hero.title",
      "img.hero",
      "faq.q1",
      "a.b.c",
      "thankYou.body",
      "img.hero-dana",
    ])
      expect(ok).toMatch(COPY_KEY_PATTERN);
    for (const bad of [
      "hero",
      "hero.",
      ".hero",
      "hero title",
      "hero..x",
      "__proto__",
      "כותרת.ראשית",
    ])
      expect(bad).not.toMatch(COPY_KEY_PATTERN);
  });
});
