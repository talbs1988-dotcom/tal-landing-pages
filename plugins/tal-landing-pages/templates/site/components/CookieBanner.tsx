"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  ACCEPT_ALL,
  CONSENT_REOPEN_EVENT,
  REJECT_ALL,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/consent";

/*
 * באנר העוגיות. אסור להוריד אותו.
 * - מופיע אחרי כ-800ms רק אם עוד לא נשמרה בחירה. נפתח מחדש מכפתור "העדפות עוגיות" בפוטר.
 * - שלושה כפתורים בגודל ובבולטות זהים. דחייה לא מוסתרת ולא קטנה יותר.
 * - חלון לא-מודאלי בתחתית: הדף נשאר שמיש, והפוקוס עובר לכותרת כשהבאנר מופיע.
 * - Esc לא מסכים לשום דבר. אם כבר יש בחירה, Esc סוגר בלי לשנות.
 * - במובייל הבאנר בתחתית לכל הרוחב, ובדסקטופ בצד ימין.
 * - בזמן שהוא פתוח: לגוף הדף מתווסף מרווח תחתון בגובהו (כדי שאפשר לגלול לכל דבר),
 *   ואם הוא מגיע לפינה השמאלית, --cookie-banner-height על <html> מרים את כפתור הנגישות מעליו.
 * - שכבות: באנר z-40, כפתור ותפריט הנגישות z-50 (מי שצריך הגדלת טקסט צריך להגיע אליה גם כשהבאנר פתוח).
 */

const SHOW_DELAY_MS = 800;

/** משתנה CSS על <html> שכפתור הנגישות קורא כדי לעלות מעל הבאנר */
const BANNER_VAR = "--cookie-banner-height";
/** רוחב הפינה השמאלית שבה יושב כפתור הנגישות (16px שוליים + 48px כפתור + מרווח) */
const A11Y_CORNER_PX = 80;

const button =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-primary bg-primary px-2 py-2 text-sm font-semibold text-white hover:brightness-110";

export function CookieBanner() {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [draft, setDraft] = useState<ConsentChoice>(REJECT_ALL);
  const [hasChoice, setHasChoice] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // פתיחה ראשונה: רק אם אין בחירה שמורה
  useEffect(() => {
    if (readConsent()) {
      setHasChoice(true);
      return;
    }
    const t = window.setTimeout(() => {
      returnFocus.current = null;
      setDraft(REJECT_ALL);
      setCustomize(false);
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // פתיחה מחדש מהפוטר, עם הבחירה הנוכחית מסומנת
  useEffect(() => {
    function reopen() {
      const current = readConsent();
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setHasChoice(Boolean(current));
      setDraft(
        current
          ? { analytics: current.analytics, marketing: current.marketing }
          : REJECT_ALL,
      );
      setCustomize(true);
      setOpen(true);
    }
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  // הפוקוס עובר לכותרת כשהבאנר נפתח
  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  // מרווח בתחתית הדף בגובה הבאנר, כדי שאפשר לגלול לכל מה שמתחתיו (למשל כפתור הטופס)
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const body = document.body;
    const root = document.documentElement;
    const previous = body.style.paddingBottom;
    const apply = () => {
      const rect = panel.getBoundingClientRect();
      // כמה מקום הבאנר תופס מתחתית המסך (כולל רווח קטן)
      const occupied = Math.ceil(window.innerHeight - rect.top + 8);
      body.style.paddingBottom = `${occupied}px`;
      // כפתור הנגישות (פינה שמאלית, ~80px) עולה מעל הבאנר רק כשהבאנר מגיע לפינה הזו
      if (rect.left < A11Y_CORNER_PX) root.style.setProperty(BANNER_VAR, `${occupied}px`);
      else root.style.removeProperty(BANNER_VAR);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(panel);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      body.style.paddingBottom = previous;
      root.style.removeProperty(BANNER_VAR);
    };
  }, [open, customize]);

  function close() {
    setOpen(false);
    returnFocus.current?.focus();
    returnFocus.current = null;
  }

  function save(choice: ConsentChoice) {
    writeConsent(choice);
    setHasChoice(true);
    close();
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onKeyDown={(e) => {
        if (e.key === "Escape" && hasChoice) close();
      }}
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto max-w-md rounded-2xl border border-black/15 bg-white p-4 text-sm shadow-xl sm:inset-x-auto sm:right-4 sm:bottom-[calc(env(safe-area-inset-bottom)+1rem)] sm:mx-0"
    >
      <h2
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="text-base font-bold"
      >
        עוגיות באתר
      </h2>
      <p id={descId} className="mt-1.5 leading-relaxed">
        עוגיות חיוניות שומרות את הבחירות שלך. עוגיות מדידה ושיווק רק באישור.
        אפשר לשנות בכל רגע בתחתית הדף.{" "}
        <Link
          href="/privacy"
          className="font-medium underline underline-offset-2"
        >
          מדיניות הפרטיות
        </Link>
      </p>

      {customize && (
        <fieldset className="mt-3 space-y-2.5">
          <legend className="sr-only">בחירת סוגי עוגיות</legend>
          <p>
            <span className="font-semibold">חיוניות (תמיד פעילות):</span> שומרות את בחירת העוגיות
            והגדרות הנגישות.
          </p>
          <div className="flex items-start gap-2.5">
            <input
              id={`${uid}-analytics`}
              type="checkbox"
              checked={draft.analytics}
              onChange={(e) =>
                setDraft((d) => ({ ...d, analytics: e.target.checked }))
              }
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <label htmlFor={`${uid}-analytics`}>
              <span className="font-semibold">מדידה:</span> סופרות ביקורים כדי
              להבין מה עובד בדף.
            </label>
          </div>
          <div className="flex items-start gap-2.5">
            <input
              id={`${uid}-marketing`}
              type="checkbox"
              checked={draft.marketing}
              onChange={(e) =>
                setDraft((d) => ({ ...d, marketing: e.target.checked }))
              }
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <label htmlFor={`${uid}-marketing`}>
              <span className="font-semibold">שיווק:</span> פיקסל של מטא, שמודד
              אילו מודעות הביאו פניות ומציג מודעות למי שביקר כאן.
            </label>
          </div>
        </fieldset>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          className={button}
          onClick={() => save(REJECT_ALL)}
        >
          דחיית הכול
        </button>
        {customize ? (
          <button type="button" className={button} onClick={() => save(draft)}>
            שמירת הבחירה
          </button>
        ) : (
          <button
            type="button"
            className={button}
            onClick={() => setCustomize(true)}
          >
            התאמה
          </button>
        )}
        <button
          type="button"
          className={button}
          onClick={() => save(ACCEPT_ALL)}
        >
          אישור הכול
        </button>
      </div>
    </div>
  );
}
