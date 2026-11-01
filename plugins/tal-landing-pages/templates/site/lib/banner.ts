/**
 * חישובים טהורים לבאנר בתחתית המסך (באנר העוגיות), בלי DOM, כדי שאפשר לבדוק אותם.
 */

/** רוחב הפינה השמאלית שבה יושב כפתור הנגישות (16px שוליים + 48px כפתור + מרווח) */
export const A11Y_CORNER_PX = 80;
/** כמה מקום כפתור הנגישות צריך מעל תחתית המסך: 16px שוליים + 48px כפתור + 16px מרווח */
const A11Y_BUTTON_ROOM_PX = 80;
/** ה-scroll-padding-bottom הקבוע של הדף (globals.css), בשביל כפתור הנגישות */
const BASE_SCROLL_PADDING_PX = 88;

export type BannerLayout = {
  /** כמה מקום הבאנר תופס מתחתית המסך (כולל רווח קטן). המרווח התחתון של הדף */
  occupied: number;
  /**
   * בכמה להרים את כפתור הנגישות (--cookie-banner-height), או null כשהבאנר לא מגיע לפינה שלו.
   * מוגבל כך שהכפתור תמיד נשאר בתוך המסך, גם כשהבאנר גבוה (טקסט 130%, טלפון שוכב).
   */
  buttonLift: number | null;
  /** scroll-padding-bottom בזמן שהבאנר פתוח: שדה בפוקוס לא ייגלל אל מאחורי הבאנר */
  scrollPadding: number;
};

export function bannerLayout(v: {
  innerHeight: number;
  /** getBoundingClientRect().top של הבאנר */
  top: number;
  /** getBoundingClientRect().left של הבאנר */
  left: number;
}): BannerLayout {
  const occupied = Math.max(0, Math.ceil(v.innerHeight - v.top + 8));
  const maxLift = Math.max(0, v.innerHeight - A11Y_BUTTON_ROOM_PX);
  const buttonLift =
    v.left < A11Y_CORNER_PX ? Math.min(occupied, maxLift) : null;
  // מעל הבאנר, ובפינה השמאלית גם מעל הכפתור שהורם (48px + מרווח)
  const wanted = Math.max(
    BASE_SCROLL_PADDING_PX,
    occupied,
    buttonLift === null ? 0 : buttonLift + 72,
  );
  // לא יותר מהמסך: תמיד נשאר פס גלוי שאליו הדפדפן יכול לגלול
  const scrollPadding = Math.min(
    wanted,
    Math.max(BASE_SCROLL_PADDING_PX, v.innerHeight - 96),
  );
  return { occupied, buttonLift, scrollPadding };
}

/** פתיחה אוטומטית: מעבירים את הפוקוס לכותרת הבאנר רק אם הוא לא היה בשום מקום (body) */
export function focusTitleOnAutoOpen(v: { activeIsBody: boolean }): boolean {
  return v.activeIsBody;
}

/**
 * לאן הפוקוס הולך כשהבאנר נסגר.
 * - הפוקוס בתוך הבאנר (או נפל ל-body): חוזרים לאלמנט ששמרנו לפני הפתיחה, אם הוא עוד בדף. אחרת ל-main.
 * - הפוקוס כבר במקום אחר בדף (למשל בשדה בטופס): לא מזיזים אותו.
 */
export function closeFocusTarget(v: {
  inPanel: boolean;
  onBody: boolean;
  savedConnected: boolean;
}): "saved" | "main" | "stay" {
  if (!v.inPanel && !v.onBody) return "stay";
  return v.savedConnected ? "saved" : "main";
}
