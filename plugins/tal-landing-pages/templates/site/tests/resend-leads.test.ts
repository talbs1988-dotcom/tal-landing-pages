import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  findLeadFiles,
  resendLeads,
  toWebhookPayload as scriptPayload,
  // @ts-expect-error קובץ mjs בלי טיפוסים
} from "../scripts/resend-leads.mjs";
import { buildLeadRecord, toWebhookPayload, type Lead } from "@/lib/lead";
import { pickTracking } from "@/lib/utm";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function record(name = "דנה כהן", tracking: Record<string, string> = {}) {
  const lead: Lead = {
    name,
    email: "dana@example.co.il",
    phone: "0501234567",
    marketingConsent: true,
  };
  return buildLeadRecord(
    lead,
    pickTracking({ utm_source: "facebook", landingPath: "/?a=1", ...tracking }),
    {
      now: new Date("2026-11-01T10:00:00.000Z"),
      baseUrl: new URL("https://example.co.il"),
      userAgent: "UA",
    },
  );
}

/** תיקייה כמו שבעל העסק מוריד מה-Blob: leads/<תאריך>/<id>.json */
function leadsFolder(records: unknown[], extra: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "leads-"));
  dirs.push(root);
  const day = join(root, "leads", "2026-11-01");
  mkdirSync(day, { recursive: true });
  records.forEach((r, i) =>
    writeFileSync(join(day, `${i}.json`), JSON.stringify(r)),
  );
  for (const [rel, text] of Object.entries(extra))
    writeFileSync(join(root, rel), text);
  return root;
}

describe("scripts/resend-leads.mjs", () => {
  it("הגוף שנשלח זהה בדיוק למה שהאתר שולח לוובהוק", () => {
    for (const r of [
      record(),
      record('=HYPERLINK("https://evil.example")', { utm_campaign: "+x" }),
    ]) {
      expect(scriptPayload(r)).toEqual(toWebhookPayload(r));
      expect(Object.keys(scriptPayload(r))).toEqual(
        Object.keys(toWebhookPayload(r)),
      );
    }
  });

  it("מוצא את קבצי ה-JSON בכל תת-התיקיות, בסדר קבוע", () => {
    const root = leadsFolder([record(), record()], { "notes.txt": "x" });
    const files = findLeadFiles(root) as string[];
    expect(files).toHaveLength(2);
    expect(files.every((f) => f.endsWith(".json"))).toBe(true);
  });

  it("שולח כל ליד ב-POST JSON לכתובת שהועברה, ומדווח מה הצליח", async () => {
    const a = record();
    const b = record("יוסי לוי");
    const root = leadsFolder([a, b]);
    const fetch = vi.fn(async () => new Response("ok", { status: 200 }));
    const lines: string[] = [];
    const r = await resendLeads({
      paths: [root],
      url: "https://hook.example/abc",
      fetch,
      log: (l: string) => lines.push(l),
    });
    expect(r).toMatchObject({ sent: 2, failed: 0, skipped: 0 });
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://hook.example/abc");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
    const sentIds = fetch.mock.calls.map(
      (c) =>
        JSON.parse(String((c as unknown as [string, RequestInit])[1].body)).id,
    );
    expect(sentIds.sort()).toEqual([a.id, b.id].sort());
    // הלוג מדפיס מזהים, לא שמות או מיילים
    const out = lines.join("\n");
    expect(out).toContain(a.id);
    expect(out).not.toMatch(/dana|דנה|יוסי/);
  });

  it("קובץ שאינו ליד מדולג, וכישלון בשליחה נספר", async () => {
    const root = leadsFolder([record(), { hello: 1 }], { "bad.json": "{" });
    const fetch = vi.fn(async () => new Response("", { status: 410 }));
    const r = await resendLeads({
      paths: [root],
      url: "https://hook.example/abc",
      fetch,
      log: () => {},
    });
    expect(r).toMatchObject({ sent: 0, failed: 1, skipped: 2 });
  });

  it("dry-run: לא שולח כלום", async () => {
    const root = leadsFolder([record()]);
    const fetch = vi.fn(async () => new Response("ok"));
    const r = await resendLeads({
      paths: [root],
      url: "https://hook.example/abc",
      fetch,
      dryRun: true,
      log: () => {},
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(r).toMatchObject({ sent: 0, wouldSend: 1 });
  });

  it("כתובת וובהוק לא תקינה נדחית לפני ששולחים משהו", async () => {
    const fetch = vi.fn();
    await expect(
      resendLeads({ paths: [], url: "not-a-url", fetch, log: () => {} }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
