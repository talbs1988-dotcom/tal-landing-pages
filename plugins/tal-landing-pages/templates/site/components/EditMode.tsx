"use client";

import { useEffect, useRef, useState } from "react";
import { TODO } from "@/lib/todo";

/*
 * מצב עריכה: בעל העסק מתקן טקסט ישר על הדף, והשינוי נשמר ב-content/copy.json.
 * רק ב-`npm run dev`. app/layout.tsx טוען את הרכיב רק כש-NODE_ENV הוא development,
 * כך שבבנייה לייצור הוא לא נכנס לחבילה בכלל.
 *
 * - מתג בפינה הימנית העליונה (בתחתית יושבים באנר העוגיות וכפתור הנגישות).
 * - כשהמצב דלוק, כל אלמנט עם data-edit נעשה ניתן לעריכה, עם מסגרת עדינה.
 * - שמירה ביציאה מהשדה או ב-Enter. Esc מבטל ומחזיר את הטקסט הקודם.
 * - טקסט בלבד: plaintext-only, ואם הדפדפן לא תומך, הדבקה כטקסט ושמירה של textContent.
 * - כשהמצב כבוי אין שום מאזין למקלדת. רק הכפתור עצמו.
 */

const STORAGE_KEY = "edit-mode-v1";
const ENDPOINT = "/api/dev-edit";

type Status = { kind: "saving" | "saved" | "error"; text: string } | null;

function editableMode(): "plaintext-only" | "true" {
  try {
    const probe = document.createElement("div");
    probe.contentEditable = "plaintext-only";
    return probe.contentEditable === "plaintext-only"
      ? "plaintext-only"
      : "true";
  } catch {
    // דפדפן שלא מכיר את הערך זורק שגיאה
    return "true";
  }
}

function editableFrom(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>("[data-edit]")
    : null;
}

/** מציב טקסט רק אם הוא שונה, כדי לא להחליף את הצומת ש-React מנהל בלי צורך */
function setText(el: HTMLElement, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

const STYLE = `
html[data-edit-mode] [data-edit] {
  outline: 1.5px dashed color-mix(in srgb, var(--brand-primary, #0f766e) 60%, transparent);
  outline-offset: 4px;
  border-radius: 4px;
  cursor: text;
}
html[data-edit-mode] [data-edit]:hover {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 7%, transparent);
}
html[data-edit-mode] [data-edit]:focus {
  outline: 2px solid var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 7%, transparent);
}
html[data-edit-mode] [data-edit][data-edit-error] {
  outline-color: #b91c1c;
}
`;

export function EditMode() {
  const [on, setOn] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  // המצב נשמר ללשונית (sessionStorage), כדי שרענון לא יכבה אותו
  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") setOn(true);
    } catch {
      // אין גישה לאחסון: מתחילים כבוי
    }
  }, []);

  useEffect(() => {
    try {
      if (on) sessionStorage.setItem(STORAGE_KEY, "1");
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // לא קריטי
    }
    if (!on) return;

    const root = document.documentElement;
    root.dataset.editMode = "on";
    const mode = editableMode();
    const originals = new WeakMap<HTMLElement, string>();
    const cancelled = new WeakSet<HTMLElement>();

    const show = (s: Status, hideAfterMs?: number) => {
      window.clearTimeout(hideTimer.current);
      setStatus(s);
      if (hideAfterMs)
        hideTimer.current = window.setTimeout(
          () => setStatus(null),
          hideAfterMs,
        );
    };

    const enable = (el: HTMLElement) => {
      if (el.contentEditable === mode) return;
      el.contentEditable = mode;
      el.spellcheck = true;
    };
    const enableAll = () =>
      document.querySelectorAll<HTMLElement>("[data-edit]").forEach(enable);
    enableAll();
    // אלמנטים שנוספים או מתרנדרים מחדש (למשל אחרי שמירה) מקבלים עריכה גם הם
    const observer = new MutationObserver(enableAll);
    observer.observe(document.body, { childList: true, subtree: true });

    async function save(el: HTMLElement) {
      const key = el.dataset.edit;
      const before = originals.get(el);
      if (!key || before === undefined) return;
      const value = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (value === before.replace(/\s+/g, " ").trim()) {
        // בלי שינוי. אם נכנס HTML (במצב fallback), מחזירים לטקסט נקי
        setText(el, before);
        return;
      }
      show({ kind: "saving", text: "שומר…" });
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        let json: { ok?: boolean; value?: unknown; error?: unknown } = {};
        try {
          json = await res.json();
        } catch {
          // לא JSON
        }
        if (!res.ok || !json.ok || typeof json.value !== "string") {
          el.dataset.editError = "1";
          const reason =
            typeof json.error === "string" ? json.error : "נא לנסות שוב.";
          show({ kind: "error", text: `לא נשמר. ${reason}` });
          return;
        }
        delete el.dataset.editError;
        // הערך הנקי מהשרת, בכל מקום בדף שמשתמש באותו מפתח
        document
          .querySelectorAll<HTMLElement>(`[data-edit="${CSS.escape(key)}"]`)
          .forEach((node) => {
            setText(node, json.value as string);
            originals.set(node, json.value as string);
          });
        show({ kind: "saved", text: "נשמר ✓" }, 2500);
      } catch {
        el.dataset.editError = "1";
        show({
          kind: "error",
          text: "לא נשמר. אין חיבור לשרת הפיתוח (npm run dev).",
        });
      }
    }

    function onFocusIn(e: FocusEvent) {
      const el = editableFrom(e.target);
      if (!el) return;
      const text = el.textContent ?? "";
      originals.set(el, text);
      // על סימון החוסר (TODO) מסמנים הכול, כדי שההקלדה תחליף אותו ולא תתווסף אליו
      if (text.trim() === TODO) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }

    function onFocusOut(e: FocusEvent) {
      const el = editableFrom(e.target);
      if (!el) return;
      if (cancelled.has(el)) {
        cancelled.delete(el);
        return;
      }
      void save(el);
    }

    function onKeyDown(e: KeyboardEvent) {
      const el = editableFrom(e.target);
      if (!el || e.isComposing) return;
      if (e.key === "Enter") {
        // שורה אחת: Enter שומר ולא יורד שורה
        e.preventDefault();
        el.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        const before = originals.get(el);
        if (before !== undefined) setText(el, before);
        delete el.dataset.editError;
        cancelled.add(el);
        el.blur();
        show({ kind: "saved", text: "בוטל" }, 1500);
      }
    }

    // לחיצה על טקסט בתוך כפתור או קישור עורכת אותו, ולא מפעילה את הכפתור
    function onClick(e: MouseEvent) {
      if (editableFrom(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // הדבקה תמיד כטקסט (חשוב כשהדפדפן לא תומך ב-plaintext-only)
    function onPaste(e: ClipboardEvent) {
      if (!editableFrom(e.target)) return;
      e.preventDefault();
      const text = (e.clipboardData?.getData("text/plain") ?? "").replace(
        /\s+/g,
        " ",
      );
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // גרירת תוכן (תמונות, HTML) לתוך טקסט לא נתמכת
    function onDrop(e: DragEvent) {
      if (editableFrom(e.target)) e.preventDefault();
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("click", onClick, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("drop", onDrop, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("click", onClick, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("drop", onDrop, true);
      document.querySelectorAll<HTMLElement>("[data-edit]").forEach((el) => {
        el.removeAttribute("contenteditable");
        el.removeAttribute("spellcheck");
        delete el.dataset.editError;
      });
      delete root.dataset.editMode;
    };
  }, [on]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  function toggle() {
    // אם מישהו באמצע עריכה, היציאה מהשדה שומרת לפני שהמצב נכבה
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest("[data-edit]"))
      active.blur();
    setOn((v) => !v);
    if (on) setStatus(null);
  }

  return (
    <div
      dir="rtl"
      className="fixed right-3 top-3 z-[60] flex flex-col items-start gap-2"
    >
      {on && <style>{STYLE}</style>}
      <button
        type="button"
        aria-pressed={on}
        onClick={toggle}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold shadow-lg ${
          on
            ? "border-primary bg-primary text-white"
            : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
        }`}
      >
        <span aria-hidden="true">✎</span>
        מצב עריכה
      </button>
      {on && (
        <p className="max-w-60 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg">
          לוחצים על טקסט ומקלידים. Enter או יציאה מהשדה שומרים, Esc מבטל.
        </p>
      )}
      <p
        role="status"
        aria-live="polite"
        className={
          status
            ? `rounded-lg px-3 py-2 text-sm font-medium shadow-lg ${
                status.kind === "error"
                  ? "bg-red-700 text-white"
                  : "bg-white text-slate-900"
              }`
            : "sr-only"
        }
      >
        {status?.text}
      </p>
    </div>
  );
}
