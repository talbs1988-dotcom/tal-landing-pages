/**
 * הסכמה לעוגיות. בשלב הזה רק שמות האירועים, שהפוטר כבר משתמש בהם.
 * הלוגיקה המלאה (parse, serialize, גרסה) נוספת עם באנר העוגיות.
 */

/** נשלח כשהגולש שמר בחירה חדשה. MetaPixel מאזין לו */
export const CONSENT_CHANGED_EVENT = "cookie-consent-changed";

/** נשלח מכפתור "העדפות עוגיות" בפוטר. באנר העוגיות נפתח מחדש כשהוא שומע אותו */
export const CONSENT_REOPEN_EVENT = "cookie-consent-reopen";
