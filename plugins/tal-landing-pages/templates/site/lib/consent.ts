import { useSyncExternalStore } from "react";

/**
 * הסכמה לעוגיות: מקור אחד לבאנר, לפיקסל ולאירוע ה-Lead.
 * שלוש קטגוריות: חיוניים (תמיד), מדידה (analytics), שיווק (marketing).
 * נשמר ב-localStorage במפתח cookie-consent-v1, עם גרסה ותאריך.
 * גרסה אחרת = מבקשים בחירה מחדש.
 */

export const CONSENT_KEY = "cookie-consent-v1";
export const CONSENT_VERSION = 1;

/** נשלח כשהגולש שמר בחירה חדשה. ה-detail הוא ה-Consent */
export const CONSENT_CHANGED_EVENT = "cookie-consent-changed";

/** נשלח מכפתור "העדפות עוגיות" בפוטר. הבאנר נפתח מחדש כשהוא שומע אותו */
export const CONSENT_REOPEN_EVENT = "cookie-consent-reopen";

export type ConsentChoice = { analytics: boolean; marketing: boolean };

export type Consent = ConsentChoice & {
  version: typeof CONSENT_VERSION;
  necessary: true;
  /** מתי נשמרה הבחירה (ISO) */
  updatedAt: string;
};

export const ACCEPT_ALL: ConsentChoice = Object.freeze({
  analytics: true,
  marketing: true,
});
export const REJECT_ALL: ConsentChoice = Object.freeze({
  analytics: false,
  marketing: false,
});

export function serializeConsent(choice: ConsentChoice, now: Date): string {
  const consent: Consent = {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: choice.analytics === true,
    marketing: choice.marketing === true,
    updatedAt: now.toISOString(),
  };
  return JSON.stringify(consent);
}

/** JSON פגום, גרסה אחרת או שדות חסרים → null */
export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (d.version !== CONSENT_VERSION) return null;
  if (typeof d.analytics !== "boolean" || typeof d.marketing !== "boolean")
    return null;
  if (typeof d.updatedAt !== "string" || Number.isNaN(Date.parse(d.updatedAt)))
    return null;
  return {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: d.analytics,
    marketing: d.marketing,
    updatedAt: d.updatedAt,
  };
}

/* ───────────── מאגר בדפדפן ───────────── */

// גיבוי בזיכרון למקרה ש-localStorage חסום (מצב פרטי). הבחירה תקפה לפחות עד רענון
let memoryRaw: string | null = null;
let cachedRaw: string | null = null;
let cached: Consent | null = null;

function storageRead(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

/** הבחירה השמורה, או null אם עוד לא נבחר. אותו אובייקט כל עוד לא השתנה */
export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  const raw = storageRead() ?? memoryRaw;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseConsent(raw);
  }
  return cached;
}

/** שומר בחירה ושולח cookie-consent-changed עם הבחירה ב-detail */
export function writeConsent(choice: ConsentChoice): Consent {
  const raw = serializeConsent(choice, new Date());
  memoryRaw = raw;
  try {
    window.localStorage.setItem(CONSENT_KEY, raw);
  } catch {
    // נשאר בזיכרון בלבד
  }
  const consent = readConsent() ?? (parseConsent(raw) as Consent);
  window.dispatchEvent(
    new CustomEvent<Consent>(CONSENT_CHANGED_EVENT, { detail: consent }),
  );
  return consent;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CONSENT_KEY) onChange();
  };
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** הבחירה הנוכחית ב-React. בשרת ובטעינה הראשונה: null */
export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, readConsent, () => null);
}
