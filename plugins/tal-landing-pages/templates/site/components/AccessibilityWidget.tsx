"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import {
  A11Y_KEY,
  DEFAULT_PREFS,
  TEXT_SIZES,
  applyPrefs,
  isDefaultPrefs,
  parsePrefs,
  pauseVideos,
  serializePrefs,
  shouldReduceMotion,
  type A11yPrefs,
  type TextLevel,
} from "@/lib/a11y";

/*
 * כפתור ותפריט נגישות. רכיב שלנו, בלי ספרייה חיצונית. אסור להוריד.
 *
 * - כל מצב הוא class על <html> (העיצוב ב-globals.css), ונשמר ב-localStorage.
 * - התפריט לא לוכד פוקוס: Tab עובר בין הפקדים ויוצא ממנו כרגיל (ואז הוא נסגר).
 *   Esc סוגר ומחזיר את הפוקוס לכפתור.
 * - הכפתור בפינה השמאלית התחתונה, 48 פיקסלים קבועים (לא גדל עם הטקסט),
 *   ומתרחק מהשוליים הבטוחים של האייפון. אם באנר העוגיות פתוח בתחתית,
 *   הבאנר מגדיר --cookie-banner-height על <html> והכפתור עולה מעליו.
 * - הכפתור הוא תוספת. הנגישות האמיתית היא בקוד של הדף עצמו.
 */

const TEXT_LABELS: Record<TextLevel, string> = {
  0: "רגיל",
  1: "גדול",
  2: "גדול מאוד",
};

const TOGGLES = [
  { key: "contrast", label: "ניגודיות גבוהה" },
  { key: "links", label: "הדגשת קישורים" },
  { key: "noMotion", label: "עצירת אנימציות" },
] as const;

const BLUE = "#2563EB";
const EDGE = "max(16px, env(safe-area-inset-left))";
const BOTTOM =
  "calc(max(16px, env(safe-area-inset-bottom)) + var(--cookie-banner-height, 0px))";
/*
 * התפריט נפתח מעל הכפתור. כשהכפתור הורם גבוה (באנר גבוה בתחתית), התפריט יורד
 * כך שיישארו לו לפחות 256px גובה. אז הוא עולה על הכפתור, ונסגר ב-× או ב-Esc.
 */
const PANEL_BOTTOM = `max(8px, min(calc(${BOTTOM} + 56px), calc(100dvh - 256px - 16px)))`;

function readStored(): A11yPrefs {
  try {
    return parsePrefs(window.localStorage.getItem(A11Y_KEY));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function store(p: A11yPrefs) {
  try {
    if (isDefaultPrefs(p)) window.localStorage.removeItem(A11Y_KEY);
    else window.localStorage.setItem(A11Y_KEY, serializePrefs(p));
  } catch {
    // דפדפן שחוסם אחסון: ההעדפות יחולו רק עד רענון הדף
  }
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstControlRef = useRef<HTMLButtonElement>(null);

  // טעינה פעם אחת. סקריפט האתחול כבר החיל את ה-class, כאן רק מסנכרנים את המצב
  useEffect(() => {
    setPrefs(readStored());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    applyPrefs(document.documentElement, prefs);
    store(prefs);
  }, [prefs, loaded]);

  // "עצירת אנימציות" (או הגדרת המערכת): עוצרים וידאו בטעינה, וגם וידאו שמתווסף אחר כך
  useEffect(() => {
    if (!loaded) return;
    if (!prefs.noMotion && !shouldReduceMotion()) return;
    pauseVideos(document);
    const observer = new MutationObserver((records) => {
      for (const r of records)
        for (const node of r.addedNodes) {
          if (node instanceof HTMLVideoElement) pauseVideos({ querySelectorAll: () => [node] });
          else if (node instanceof Element) pauseVideos(node);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [prefs.noMotion, loaded]);

  // בפתיחה: הפוקוס עובר לפקד הראשון בתפריט
  useEffect(() => {
    if (open) firstControlRef.current?.focus();
  }, [open]);

  // Esc סוגר, ולחיצה מחוץ לתפריט סוגרת (בלי להזיז את הפוקוס)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const inside = rootRef.current?.contains(document.activeElement);
      setOpen(false);
      if (inside) buttonRef.current?.focus();
    }
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // הפוקוס יצא מהתפריט (Tab הלאה) ← סוגרים. הפוקוס נשאר איפה שהגולש שם אותו
  function onBlur(e: FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && !e.currentTarget.contains(next)) setOpen(false);
  }

  function update(patch: Partial<A11yPrefs>) {
    setPrefs((p) => ({ ...p, ...patch }));
    setStatus("");
  }

  function reset() {
    setPrefs({ ...DEFAULT_PREFS });
    setStatus("ההגדרות אופסו");
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  const btn =
    "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 text-start text-base font-medium transition-colors";
  const off = "border-slate-300 bg-white text-slate-900 hover:border-slate-500";
  const on = "border-[#1E40AF] bg-[#1E40AF] text-white";

  return (
    <div ref={rootRef} onBlur={onBlur} dir="rtl">
      <button
        ref={buttonRef}
        type="button"
        aria-label="תפריט נגישות"
        aria-expanded={open}
        aria-controls="a11y-panel"
        onClick={() => setOpen((o) => !o)}
        className="fixed z-50 flex items-center justify-center rounded-full border-2 border-white text-white shadow-lg"
        style={{
          left: EDGE,
          bottom: BOTTOM,
          width: 48,
          height: 48,
          backgroundColor: BLUE,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={28}
          height={28}
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="4.2" r="2.2" />
          <path d="M19.6 8.1a1 1 0 0 1-.8 1.2l-4.3.8v3.2l1.9 6.4a1 1 0 1 1-1.9.6l-1.8-5.6h-1.4l-1.8 5.6a1 1 0 1 1-1.9-.6l1.9-6.4v-3.2l-4.3-.8a1 1 0 1 1 .4-2c2.1.4 4.2.6 6.4.6s4.3-.2 6.4-.6a1 1 0 0 1 1.2.8Z" />
        </svg>
      </button>

      <div
        id="a11y-panel"
        role="dialog"
        aria-labelledby="a11y-panel-title"
        hidden={!open}
        className="fixed z-50 overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 text-slate-900 shadow-2xl"
        style={{
          left: EDGE,
          bottom: PANEL_BOTTOM,
          width: "min(20rem, calc(100vw - 32px))",
          maxHeight: `calc(100dvh - ${PANEL_BOTTOM} - 16px)`,
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="a11y-panel-title" className="text-lg font-bold">
            התאמות נגישות
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="סגירת תפריט הנגישות"
            className="flex size-11 items-center justify-center rounded-lg text-2xl leading-none text-slate-700 hover:bg-slate-100"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div role="group" aria-labelledby="a11y-text-size">
          <p id="a11y-text-size" className="mb-2 text-sm font-semibold">
            גודל טקסט
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([0, 1, 2] as const).map((level) => {
              const pressed = prefs.textSize === level;
              return (
                <button
                  key={level}
                  ref={level === 0 ? firstControlRef : undefined}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => update({ textSize: level })}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-lg border-2 px-1 py-1 text-sm font-medium ${pressed ? on : off}`}
                >
                  <span>{TEXT_LABELS[level]}</span>
                  <span className="text-sm">
                    {TEXT_SIZES[level]}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {TOGGLES.map(({ key, label }) => {
            const pressed = prefs[key];
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => update({ [key]: !pressed })}
                  className={`${btn} ${pressed ? on : off}`}
                >
                  <span>{label}</span>
                  <span aria-hidden="true" className="text-sm font-semibold">
                    {pressed ? "✓ פועל" : "כבוי"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={reset} className={`${btn} ${off}`}>
            איפוס כל ההגדרות
          </button>
          <Link
            href="/accessibility"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center font-medium text-[#1E40AF] underline underline-offset-4"
          >
            הצהרת הנגישות
          </Link>
        </div>

        <p aria-live="polite" className="sr-only">
          {status}
        </p>
      </div>
    </div>
  );
}
