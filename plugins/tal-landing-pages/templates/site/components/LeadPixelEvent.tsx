"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent";
import {
  claimOnce,
  leadEventKey,
  memoryKeyStore,
  sessionKeyStore,
} from "@/lib/pixel";
import { PIXEL_ID, ensurePixel } from "@/lib/pixelClient";

/*
 * אירוע Lead בפיקסל, בדף התודה בלבד.
 * eventID זהה למה שהשרת שולח ל-Conversions API, כדי שמטא תספור פעם אחת.
 * נשלח פעם אחת לכל eventId: גם ב-StrictMode וגם אחרי רענון (sessionStorage).
 * בלי הסכמה לשיווק לא נשלח. אם ההסכמה ניתנה אחרי שהגיעו לדף, נשלח אז.
 */

const fired = [
  memoryKeyStore(),
  sessionKeyStore(() =>
    typeof window === "undefined" ? undefined : window.sessionStorage,
  ),
];

export function LeadPixelEvent({ eventId }: { eventId?: string }) {
  const consent = useConsent();
  const marketing = consent?.marketing === true;

  useEffect(() => {
    if (!eventId || !marketing || !PIXEL_ID) return;
    if (!claimOnce(leadEventKey(eventId), fired)) return;
    // הרכיב הזה רץ לפני MetaPixel בעץ, אז מוודאים שהפיקסל מוכן (פעולה חד-פעמית)
    const fbq = ensurePixel(PIXEL_ID);
    fbq?.("consent", "grant");
    fbq?.("track", "Lead", {}, { eventID: eventId });
  }, [eventId, marketing]);

  return null;
}
