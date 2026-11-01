/**
 * טוען את מצב העריכה רק ב-`npm run dev`.
 *
 * למה לא import רגיל ב-layout: בבנייה לייצור, import סטטי של רכיב קליינט מכניס אותו
 * לחבילה של הדפדפן גם כשהוא לא מוצג (נבדק ב-grep על .next/static).
 * import דינמי בתוך התנאי נמחק בבנייה, כי NODE_ENV מוחלף בערך קבוע והענף מת.
 */
export async function DevEditMode() {
  if (process.env.NODE_ENV === "development") {
    const { EditMode } = await import("@/components/EditMode");
    return <EditMode />;
  }
  return null;
}
