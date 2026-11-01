import { cleanString } from "@/lib/text";

/** המפתחות היחידים שנאספים ממקור התנועה. כל השאר נזרק */
export const TRACKING_KEYS = [
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
] as const;

export type TrackingKey = (typeof TRACKING_KEYS)[number];

/** מאיפה הגיע הליד. כל ערך מחרוזת (ריקה אם אין). source = utm_source או "אחר" */
export type Tracking = Record<TrackingKey, string> & { source: string };

const MAX = 300;
export const UNKNOWN_SOURCE = "אחר";

export function pickTracking(input: unknown): Tracking {
  const src =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const out = {} as Record<TrackingKey, string>;
  for (const key of TRACKING_KEYS) {
    const value = Object.prototype.hasOwnProperty.call(src, key)
      ? src[key]
      : undefined;
    out[key] = cleanString(value, MAX);
  }
  return { ...out, source: out.utm_source || UNKNOWN_SOURCE };
}
