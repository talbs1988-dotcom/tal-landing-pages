import { createHash } from "node:crypto";
import { phoneToInternational, type LeadRecord } from "@/lib/lead";

/**
 * גרסת ה-Graph API של מטא. מקום אחד לעדכן.
 * נבדק מול https://developers.facebook.com/docs/graph-api/changelog/versions
 * (v26.0 יצאה ב-29.7.2026). מטא תומכת בכל גרסה כשנתיים.
 */
export const GRAPH_API_VERSION = "v26.0";

const TIMEOUT_MS = 5000;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function capiUrl(pixelId: string): string {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events`;
}

export type CapiUserData = {
  em: string[];
  ph?: string[];
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
};

export type CapiEvent = {
  event_name: "Lead";
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url: string;
  user_data: CapiUserData;
};

export type CapiPayload = { data: CapiEvent[]; test_event_code?: string };

/**
 * אירוע Lead ל-Conversions API.
 * מייל וטלפון מגובבים SHA-256 אחרי נרמול (מייל באותיות קטנות, טלפון 972XXXXXXXXX).
 * ה-IP נשלח למטא בלבד ולא נשמר אצלנו.
 * קוראים לפונקציה הזו רק אם הליד הסכים לשיווק.
 */
export function buildCapiEvent(
  record: LeadRecord,
  opts: { sourceUrl: string; clientIp?: string; testEventCode?: string },
): CapiPayload {
  const createdMs = new Date(record.createdAt).getTime();
  const { lead, tracking } = record;

  const user_data: CapiUserData = {
    em: [sha256Hex(lead.email.trim().toLowerCase())],
  };
  if (lead.phone) user_data.ph = [sha256Hex(phoneToInternational(lead.phone))];
  if (tracking.fbp) user_data.fbp = tracking.fbp;
  if (tracking.fbc) user_data.fbc = tracking.fbc;
  else if (tracking.fbclid)
    user_data.fbc = `fb.1.${createdMs}.${tracking.fbclid}`;
  if (opts.clientIp) user_data.client_ip_address = opts.clientIp;
  if (record.userAgent) user_data.client_user_agent = record.userAgent;

  const payload: CapiPayload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(createdMs / 1000),
        event_id: record.eventId,
        action_source: "website",
        event_source_url: opts.sourceUrl,
        user_data,
      },
    ],
  };
  if (opts.testEventCode) payload.test_event_code = opts.testEventCode;
  return payload;
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * שליחה למטא. ניסיון אחד, עד 5 שניות. לא זורק.
 * הטוקן נשלח בגוף הבקשה ולא בכתובת, כדי שלא יופיע בלוגים של כתובות.
 */
export async function sendCapi(
  payload: CapiPayload,
  opts: { pixelId: string; token: string; fetch?: FetchFn; timeoutMs?: number },
): Promise<{ ok: boolean; status?: number }> {
  const fetchFn = opts.fetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? TIMEOUT_MS,
  );
  try {
    const res = await fetchFn(capiUrl(opts.pixelId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, access_token: opts.token }),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
