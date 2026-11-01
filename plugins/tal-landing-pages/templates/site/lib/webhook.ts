type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export type WebhookResult = { ok: boolean; status?: number; attempts: number };

const TIMEOUT_MS = 8000;

/**
 * שולח JSON לוובהוק (למשל Make).
 * כל ניסיון מוגבל ל-8 שניות. ניסיון חוזר אחד על שגיאת רשת, timeout או 5xx.
 * על 4xx אין ניסיון חוזר (הבעיה בבקשה או בכתובת, ניסיון נוסף לא יעזור).
 * לא זורק.
 */
export async function postWebhook(
  url: string,
  body: unknown,
  opts: { fetch?: FetchFn; timeoutMs?: number; retries?: number } = {},
): Promise<WebhookResult> {
  const fetchFn = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const maxAttempts = 1 + (opts.retries ?? 1);
  const json = JSON.stringify(body);

  let last: WebhookResult = { ok: false, attempts: 0 };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchFn(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: json,
        signal: controller.signal,
      });
      // לא צריכים את התשובה. משחררים את החיבור
      await res.body?.cancel().catch(() => {});
      last = { ok: res.ok, status: res.status, attempts: attempt };
      if (res.ok || res.status < 500) return last;
    } catch {
      last = { ok: false, attempts: attempt };
    } finally {
      clearTimeout(timer);
    }
  }
  return last;
}
