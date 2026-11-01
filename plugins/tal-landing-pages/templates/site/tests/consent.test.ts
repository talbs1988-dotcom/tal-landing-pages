import { describe, expect, it } from "vitest";
import {
  ACCEPT_ALL,
  CONSENT_CHANGED_EVENT,
  CONSENT_KEY,
  CONSENT_REOPEN_EVENT,
  CONSENT_VERSION,
  REJECT_ALL,
  parseConsent,
  serializeConsent,
} from "@/lib/consent";

const now = new Date("2026-11-01T10:00:00.000Z");

describe("קבועים", () => {
  it("מפתח, גרסה ואירועים", () => {
    expect(CONSENT_KEY).toBe("cookie-consent-v1");
    expect(CONSENT_VERSION).toBe(1);
    expect(CONSENT_CHANGED_EVENT).toBe("cookie-consent-changed");
    expect(CONSENT_REOPEN_EVENT).toBe("cookie-consent-reopen");
    expect(ACCEPT_ALL).toEqual({ analytics: true, marketing: true });
    expect(REJECT_ALL).toEqual({ analytics: false, marketing: false });
  });
});

describe("serializeConsent / parseConsent", () => {
  it("הלוך ושוב", () => {
    const raw = serializeConsent({ analytics: false, marketing: true }, now);
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      necessary: true,
      analytics: false,
      marketing: true,
      updatedAt: "2026-11-01T10:00:00.000Z",
    });
    expect(parseConsent(raw)).toEqual({
      version: 1,
      necessary: true,
      analytics: false,
      marketing: true,
      updatedAt: "2026-11-01T10:00:00.000Z",
    });
  });

  it("רק true בוליאני נחשב הסכמה", () => {
    const raw = serializeConsent(
      { analytics: "yes", marketing: 1 } as never,
      now,
    );
    expect(parseConsent(raw)).toMatchObject({
      analytics: false,
      marketing: false,
    });
  });

  it("ריק, JSON פגום או לא אובייקט: null", () => {
    for (const raw of [null, undefined, "", "{", "null", "5", '"x"', "[]"]) {
      expect(parseConsent(raw)).toBeNull();
    }
  });

  it("גרסה אחרת: null (מבקשים בחירה מחדש)", () => {
    const raw = JSON.stringify({
      version: 2,
      necessary: true,
      analytics: true,
      marketing: true,
      updatedAt: now.toISOString(),
    });
    expect(parseConsent(raw)).toBeNull();
    expect(
      parseConsent(raw.replace('"version":2', '"version":"1"')),
    ).toBeNull();
  });

  it("שדות חסרים או מסוג לא נכון: null", () => {
    const base = {
      version: 1,
      necessary: true,
      analytics: true,
      marketing: false,
      updatedAt: now.toISOString(),
    };
    for (const key of ["analytics", "marketing", "updatedAt"] as const) {
      const { [key]: _omit, ...rest } = base;
      expect(parseConsent(JSON.stringify(rest))).toBeNull();
    }
    expect(
      parseConsent(JSON.stringify({ ...base, marketing: "true" })),
    ).toBeNull();
    expect(
      parseConsent(JSON.stringify({ ...base, updatedAt: "not a date" })),
    ).toBeNull();
  });
});
