/**
 * הגבלת קצב פשוטה בזיכרון: חלון נע של windowMs, עד limit בקשות לכל מפתח (כתובת IP).
 *
 * "best effort": בשרת ללא מצב (Vercel) כל מופע של הפונקציה מחזיק זיכרון משלו,
 * אז זו הגנה בסיסית מפני הצפה ולא חומת אש.
 * מפתחות שפג תוקפם נמחקים כדי שהזיכרון לא יגדל, ויש תקרה למספר המפתחות.
 */
export type RateLimiter = {
  /** true = מותר. בקשה שנחסמה לא נספרת */
  check(key: string): boolean;
  /** כמה מפתחות שמורים כרגע (לבדיקות) */
  size(): number;
};

export function createRateLimiter(opts: {
  limit: number;
  windowMs: number;
  now?: () => number;
  maxKeys?: number;
}): RateLimiter {
  const { limit, windowMs } = opts;
  const now = opts.now ?? Date.now;
  const maxKeys = opts.maxKeys ?? 10_000;
  const hits = new Map<string, number[]>();
  let lastSweep = now();

  function sweep(t: number) {
    for (const [key, times] of hits) {
      if (times[times.length - 1] <= t - windowMs) hits.delete(key);
    }
    lastSweep = t;
  }

  return {
    check(key) {
      const t = now();
      if (t - lastSweep >= windowMs) sweep(t);

      const recent = (hits.get(key) ?? []).filter((ts) => ts > t - windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);

      if (!hits.has(key) && hits.size >= maxKeys) {
        sweep(t);
        // עדיין מלא: מוחקים את המפתח הוותיק ביותר (Map שומר סדר הכנסה)
        while (hits.size >= maxKeys) {
          const oldest = hits.keys().next().value;
          if (oldest === undefined) break;
          hits.delete(oldest);
        }
      }
      hits.set(key, recent);
      return true;
    },
    size() {
      return hits.size;
    },
  };
}
