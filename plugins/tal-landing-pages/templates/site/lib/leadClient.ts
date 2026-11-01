import { isUuid } from "@/lib/lead";

/**
 * פענוח התשובה של POST /api/lead בצד הדפדפן.
 * החוזה: הצלחה = { ok: true, id?, eventId? } (בספאם אין id).
 * כישלון = { ok: false, errors: {name|email|phone|form} } או { ok: false, error }.
 */
export type FieldName = "name" | "email" | "phone";

export type SubmitOutcome =
  | { kind: "success"; eventId?: string }
  | { kind: "fieldErrors"; errors: Partial<Record<FieldName, string>> }
  | { kind: "error"; message: string };

export const GENERIC_ERROR = "משהו השתבש בשליחה. נא לנסות שוב בעוד רגע.";
export const NETWORK_ERROR =
  "אין חיבור לאינטרנט כרגע. נא לבדוק את החיבור ולנסות שוב.";

const FIELDS: FieldName[] = ["name", "email", "phone"];

export function interpretResponse(
  status: number,
  json: unknown,
): SubmitOutcome {
  const data =
    json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  if (!data) return { kind: "error", message: GENERIC_ERROR };

  if (data.ok === true && status >= 200 && status < 300) {
    return isUuid(data.eventId)
      ? { kind: "success", eventId: data.eventId }
      : { kind: "success" };
  }

  const errors =
    data.errors && typeof data.errors === "object"
      ? (data.errors as Record<string, unknown>)
      : null;
  if (errors) {
    const fieldErrors: Partial<Record<FieldName, string>> = {};
    for (const f of FIELDS) {
      if (typeof errors[f] === "string") fieldErrors[f] = errors[f] as string;
    }
    if (Object.keys(fieldErrors).length > 0)
      return { kind: "fieldErrors", errors: fieldErrors };
    if (typeof errors.form === "string")
      return { kind: "error", message: errors.form };
  }

  if (typeof data.error === "string" && data.error)
    return { kind: "error", message: data.error };
  return { kind: "error", message: GENERIC_ERROR };
}

/** לאן עוברים אחרי שליחה. e רק אם זה UUID תקין */
export function thankYouHref(eventId?: string): string {
  return isUuid(eventId) ? `/thank-you?e=${eventId}` : "/thank-you";
}
