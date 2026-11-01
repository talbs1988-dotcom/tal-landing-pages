import { describe, expect, it } from "vitest";
import { collectTracking, readCookie } from "@/lib/tracking";

describe("readCookie", () => {
  it("מוצא עוגייה לפי שם מדויק", () => {
    const c = "a=1; _fbp=fb.1.1700000000000.42; x_fbp=no; _fbc=fb.1.1.abc";
    expect(readCookie(c, "_fbp")).toBe("fb.1.1700000000000.42");
    expect(readCookie(c, "_fbc")).toBe("fb.1.1.abc");
    expect(readCookie(c, "missing")).toBe("");
    expect(readCookie("", "_fbp")).toBe("");
  });

  it("מפענח ערך מקודד ולא קורס על קידוד שבור", () => {
    expect(readCookie("v=a%20b", "v")).toBe("a b");
    expect(readCookie("v=%E0%A4%A", "v")).toBe("%E0%A4%A");
  });
});

describe("collectTracking", () => {
  it("אוסף UTM ו-fbclid מהכתובת, fbp/fbc מהעוגיות, referrer ונתיב", () => {
    const t = collectTracking({
      search:
        "?utm_source=facebook&utm_medium=paid&utm_campaign=%D7%A0%D7%95%D7%91&utm_content=v1&utm_term=t&fbclid=IwAR1&other=x",
      pathname: "/",
      cookie: "_fbp=fb.1.1.2; _fbc=fb.1.1.IwAR1",
      referrer: "https://l.facebook.com/",
    });
    expect(t).toEqual({
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: "נוב",
      utm_content: "v1",
      utm_term: "t",
      fbclid: "IwAR1",
      fbp: "fb.1.1.2",
      fbc: "fb.1.1.IwAR1",
      referrer: "https://l.facebook.com/",
      landingPath:
        "/?utm_source=facebook&utm_medium=paid&utm_campaign=%D7%A0%D7%95%D7%91&utm_content=v1&utm_term=t&fbclid=IwAR1&other=x",
    });
  });

  it("בלי פרמטרים: מחרוזות ריקות, והנתיב בלבד", () => {
    const t = collectTracking({
      search: "",
      pathname: "/",
      cookie: "",
      referrer: "",
    });
    expect(t.utm_source).toBe("");
    expect(t.fbp).toBe("");
    expect(t.landingPath).toBe("/");
  });

  it("כל ערך נחתך ל-300 תווים", () => {
    const t = collectTracking({
      search: `?utm_source=${"x".repeat(500)}`,
      pathname: "/",
      cookie: "",
      referrer: `https://a.example/${"y".repeat(500)}`,
    });
    expect(t.utm_source.length).toBe(300);
    expect(t.referrer.length).toBe(300);
    expect(t.landingPath.length).toBe(300);
  });
});
