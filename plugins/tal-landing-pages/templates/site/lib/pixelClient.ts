import { isValidPixelId } from "@/lib/pixel";

/**
 * טעינת הפיקסל של מטא בדפדפן. נקרא רק אחרי הסכמה לשיווק.
 * טוען את fbevents.js פעם אחת בלבד, גם אם קוראים לו מכמה רכיבים.
 */

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** מזהה הפיקסל מהסביבה (נכנס לקוד בזמן הבנייה). לא תקין = undefined */
export const PIXEL_ID: string | undefined = isValidPixelId(
  process.env.NEXT_PUBLIC_META_PIXEL_ID,
)
  ? process.env.NEXT_PUBLIC_META_PIXEL_ID
  : undefined;

let initializedId: string | null = null;

/**
 * מכין את fbq (תור פקודות) ומוסיף את הסקריפט פעם אחת.
 * מחזיר את fbq, או null אם אין מזהה תקין.
 */
export function ensurePixel(
  pixelId: string | undefined = PIXEL_ID,
): Fbq | null {
  if (typeof window === "undefined" || !isValidPixelId(pixelId)) return null;

  if (!window.fbq) {
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue.push(args);
    } as Fbq;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    window.fbq = n;
    if (!window._fbq) window._fbq = n;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  if (initializedId !== pixelId) {
    // בלי זיהוי אוטומטי של כפתורים ונתונים בדף: רק האירועים שאנחנו שולחים
    window.fbq("set", "autoConfig", false, pixelId);
    window.fbq("init", pixelId);
    initializedId = pixelId;
  }
  return window.fbq;
}

/** הפיקסל כבר נטען בעמוד הזה? (בלי לטעון אותו) */
export function pixelLoaded(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}
