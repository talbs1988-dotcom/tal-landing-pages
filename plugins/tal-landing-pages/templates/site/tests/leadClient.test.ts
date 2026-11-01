import { describe, expect, it } from "vitest";
import {
  buildLeadPayload,
  GENERIC_ERROR,
  interpretResponse,
  thankYouHref,
} from "@/lib/leadClient";

const EID = "3f1c2b9e-6a7d-4e8f-9a0b-1c2d3e4f5a6b";
const HEBREW = /[֐-׿]/;

describe("interpretResponse", () => {
  it("הצלחה עם eventId", () => {
    expect(interpretResponse(200, { ok: true, id: "x", eventId: EID })).toEqual(
      {
        kind: "success",
        eventId: EID,
      },
    );
  });

  it("הצלחה בלי id (ספאם) או עם eventId לא תקין: בלי eventId", () => {
    expect(interpretResponse(200, { ok: true })).toEqual({ kind: "success" });
    expect(interpretResponse(200, { ok: true, eventId: "<script>" })).toEqual({
      kind: "success",
    });
  });

  it("מצב פיתוח הוא הצלחה", () => {
    expect(
      interpretResponse(200, { ok: true, id: "x", eventId: EID, mode: "dev" }),
    ).toEqual({
      kind: "success",
      eventId: EID,
    });
  });

  it("שגיאות שדה מהשרת", () => {
    expect(
      interpretResponse(400, {
        ok: false,
        errors: {
          email: "כתובת המייל לא תקינה.",
          phone: "לא תקין",
          junk: "x",
          name: 5,
        },
      }),
    ).toEqual({
      kind: "fieldErrors",
      errors: { email: "כתובת המייל לא תקינה.", phone: "לא תקין" },
    });
  });

  it("שגיאה ברמת הטופס (errors.form)", () => {
    expect(
      interpretResponse(400, { ok: false, errors: { form: "בעיה" } }),
    ).toEqual({
      kind: "error",
      message: "בעיה",
    });
  });

  it("הודעת error מהשרת (429, 403, 413, 500)", () => {
    for (const status of [403, 413, 415, 429, 500]) {
      expect(
        interpretResponse(status, { ok: false, error: "נסו שוב" }),
      ).toEqual({
        kind: "error",
        message: "נסו שוב",
      });
    }
  });

  it("תשובה לא צפויה: הודעה כללית בעברית", () => {
    for (const [status, json] of [
      [500, null],
      [502, "<html>"],
      [200, { ok: false }],
      [400, { ok: false, errors: {} }],
    ] as const) {
      const r = interpretResponse(status, json);
      expect(r).toEqual({ kind: "error", message: GENERIC_ERROR });
    }
    expect(GENERIC_ERROR).toMatch(HEBREW);
  });
});

describe("thankYouHref", () => {
  it("עם eventId תקין", () => {
    expect(thankYouHref(EID)).toBe(`/thank-you?e=${EID}`);
  });
  it("בלי eventId או עם ערך לא תקין: בלי e", () => {
    expect(thankYouHref()).toBe("/thank-you");
    expect(thankYouHref("abc&x=1")).toBe("/thank-you");
  });
});

describe("buildLeadPayload", () => {
  const values = { name: "דנה", email: "d@example.co.il", phone: "0501234567", website: "" };
  const tracking = {
    utm_source: "facebook",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    fbclid: "IwAR1",
    fbp: "fb.1.1.stale",
    fbc: "fb.1.1.stale",
    referrer: "",
    landingPath: "/",
  };
  const cookie = "_fbp=fb.1.1700000000000.42; _fbc=fb.1.1700000000000.IwAR1";

  it("עם הסכמה לעוגיות שיווק: cookieMarketing=true ומזהי העוגיות של מטא", () => {
    const p = buildLeadPayload({
      values,
      marketingConsent: true,
      eventId: EID,
      tracking,
      cookie,
      cookieMarketing: true,
    });
    expect(p).toMatchObject({
      name: "דנה",
      marketingConsent: true,
      cookieMarketing: true,
      eventId: EID,
    });
    expect(p.tracking.fbp).toBe("fb.1.1700000000000.42");
    expect(p.tracking.fbc).toBe("fb.1.1700000000000.IwAR1");
    expect(p.tracking.utm_source).toBe("facebook");
  });

  it("בלי הסכמה לעוגיות שיווק (או בלי בחירה): cookieMarketing=false ובלי fbp/fbc, גם אם העוגיות קיימות", () => {
    for (const cookieMarketing of [false, null, undefined]) {
      const p = buildLeadPayload({
        values,
        marketingConsent: true,
        eventId: EID,
        tracking,
        cookie,
        cookieMarketing,
      });
      expect(p.cookieMarketing).toBe(false);
      expect(p.tracking.fbp).toBe("");
      expect(p.tracking.fbc).toBe("");
      expect(JSON.stringify(p)).not.toContain("fb.1.");
      // שאר מקור התנועה נשאר
      expect(p.tracking.utm_source).toBe("facebook");
      expect(p.tracking.fbclid).toBe("IwAR1");
    }
  });
});
