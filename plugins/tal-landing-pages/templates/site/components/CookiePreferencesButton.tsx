"use client";

import { CONSENT_REOPEN_EVENT } from "@/lib/consent";

/** פותח מחדש את באנר העוגיות, כדי לשנות בחירה בכל רגע */
export function CookiePreferencesButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))}
    >
      העדפות עוגיות
    </button>
  );
}
