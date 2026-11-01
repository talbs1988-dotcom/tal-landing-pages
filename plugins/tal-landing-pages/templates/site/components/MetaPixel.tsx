"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent";
import { PIXEL_ID, ensurePixel, pixelLoaded } from "@/lib/pixelClient";
import { META_COOKIES, expiredCookies, readCookie } from "@/lib/tracking";

/** מוחק את _fbp ו-_fbc (בדומיין הנוכחי ובדומיינים שמעליו), רק אם הן קיימות */
function clearMetaCookies() {
  if (!META_COOKIES.some((n) => readCookie(document.cookie, n))) return;
  for (const c of expiredCookies(META_COOKIES, window.location.hostname)) {
    document.cookie = c;
  }
}

/*
 * פיקסל מטא. בלי NEXT_PUBLIC_META_PIXEL_ID תקין, או בלי הסכמה לשיווק,
 * לא נטען שום סקריפט ולא יוצאת שום בקשה לפייסבוק.
 * עם הסכמה: טעינה, init ו-PageView אחד לטעינת הדף.
 * מעברי דף בתוך האתר (router.push / Link): הפיקסל מזהה אותם לבד (history) ושולח PageView
 * אחד לכל מעבר. נבדק: fbevents מתעלם מ-PageView ידני נוסף באותו מסמך, אז לא שולחים כפול.
 * ביטול הסכמה: fbq('consent','revoke'), ומאז לא נשלח שום אירוע.
 * בלי הסכמה לשיווק (גם אחרי ביטול): העוגיות _fbp ו-_fbc נמחקות, כדי שלא יישלחו עם ליד.
 */

// ברמת המודול, כדי ש-StrictMode (שמריץ אפקטים פעמיים) לא ישלח כפול
let granted = false;
let pageViewSent = false;

export function MetaPixel() {
  const consent = useConsent();
  const marketing = consent?.marketing === true;

  useEffect(() => {
    // consent === null בטעינה הראשונה (לפני שנקראה הבחירה). מוחקים רק אחרי בחירה בלי שיווק
    if (consent && !marketing) clearMetaCookies();
    if (!PIXEL_ID) return;
    if (marketing) {
      const fbq = ensurePixel(PIXEL_ID);
      if (!fbq) return;
      if (!granted) {
        fbq("consent", "grant");
        granted = true;
      }
      if (!pageViewSent) {
        fbq("track", "PageView");
        pageViewSent = true;
      }
    } else if (pixelLoaded()) {
      window.fbq?.("consent", "revoke");
      granted = false;
    }
  }, [marketing, consent]);

  return null;
}
