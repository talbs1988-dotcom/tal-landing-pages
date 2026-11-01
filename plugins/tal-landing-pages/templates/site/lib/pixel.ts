/**
 * לוגיקה טהורה של פיקסל מטא: בדיקת מזהה,
 * ומנגנון "פעם אחת בלבד" לאירוע Lead (גם ב-StrictMode וגם אחרי רענון).
 */

/** מזהה פיקסל: ספרות בלבד, 6–20. כל דבר אחר = לא טוענים את הפיקסל */
export function isValidPixelId(id: unknown): id is string {
  return typeof id === "string" && /^\d{6,20}$/.test(id);
}

export function leadEventKey(eventId: string): string {
  return `meta-lead:${eventId}`;
}

export type KeyStore = { has(key: string): boolean; add(key: string): void };

export function memoryKeyStore(): KeyStore {
  const set = new Set<string>();
  return { has: (k) => set.has(k), add: (k) => void set.add(k) };
}

type SessionLike = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
};

/** sessionStorage עטוף: אם הוא חסום או זורק, מתנהג כאילו ריק ולא מפיל */
export function sessionKeyStore(get: () => SessionLike | undefined): KeyStore {
  return {
    has(k) {
      try {
        return get()?.getItem(k) === "1";
      } catch {
        return false;
      }
    },
    add(k) {
      try {
        get()?.setItem(k, "1");
      } catch {
        // אין אחסון: נשארת ההגנה שבזיכרון
      }
    },
  };
}

/** true בפעם הראשונה בלבד: אם אחד המאגרים כבר מכיר את המפתח → false */
export function claimOnce(key: string, stores: KeyStore[]): boolean {
  if (stores.some((s) => s.has(key))) return false;
  for (const s of stores) s.add(key);
  return true;
}
