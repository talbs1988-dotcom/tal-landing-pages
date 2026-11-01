/**
 * העדפות הנגישות של הגולש (כפתור הנגישות).
 *
 * כל מצב הוא class על <html>, והעיצוב שלו מוגדר ב-app/globals.css.
 * ההעדפות נשמרות ב-localStorage, וסקריפט קטן (a11yInitScript) מחיל אותן
 * לפני שהדף מצויר, כדי שלא יהיה הבהוב של טקסט קטן שגדל פתאום.
 */

export const A11Y_KEY = "a11y-v1";
export const A11Y_VERSION = 1;

/** גודל הטקסט באחוזים מגודל הבסיס של הדפדפן. Tailwind עובד ב-rem, אז הכול גדל יחד */
export const TEXT_SIZES = [100, 115, 130] as const;
export type TextLevel = 0 | 1 | 2;

export type A11yPrefs = {
  /** 0 = רגיל, 1 = גדול, 2 = גדול מאוד */
  textSize: TextLevel;
  /** ניגודיות גבוהה: שחור, לבן וקישורים בצהוב */
  contrast: boolean;
  /** הדגשת קישורים: קו תחתון עבה ורקע צהוב */
  links: boolean;
  /** עצירת אנימציות ומעברים */
  noMotion: boolean;
};

export const DEFAULT_PREFS: A11yPrefs = Object.freeze({
  textSize: 0,
  contrast: false,
  links: false,
  noMotion: false,
});

/** שמות ה-class על <html>. אותם שמות מופיעים ב-globals.css */
export const A11Y_CLASSES = {
  text: ["", "a11y-text-115", "a11y-text-130"] as const,
  contrast: "a11y-contrast",
  links: "a11y-links",
  noMotion: "a11y-no-motion",
} as const;

export const ALL_A11Y_CLASSES: readonly string[] = [
  A11Y_CLASSES.text[1],
  A11Y_CLASSES.text[2],
  A11Y_CLASSES.contrast,
  A11Y_CLASSES.links,
  A11Y_CLASSES.noMotion,
];

function isTextLevel(v: unknown): v is TextLevel {
  return v === 0 || v === 1 || v === 2;
}

/** קורא את מה שנשמר. ערך פגום, גרסה אחרת או שדה לא תקין ← ברירת המחדל */
export function parsePrefs(raw: string | null | undefined): A11yPrefs {
  if (!raw) return { ...DEFAULT_PREFS };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_PREFS };
  }
  if (!data || typeof data !== "object") return { ...DEFAULT_PREFS };
  const d = data as Record<string, unknown>;
  if (d.v !== A11Y_VERSION) return { ...DEFAULT_PREFS };
  return {
    textSize: isTextLevel(d.textSize) ? d.textSize : 0,
    contrast: d.contrast === true,
    links: d.links === true,
    noMotion: d.noMotion === true,
  };
}

export function serializePrefs(p: A11yPrefs): string {
  return JSON.stringify({
    v: A11Y_VERSION,
    textSize: p.textSize,
    contrast: p.contrast,
    links: p.links,
    noMotion: p.noMotion,
  });
}

export function isDefaultPrefs(p: A11yPrefs): boolean {
  return p.textSize === 0 && !p.contrast && !p.links && !p.noMotion;
}

/** אילו class צריכים להיות על <html> לפי ההעדפות */
export function prefsToClasses(p: A11yPrefs): string[] {
  const out: string[] = [];
  if (p.textSize > 0) out.push(A11Y_CLASSES.text[p.textSize]);
  if (p.contrast) out.push(A11Y_CLASSES.contrast);
  if (p.links) out.push(A11Y_CLASSES.links);
  if (p.noMotion) out.push(A11Y_CLASSES.noMotion);
  return out;
}

/** מחיל את ההעדפות על אלמנט (בפועל <html>): מסיר את כל מצבי הנגישות ומוסיף את הנדרשים */
export function applyPrefs(
  el: {
    classList: { add(...t: string[]): void; remove(...t: string[]): void };
  },
  p: A11yPrefs,
): void {
  el.classList.remove(...ALL_A11Y_CLASSES);
  const add = prefsToClasses(p);
  if (add.length) el.classList.add(...add);
}

/**
 * האם להימנע מתנועה: הגולש ביקש "עצירת אנימציות", או שמערכת ההפעלה מבקשת פחות תנועה.
 * רכיבים עם אנימציה ב-JS (גלילה חלקה, ספריות אנימציה) צריכים לבדוק את זה.
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.classList.contains(A11Y_CLASSES.noMotion))
    return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

/**
 * סקריפט קטן שרץ בתחילת ה-body, לפני שהתוכן מצויר, ומחיל את ההעדפות השמורות.
 * חייב להתנהג בדיוק כמו parsePrefs + prefsToClasses (יש על זה בדיקה).
 */
export function a11yInitScript(): string {
  const key = JSON.stringify(A11Y_KEY);
  const text = JSON.stringify(A11Y_CLASSES.text);
  const c = JSON.stringify(A11Y_CLASSES.contrast);
  const l = JSON.stringify(A11Y_CLASSES.links);
  const m = JSON.stringify(A11Y_CLASSES.noMotion);
  return (
    "(function(){try{" +
    `var d=JSON.parse(localStorage.getItem(${key})||"null");` +
    `if(!d||typeof d!=="object"||d.v!==${A11Y_VERSION})return;` +
    "var r=document.documentElement.classList,t=d.textSize;" +
    `if(t===1||t===2)r.add(${text}[t]);` +
    `if(d.contrast===true)r.add(${c});` +
    `if(d.links===true)r.add(${l});` +
    `if(d.noMotion===true)r.add(${m});` +
    "}catch(e){}})();"
  );
}
