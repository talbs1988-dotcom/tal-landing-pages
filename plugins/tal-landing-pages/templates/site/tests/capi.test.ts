import { describe, expect, it, vi } from "vitest";
import {
  GRAPH_API_VERSION,
  buildCapiEvent,
  capiUrl,
  sendCapi,
  sha256Hex,
} from "@/lib/capi";
import { buildLeadRecord, type Lead } from "@/lib/lead";
import { pickTracking } from "@/lib/utm";

const lead: Lead = {
  name: "Test User",
  email: "test@example.com",
  phone: "0501234567",
  marketingConsent: true,
};
const now = new Date("2026-11-01T10:00:00.000Z");

function record(
  overrides: Partial<Lead> = {},
  tracking: Record<string, unknown> = {},
) {
  return buildLeadRecord({ ...lead, ...overrides }, pickTracking(tracking), {
    now,
    baseUrl: new URL("https://example.co.il"),
    userAgent: "Mozilla/5.0 test",
  });
}

describe("sha256Hex", () => {
  it("ערך ידוע", () => {
    expect(sha256Hex("test@example.com")).toBe(
      "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
    );
  });
});

describe("buildCapiEvent", () => {
  it("אירוע Lead עם אותו event_id ונתונים מגובבים", () => {
    const r = record({}, { fbp: "fb.1.1.2", fbc: "fb.1.1.abc" });
    const p = buildCapiEvent(r, {
      sourceUrl: "https://example.co.il/",
      clientIp: "203.0.113.7",
    });
    expect(p.data).toHaveLength(1);
    const e = p.data[0];
    expect(e.event_name).toBe("Lead");
    expect(e.event_id).toBe(r.eventId);
    expect(e.action_source).toBe("website");
    expect(e.event_time).toBe(Math.floor(now.getTime() / 1000));
    expect(e.event_source_url).toBe("https://example.co.il/");
    expect(e.user_data.em).toEqual([
      "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
    ]);
    // 972501234567
    expect(e.user_data.ph).toEqual([
      "1b28f71583657cd11ff8ad48a922f9a3b051fdb267ffc4fe88c47db2338629f4",
    ]);
    expect(e.user_data.fbp).toBe("fb.1.1.2");
    expect(e.user_data.fbc).toBe("fb.1.1.abc");
    expect(e.user_data.client_ip_address).toBe("203.0.113.7");
    expect(e.user_data.client_user_agent).toBe("Mozilla/5.0 test");
    expect(p).not.toHaveProperty("test_event_code");
    const json = JSON.stringify(p);
    expect(json).not.toContain("test@example.com");
    expect(json).not.toContain("0501234567");
    expect(json).not.toContain("Test User");
  });

  it("בלי טלפון אין ph, ובלי IP אין client_ip_address", () => {
    const p = buildCapiEvent(record({ phone: "" }), {
      sourceUrl: "https://example.co.il/",
    });
    expect(p.data[0].user_data).not.toHaveProperty("ph");
    expect(p.data[0].user_data).not.toHaveProperty("client_ip_address");
    expect(p.data[0].user_data).not.toHaveProperty("fbp");
  });

  it("fbc נבנה מ-fbclid כשאין עוגייה", () => {
    const p = buildCapiEvent(record({}, { fbclid: "IwAR123" }), {
      sourceUrl: "https://example.co.il/",
    });
    expect(p.data[0].user_data.fbc).toBe(`fb.1.${now.getTime()}.IwAR123`);
  });

  it("test_event_code רק כשניתן", () => {
    const p = buildCapiEvent(record(), {
      sourceUrl: "https://example.co.il/",
      testEventCode: "TEST123",
    });
    expect(p.test_event_code).toBe("TEST123");
  });
});

describe("sendCapi", () => {
  const payload = buildCapiEvent(record(), {
    sourceUrl: "https://example.co.il/",
  });

  it("כתובת עם גרסת ה-API העדכנית", () => {
    expect(GRAPH_API_VERSION).toMatch(/^v\d+\.\d+$/);
    expect(capiUrl("123456")).toBe(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/123456/events`,
    );
  });

  it("שולח POST עם הטוקן בגוף ולא בכתובת", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 200 }));
    const r = await sendCapi(payload, {
      pixelId: "123456",
      token: "SECRET",
      fetch: fetchFn,
    });
    expect(r).toEqual({ ok: true, status: 200 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(capiUrl("123456"));
    expect(url).not.toContain("SECRET");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
    const body = JSON.parse(String(init.body));
    expect(body.access_token).toBe("SECRET");
    expect(body.data[0].event_id).toBe(payload.data[0].event_id);
  });

  it("כישלון: בלי ניסיון חוזר", async () => {
    const fetchFn = vi.fn(async () => new Response("bad", { status: 500 }));
    const r = await sendCapi(payload, {
      pixelId: "1",
      token: "t",
      fetch: fetchFn,
    });
    expect(r.ok).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("שגיאת רשת לא זורקת", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const r = await sendCapi(payload, {
      pixelId: "1",
      token: "t",
      fetch: fetchFn,
    });
    expect(r.ok).toBe(false);
  });

  it("timeout מבטל את הבקשה", async () => {
    const fetchFn = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );
    const r = await sendCapi(payload, {
      pixelId: "1",
      token: "t",
      fetch: fetchFn,
      timeoutMs: 20,
    });
    expect(r.ok).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
