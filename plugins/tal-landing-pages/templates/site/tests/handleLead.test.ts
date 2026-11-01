import { describe, expect, it, vi } from "vitest";
import {
  handleLead,
  type HandleLeadDeps,
  type LeadEnv,
} from "@/lib/handleLead";
import type { CapiPayload } from "@/lib/capi";

const HEBREW = /[֐-׿]/;
const IP = "203.0.113.77";
const CLIENT_EVENT_ID = "3f1c2b9e-6a7d-4e8f-9a0b-1c2d3e4f5a6b";

const body = {
  name: "דנה כהן",
  email: "Dana.Cohen@Example.co.il",
  phone: "+972-52-765-4321",
  marketingConsent: true,
  // הגולש אישר עוגיות שיווק בבאנר (readConsent().marketing)
  cookieMarketing: true,
  website: "",
  eventId: CLIENT_EVENT_ID,
  tracking: {
    utm_source: "facebook",
    utm_campaign: "nov",
    fbclid: "IwAR123",
    fbp: "fb.1.1700000000000.42",
    landingPath: "/?utm_source=facebook",
  },
};

const FULL_ENV: LeadEnv = {
  WEBHOOK_URL: "https://hook.example/abc",
  BLOB_READ_WRITE_TOKEN: "blob-token",
  META_PIXEL_ID: "123456",
  META_CAPI_TOKEN: "capi-token",
};

type Overrides = Partial<
  Record<"backup" | "postWebhook" | "postCapi" | "postAlert", unknown>
>;

function makeDeps(env: LeadEnv, over: Overrides = {}) {
  const deps = {
    env,
    form: { phone: "required" as const },
    backup: vi.fn<HandleLeadDeps["backup"]>(async () => {}),
    postWebhook: vi.fn<HandleLeadDeps["postWebhook"]>(async () => ({
      ok: true,
    })),
    postCapi: vi.fn<(p: CapiPayload) => Promise<{ ok: boolean }>>(async () => ({
      ok: true,
    })),
    now: () => new Date("2026-11-01T10:00:00.000Z"),
    log: vi.fn<HandleLeadDeps["log"]>(),
  };
  return Object.assign(deps, over) as typeof deps;
}

const ctx = {
  clientIp: IP,
  userAgent: "Mozilla/5.0 test",
  baseUrl: new URL("https://example.co.il"),
};

/** מריץ את הקליטה וגם את העבודה הדחויה (מה שה-route מעביר ל-after) */
async function run(input: unknown, deps: HandleLeadDeps, c: typeof ctx = ctx) {
  const r = await handleLead(input, deps, c);
  await r.deferred?.();
  return r;
}

describe("handleLead: עבודה דחויה (after)", () => {
  it("CAPI לא רץ לפני התשובה, אלא רק כשמריצים את deferred", async () => {
    const deps = makeDeps(FULL_ENV);
    const r = await handleLead(body, deps, ctx);
    expect(r.status).toBe(200);
    expect(typeof r.deferred).toBe("function");
    expect(deps.postCapi).not.toHaveBeenCalled();
    await r.deferred?.();
    expect(deps.postCapi).toHaveBeenCalledTimes(1);
  });

  it("בלי הסכמה, בכישלון או בספאם אין עבודה דחויה", async () => {
    const deps = makeDeps(FULL_ENV);
    expect(
      (await handleLead({ ...body, marketingConsent: false }, deps, ctx))
        .deferred,
    ).toBeUndefined();
    expect(
      (await handleLead({ ...body, website: "x" }, deps, ctx)).deferred,
    ).toBeUndefined();
    const failing = makeDeps(FULL_ENV, {
      backup: vi.fn(async () => {
        throw new Error("x");
      }),
      postWebhook: vi.fn(async () => ({ ok: false })),
    });
    expect((await handleLead(body, failing, ctx)).deferred).toBeUndefined();
  });

  it("deferred לא זורק גם כש-CAPI זורק, ורושם את התוצאה ללוג", async () => {
    const deps = makeDeps(FULL_ENV, {
      postCapi: vi.fn(async () => {
        throw new Error("meta down");
      }),
    });
    const r = await handleLead(body, deps, ctx);
    await expect(r.deferred?.()).resolves.toBeUndefined();
    expect(deps.log).toHaveBeenLastCalledWith({
      event: "lead_capi",
      id: r.json.id,
      result: "failed",
    });
  });
});

describe("handleLead", () => {
  it("בלי הגדרות (פיתוח): 200 עם mode dev, בלי לשלוח לשום מקום", async () => {
    const deps = makeDeps({});
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({
      ok: true,
      mode: "dev",
      eventId: CLIENT_EVENT_ID,
    });
    expect(deps.backup).not.toHaveBeenCalled();
    expect(deps.postWebhook).not.toHaveBeenCalled();
    expect(deps.postCapi).not.toHaveBeenCalled();
  });

  it("בלי הגדרות ב-Vercel production: 500, הליד לא נבלע בשקט", async () => {
    const deps = makeDeps({ VERCEL_ENV: "production" });
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(500);
    expect(r.json.ok).toBe(false);
    expect(String(r.json.error)).toMatch(HEBREW);
  });

  it("בלי הגדרות ב-Vercel preview: 500, לא מצב dev", async () => {
    const deps = makeDeps({ VERCEL_ENV: "preview" });
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(500);
    expect(r.json.ok).toBe(false);
    expect(r.json).not.toHaveProperty("mode");
    expect(deps.log).toHaveBeenCalledWith(
      expect.objectContaining({ result: "not_configured" }),
    );
  });

  it("vercel dev במחשב (VERCEL_ENV=development): נשאר מצב dev", async () => {
    const deps = makeDeps({ VERCEL_ENV: "development" });
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(200);
    expect(r.json.mode).toBe("dev");
  });

  it("קלט לא תקין: 400 עם שגיאות בעברית, בלי לשמור", async () => {
    const deps = makeDeps(FULL_ENV);
    const r = await run({ ...body, email: "nope", phone: "1" }, deps, ctx);
    expect(r.status).toBe(400);
    expect(r.json.ok).toBe(false);
    const errors = r.json.errors as Record<string, string>;
    expect(Object.keys(errors).sort()).toEqual(["email", "phone"]);
    for (const m of Object.values(errors)) expect(m).toMatch(HEBREW);
    expect(deps.backup).not.toHaveBeenCalled();
    expect(deps.postWebhook).not.toHaveBeenCalled();
  });

  it("ספאם: 200 {ok:true} בלי לשמור ובלי לשלוח", async () => {
    const deps = makeDeps(FULL_ENV);
    const r = await run({ ...body, website: "http://spam" }, deps, ctx);
    expect(r).toEqual({ status: 200, json: { ok: true } });
    expect(deps.backup).not.toHaveBeenCalled();
    expect(deps.postWebhook).not.toHaveBeenCalled();
    expect(deps.postCapi).not.toHaveBeenCalled();
  });

  it("הצלחה מלאה: הלקוח מקבל רק ok, id, eventId", async () => {
    const deps = makeDeps(FULL_ENV);
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(200);
    expect(Object.keys(r.json).sort()).toEqual(["eventId", "id", "ok"]);
    expect(r.json.ok).toBe(true);
    expect(r.json.eventId).toBe(CLIENT_EVENT_ID);
    expect(deps.backup).toHaveBeenCalledTimes(1);
    expect(deps.postWebhook).toHaveBeenCalledTimes(1);
  });

  it("הגיבוי מקבל רשומה מלאה בלי IP", async () => {
    const deps = makeDeps(FULL_ENV);
    const r = await run(body, deps, ctx);
    const rec = deps.backup.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(rec.id).toBe(r.json.id);
    expect(rec.lead).toEqual({
      name: "דנה כהן",
      email: "dana.cohen@example.co.il",
      phone: "0527654321",
      marketingConsent: true,
    });
    expect(JSON.stringify(rec)).not.toContain(IP);
  });

  it("הוובהוק מקבל מבנה שטוח לכתובת מה-env", async () => {
    const deps = makeDeps(FULL_ENV);
    const r = await run(body, deps, ctx);
    const [url, payload] = deps.postWebhook.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(url).toBe(FULL_ENV.WEBHOOK_URL);
    expect(payload).toMatchObject({
      id: r.json.id,
      name: "דנה כהן",
      email: "dana.cohen@example.co.il",
      phone: "0527654321",
      marketingConsent: true,
      utm_source: "facebook",
      utm_campaign: "nov",
      source: "facebook",
      eventId: CLIENT_EVENT_ID,
      pageUrl: "https://example.co.il/?utm_source=facebook",
    });
    expect(JSON.stringify(payload)).not.toContain(IP);
  });

  it("גיבוי נכשל + וובהוק הצליח: 200", async () => {
    const deps = makeDeps(FULL_ENV, {
      backup: vi.fn(async () => {
        throw new Error("blob down");
      }),
    });
    expect((await run(body, deps, ctx)).status).toBe(200);
  });

  it("גיבוי הצליח + וובהוק נכשל: 200", async () => {
    const deps = makeDeps(FULL_ENV, {
      postWebhook: vi.fn(async () => ({ ok: false })),
    });
    expect((await run(body, deps, ctx)).status).toBe(200);
  });

  it("וובהוק זורק: לא מפיל, נחשב כישלון", async () => {
    const deps = makeDeps(
      { WEBHOOK_URL: "https://hook.example/abc" },
      {
        postWebhook: vi.fn(async () => {
          throw new Error("boom");
        }),
      },
    );
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(500);
  });

  it("שניהם נכשלו: 500 עם הודעה כללית בעברית, בלי פרטים פנימיים", async () => {
    const deps = makeDeps(FULL_ENV, {
      backup: vi.fn(async () => {
        throw new Error("INTERNAL_BLOB_SECRET_DETAIL");
      }),
      postWebhook: vi.fn(async () => ({ ok: false, status: 500 })),
    });
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(500);
    expect(r.json.ok).toBe(false);
    expect(String(r.json.error)).toMatch(HEBREW);
    expect(JSON.stringify(r.json)).not.toContain("INTERNAL");
    expect(deps.postCapi).not.toHaveBeenCalled();
  });

  it("רק גיבוי מוגדר: נשמר, בלי וובהוק", async () => {
    const deps = makeDeps({ BLOB_READ_WRITE_TOKEN: "t" });
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(200);
    expect(r.json).not.toHaveProperty("mode");
    expect(deps.backup).toHaveBeenCalledTimes(1);
    expect(deps.postWebhook).not.toHaveBeenCalled();
  });

  it("BLOB_STORE_ID (OIDC ב-Vercel) גם מפעיל גיבוי", async () => {
    const deps = makeDeps({ BLOB_STORE_ID: "store_1" });
    await run(body, deps, ctx);
    expect(deps.backup).toHaveBeenCalledTimes(1);
  });

  it("CAPI: נשלח עם הסכמה, עם אותו event_id ועם ה-IP", async () => {
    const deps = makeDeps(FULL_ENV);
    const r = await run(body, deps, ctx);
    expect(deps.postCapi).toHaveBeenCalledTimes(1);
    const payload = deps.postCapi.mock.calls[0][0];
    expect(payload.data[0].event_id).toBe(r.json.eventId);
    expect(payload.data[0].event_name).toBe("Lead");
    expect(payload.data[0].user_data.client_ip_address).toBe(IP);
    expect(payload.data[0].event_source_url).toBe(
      "https://example.co.il/?utm_source=facebook",
    );
    expect(payload).not.toHaveProperty("test_event_code");
  });

  it("CAPI: test_event_code מה-env", async () => {
    const deps = makeDeps({ ...FULL_ENV, META_CAPI_TEST_CODE: "TEST42" });
    await run(body, deps, ctx);
    expect(deps.postCapi.mock.calls[0][0].test_event_code).toBe("TEST42");
  });

  it("CAPI: לא נשלח בלי הסכמה לשיווק", async () => {
    const deps = makeDeps(FULL_ENV);
    await run({ ...body, marketingConsent: false }, deps, ctx);
    expect(deps.postCapi).not.toHaveBeenCalled();
  });

  it("CAPI: לא נשלח כשהגולש דחה עוגיות שיווק, גם עם הסכמה לדיוור", async () => {
    for (const cookieMarketing of [false, undefined, "true", 1]) {
      const deps = makeDeps(FULL_ENV);
      const r = await run({ ...body, cookieMarketing }, deps, ctx);
      expect(r.status).toBe(200);
      expect(r.deferred).toBeUndefined();
      expect(deps.postCapi).not.toHaveBeenCalled();
      expect(deps.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: "lead", result: "saved", capi: "off" }),
      );
    }
  });

  it("CAPI: נשלח רק כשיש גם דיוור וגם עוגיות שיווק", async () => {
    const deps = makeDeps(FULL_ENV);
    await run({ ...body, marketingConsent: true, cookieMarketing: true }, deps, ctx);
    expect(deps.postCapi).toHaveBeenCalledTimes(1);
    const noMail = makeDeps(FULL_ENV);
    await run({ ...body, marketingConsent: false, cookieMarketing: true }, noMail, ctx);
    expect(noMail.postCapi).not.toHaveBeenCalled();
  });

  it("CAPI: לא נשלח בלי טוקן או בלי פיקסל", async () => {
    for (const env of [
      { ...FULL_ENV, META_CAPI_TOKEN: "" },
      { ...FULL_ENV, META_PIXEL_ID: undefined },
    ]) {
      const deps = makeDeps(env);
      await run(body, deps, ctx);
      expect(deps.postCapi).not.toHaveBeenCalled();
    }
  });

  it("CAPI נכשל או זורק: הסטטוס לא משתנה", async () => {
    for (const postCapi of [
      vi.fn(async () => ({ ok: false })),
      vi.fn(async () => {
        throw new Error("meta down");
      }),
    ]) {
      const deps = makeDeps(FULL_ENV, { postCapi });
      const r = await run(body, deps, ctx);
      expect(r.status).toBe(200);
      expect(r.json.ok).toBe(true);
    }
  });

  it("הלוג לא מכיל שם, מייל, טלפון או IP באף מסלול", async () => {
    const secrets = [
      "דנה",
      "כהן",
      "dana",
      "Dana",
      "example.co.il",
      "Example.co.il",
      "0527654321",
      "527654321",
      "765-4321",
      "972527654321",
      IP,
      "blob-token",
      "capi-token",
      "hook.example",
    ];
    const throwing = (msg: string) =>
      vi.fn(async () => {
        throw new Error(msg);
      });
    const scenarios: Array<[LeadEnv, Overrides, unknown]> = [
      [FULL_ENV, {}, body],
      [{}, {}, body],
      [{ VERCEL_ENV: "production" }, {}, body],
      [FULL_ENV, {}, { ...body, email: "dana@", phone: "+972-52-765-43" }],
      [FULL_ENV, {}, { ...body, website: "dana.cohen@example.co.il" }],
      [
        FULL_ENV,
        {
          backup: throwing(`failed for dana.cohen@example.co.il ${IP}`),
          postWebhook: throwing(
            "POST https://hook.example/abc failed: דנה כהן 0527654321",
          ),
          postCapi: throwing("meta rejected dana.cohen@example.co.il"),
        },
        body,
      ],
      [
        FULL_ENV,
        {
          postCapi: throwing(`bad ip ${IP}`),
        },
        body,
      ],
    ];
    for (const [env, over, input] of scenarios) {
      const deps = makeDeps(env, over);
      await run(input, deps, ctx);
      expect(deps.log).toHaveBeenCalled();
      for (const call of deps.log.mock.calls) {
        const text = call.map((a: unknown) => JSON.stringify(a)).join(" ");
        for (const s of secrets) expect(text).not.toContain(s);
        // כל רישום הוא אובייקט עם event ו-result
        expect(call).toHaveLength(1);
        expect(call[0]).toHaveProperty("event");
        expect(call[0]).toHaveProperty("result");
      }
    }
  });
});

describe("handleLead: התראה כשהוובהוק נכשל (ALERT_WEBHOOK_URL)", () => {
  const ALERT = "https://alert.example/xyz";
  const failingHook = () => vi.fn(async () => ({ ok: false, status: 410 }));

  it("וובהוק נכשל והגיבוי הצליח: 200, ואחרי התשובה יוצאת התראה עם מזהה, תוצאה וקוד בלבד", async () => {
    const postAlert = vi.fn(async () => ({ ok: true }));
    const deps = makeDeps(
      { ...FULL_ENV, ALERT_WEBHOOK_URL: ALERT },
      { postWebhook: failingHook(), postAlert },
    );
    const r = await handleLead(body, deps, ctx);
    expect(r.status).toBe(200);
    expect(postAlert).not.toHaveBeenCalled();
    await r.deferred?.();
    expect(postAlert).toHaveBeenCalledTimes(1);
    const [url, payload] = postAlert.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(url).toBe(ALERT);
    expect(payload).toMatchObject({
      event: "lead_webhook_failed",
      id: r.json.id,
      result: "saved",
      backup: "ok",
      webhookStatus: 410,
    });
    expect(String(payload.message)).toMatch(HEBREW);
    const text = JSON.stringify(payload);
    for (const s of ["דנה", "dana", "Dana", "0527654321", "example.co.il", IP, "hook.example"])
      expect(text).not.toContain(s);
    expect(deps.log).toHaveBeenCalledWith({
      event: "lead_alert",
      id: r.json.id,
      result: "ok",
    });
  });

  it("גם כששניהם נכשלו (500) יוצאת התראה, עם result=failed", async () => {
    const postAlert = vi.fn(async () => ({ ok: true }));
    const deps = makeDeps(
      { ...FULL_ENV, ALERT_WEBHOOK_URL: ALERT },
      {
        backup: vi.fn(async () => {
          throw new Error("x");
        }),
        postWebhook: vi.fn(async () => {
          throw new Error("net");
        }),
        postAlert,
      },
    );
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(500);
    expect(postAlert).toHaveBeenCalledTimes(1);
    const payload = (postAlert.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
    expect(payload).toMatchObject({ result: "failed", backup: "failed" });
    expect(String(payload.message)).toContain("הגיבוי נכשל");
    expect(payload).not.toHaveProperty("webhookStatus");
  });

  it("וובהוק נכשל ואין גיבוי מוגדר: ההודעה אומרת שאין גיבוי (לא שהוא נכשל)", async () => {
    const postAlert = vi.fn(async () => ({ ok: true }));
    const deps = makeDeps(
      { WEBHOOK_URL: "https://hook.example/abc", ALERT_WEBHOOK_URL: ALERT },
      { postWebhook: failingHook(), postAlert },
    );
    const r = await run(body, deps, ctx);
    expect(r.status).toBe(500);
    const payload = (postAlert.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
    expect(payload).toMatchObject({ result: "failed", backup: "off" });
    expect(String(payload.message)).toContain("אין גיבוי מוגדר");
    expect(String(payload.message)).not.toContain("הגיבוי נכשל");
  });

  it("וובהוק הצליח: אין התראה", async () => {
    const postAlert = vi.fn(async () => ({ ok: true }));
    const deps = makeDeps({ ...FULL_ENV, ALERT_WEBHOOK_URL: ALERT }, { postAlert });
    await run(body, deps, ctx);
    expect(postAlert).not.toHaveBeenCalled();
  });

  it("בלי ALERT_WEBHOOK_URL: אין התראה ואין עבודה דחויה מיותרת", async () => {
    const postAlert = vi.fn(async () => ({ ok: true }));
    const deps = makeDeps(FULL_ENV, { postWebhook: failingHook(), postAlert });
    const r = await handleLead({ ...body, marketingConsent: false }, deps, ctx);
    expect(r.deferred).toBeUndefined();
    expect(postAlert).not.toHaveBeenCalled();
  });

  it("התראה שנכשלת או זורקת לא משנה את התשובה ולא זורקת", async () => {
    const postAlert = vi.fn(async () => {
      throw new Error("alert down dana@example.co.il");
    });
    const deps = makeDeps(
      { ...FULL_ENV, ALERT_WEBHOOK_URL: ALERT },
      { postWebhook: failingHook(), postAlert },
    );
    const r = await handleLead(body, deps, ctx);
    expect(r.status).toBe(200);
    await expect(r.deferred?.()).resolves.toBeUndefined();
    expect(deps.log).toHaveBeenCalledWith({
      event: "lead_alert",
      id: r.json.id,
      result: "failed",
    });
    expect(JSON.stringify(deps.log.mock.calls)).not.toContain("dana");
  });
});

