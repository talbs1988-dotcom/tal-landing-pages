/**
 * "דילוג לתוכן הראשי": הקישור הראשון בדף. מוסתר עד שמגיעים אליו במקלדת,
 * ואז מופיע בפינה ומקפיץ ישר ל-<main id="main">. אסור להוריד.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-5 focus:py-3 focus:font-semibold focus:text-white focus:shadow-lg"
    >
      דילוג לתוכן הראשי
    </a>
  );
}
