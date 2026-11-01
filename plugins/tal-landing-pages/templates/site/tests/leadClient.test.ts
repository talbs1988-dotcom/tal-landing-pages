import { describe, expect, it } from "vitest";
import {
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
