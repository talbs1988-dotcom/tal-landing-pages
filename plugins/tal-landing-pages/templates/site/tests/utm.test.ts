import { describe, expect, it } from "vitest";
import { TRACKING_KEYS, pickTracking } from "@/lib/utm";

describe("pickTracking", () => {
  it("לוקח רק מפתחות מוכרים", () => {
    const t = pickTracking({
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: "nov",
      utm_content: "video-1",
      utm_term: "קורס",
      fbclid: "abc123",
      fbp: "fb.1.1700000000000.123",
      fbc: "fb.1.1700000000000.abc123",
      referrer: "https://l.facebook.com/",
      landingPath: "/?utm_source=facebook",
      evil: "x",
      __proto__: { polluted: true },
    });
    expect(Object.keys(t).sort()).toEqual([...TRACKING_KEYS, "source"].sort());
    expect(t.utm_source).toBe("facebook");
    expect(t.utm_term).toBe("קורס");
    expect(t.fbc).toBe("fb.1.1700000000000.abc123");
    expect(t).not.toHaveProperty("evil");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("כל ערך הוא מחרוזת עד 300 תווים", () => {
    const t = pickTracking({
      utm_source: "x".repeat(1000),
      utm_medium: 5,
      utm_campaign: { a: 1 },
    });
    expect(t.utm_source.length).toBe(300);
    expect(t.utm_medium).toBe("");
    expect(t.utm_campaign).toBe("");
  });

  it("מסיר תווי בקרה ותווים בלתי נראים", () => {
    const t = pickTracking({ utm_source: "face\u0000book​\n" });
    expect(t.utm_source).toBe("facebook");
  });

  it("source: utm_source אם יש, אחרת 'אחר'", () => {
    expect(pickTracking({ utm_source: "google" }).source).toBe("google");
    expect(pickTracking({}).source).toBe("אחר");
    expect(pickTracking({ utm_source: "   " }).source).toBe("אחר");
  });

  it("קלט חסר או לא אובייקט: הכול ריק", () => {
    for (const input of [undefined, null, "str", 5, []]) {
      const t = pickTracking(input);
      for (const k of TRACKING_KEYS) expect(t[k]).toBe("");
      expect(t.source).toBe("אחר");
    }
  });
});
