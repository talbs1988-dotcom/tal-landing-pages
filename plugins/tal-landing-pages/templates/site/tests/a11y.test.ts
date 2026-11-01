import { describe, expect, it } from "vitest";
import {
  A11Y_CLASSES,
  A11Y_KEY,
  ALL_A11Y_CLASSES,
  DEFAULT_PREFS,
  TEXT_SIZES,
  a11yInitScript,
  applyPrefs,
  isDefaultPrefs,
  parsePrefs,
  prefsToClasses,
  serializePrefs,
  type A11yPrefs,
} from "@/lib/a11y";

/** classList מזויף, כדי לבדוק בלי דפדפן */
function fakeClassList(initial: string[] = []) {
  const set = new Set(initial);
  return {
    set,
    add: (...t: string[]) => t.forEach((x) => set.add(x)),
    remove: (...t: string[]) => t.forEach((x) => set.delete(x)),
  };
}

/** מריץ את סקריפט האתחול מול localStorage ו-<html> מזויפים */
function runInit(stored: string | null, throwOnRead = false): string[] {
  const classList = fakeClassList(["rubik"]);
  const localStorage = {
    getItem: (k: string) => {
      if (throwOnRead) throw new Error("blocked");
      return k === A11Y_KEY ? stored : null;
    },
  };
  const document = { documentElement: { classList } };
  new Function("localStorage", "document", a11yInitScript())(
    localStorage,
    document,
  );
  return [...classList.set].filter((c) => c !== "rubik").sort();
}

const ALL_ON: A11yPrefs = {
  textSize: 2,
  contrast: true,
  links: true,
  noMotion: true,
};

describe("lib/a11y", () => {
  it("גודלי הטקסט הם 100/115/130", () => {
    expect(TEXT_SIZES).toEqual([100, 115, 130]);
  });

  it("parsePrefs: ריק, פגום או גרסה אחרת ← ברירת מחדל", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{not json")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("42")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{"v":2,"contrast":true}')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{"contrast":true}')).toEqual(DEFAULT_PREFS);
  });

  it("parsePrefs: שדה לא תקין נופל לברירת המחדל שלו בלבד", () => {
    expect(
      parsePrefs('{"v":1,"textSize":7,"contrast":"yes","links":true}'),
    ).toEqual({ textSize: 0, contrast: false, links: true, noMotion: false });
  });

  it("serialize ו-parse הם הפיכים", () => {
    expect(parsePrefs(serializePrefs(ALL_ON))).toEqual(ALL_ON);
    expect(parsePrefs(serializePrefs(DEFAULT_PREFS))).toEqual(DEFAULT_PREFS);
  });

  it("isDefaultPrefs", () => {
    expect(isDefaultPrefs(DEFAULT_PREFS)).toBe(true);
    expect(isDefaultPrefs({ ...DEFAULT_PREFS, links: true })).toBe(false);
    expect(isDefaultPrefs({ ...DEFAULT_PREFS, textSize: 1 })).toBe(false);
  });

  it("prefsToClasses ממפה כל מצב ל-class", () => {
    expect(prefsToClasses(DEFAULT_PREFS)).toEqual([]);
    expect(prefsToClasses({ ...DEFAULT_PREFS, textSize: 1 })).toEqual([
      "a11y-text-115",
    ]);
    expect(prefsToClasses(ALL_ON).sort()).toEqual(
      [...ALL_A11Y_CLASSES].filter((c) => c !== A11Y_CLASSES.text[1]).sort(),
    );
  });

  it("applyPrefs מסיר מצבים ישנים ולא נוגע ב-class אחרים", () => {
    const cl = fakeClassList(["rubik", "a11y-contrast", "a11y-text-130"]);
    applyPrefs({ classList: cl }, { ...DEFAULT_PREFS, textSize: 1, links: true });
    expect([...cl.set].sort()).toEqual(
      ["a11y-links", "a11y-text-115", "rubik"].sort(),
    );
    applyPrefs({ classList: cl }, DEFAULT_PREFS);
    expect([...cl.set]).toEqual(["rubik"]);
  });

  it("סקריפט האתחול מתנהג כמו parsePrefs + prefsToClasses", () => {
    const cases: (string | null)[] = [
      null,
      "",
      "{bad",
      "null",
      '{"v":2,"contrast":true}',
      '{"v":1,"textSize":7,"contrast":"yes","links":true}',
      serializePrefs(ALL_ON),
      serializePrefs({ ...DEFAULT_PREFS, textSize: 1, noMotion: true }),
    ];
    for (const raw of cases) {
      expect(runInit(raw)).toEqual(prefsToClasses(parsePrefs(raw)).sort());
    }
  });

  it("סקריפט האתחול לא זורק כשאין גישה ל-localStorage", () => {
    expect(runInit(null, true)).toEqual([]);
  });
});
