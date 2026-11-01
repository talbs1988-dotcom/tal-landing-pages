"use client";

import type { MouseEvent } from "react";

/**
 * "דילוג לתוכן הראשי": הקישור הראשון בדף. מוסתר עד שמגיעים אליו במקלדת,
 * ואז מופיע בפינה ומקפיץ ישר ל-<main id="main">. אסור להוריד.
 *
 * עם JS: מעביר את הפוקוס ל-main בלי לשנות את הכתובת (#main), כי שינוי כזה
 * נספר אצל הפיקסל של מטא כצפייה נוספת בדף. בלי JS: קישור עוגן רגיל.
 */
export function SkipLink() {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById("main");
    if (!main) return;
    e.preventDefault();
    if (!main.hasAttribute("tabindex")) {
      main.setAttribute("tabindex", "-1");
      main.classList.add("outline-none");
    }
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start" });
  }

  return (
    <a
      href="#main"
      onClick={onClick}
      className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-5 focus:py-3 focus:font-semibold focus:text-white focus:shadow-lg"
    >
      דילוג לתוכן הראשי
    </a>
  );
}
