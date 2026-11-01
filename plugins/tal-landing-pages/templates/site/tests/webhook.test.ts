import { describe, expect, it, vi } from "vitest";
import { postWebhook } from "@/lib/webhook";

const URL_ = "https://hook.example/abc";
const body = { id: "1", name: "x" };

const res = (status: number) => new Response("", { status });

describe("postWebhook", () => {
  it("שולח POST עם JSON", async () => {
    const fetchFn = vi.fn(async () => res(200));
    const r = await postWebhook(URL_, body, { fetch: fetchFn });
    expect(r).toEqual({ ok: true, status: 200, attempts: 1 });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(URL_);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init.body))).toEqual(body);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("5xx: ניסיון חוזר אחד", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(res(502))
      .mockResolvedValueOnce(res(200));
    const r = await postWebhook(URL_, body, { fetch: fetchFn });
    expect(r).toEqual({ ok: true, status: 200, attempts: 2 });
  });

  it("שגיאת רשת: ניסיון חוזר אחד", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(res(200));
    const r = await postWebhook(URL_, body, { fetch: fetchFn });
    expect(r.ok).toBe(true);
    expect(r.attempts).toBe(2);
  });

  it("4xx: בלי ניסיון חוזר", async () => {
    const fetchFn = vi.fn(async () => res(410));
    const r = await postWebhook(URL_, body, { fetch: fetchFn });
    expect(r).toEqual({ ok: false, status: 410, attempts: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("5xx פעמיים: נכשל אחרי 2 ניסיונות", async () => {
    const fetchFn = vi.fn(async () => res(500));
    const r = await postWebhook(URL_, body, { fetch: fetchFn });
    expect(r).toEqual({ ok: false, status: 500, attempts: 2 });
  });

  it("timeout: מבטל, מנסה שוב פעם אחת, ולא זורק", async () => {
    const fetchFn = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );
    const r = await postWebhook(URL_, body, { fetch: fetchFn, timeoutMs: 20 });
    expect(r.ok).toBe(false);
    expect(r.attempts).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
