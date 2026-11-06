/**
 * רקע חי בצבעי המותג: שלושה כתמי אור שזזים לאט, רשת דקה ומסגרת כהה בשוליים.
 * בונים אותו מצבעי המותג (משתני --brand-*), אז הוא מתאים לכל מיתוג בלי לגעת בו.
 * tone="dark" לסקשן כהה (רקע secondary), tone="light" לסקשן בהיר.
 * CSS בלבד: נעצר לבד עם "עצירת אנימציות".
 */
export function Aurora({ tone = "dark", grid = true }: { tone?: "dark" | "light"; grid?: boolean }) {
  const dark = tone === "dark";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 ${dark ? "bg-secondary" : "bg-background"}`} />
      <div
        className="aurora-orb absolute -end-[10%] -top-[15%] size-[60vw] max-w-[900px] max-h-[900px] rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in oklab, var(--brand-accent) ${dark ? 45 : 30}%, transparent) 0%, transparent 70%)` }}
      />
      <div
        className="aurora-orb-2 absolute -bottom-[25%] -start-[15%] size-[65vw] max-w-[1000px] max-h-[1000px] rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in oklab, var(--brand-primary) ${dark ? 40 : 22}%, transparent) 0%, transparent 70%)` }}
      />
      <div
        className="aurora-orb absolute start-[30%] top-[35%] size-[38vw] max-w-[600px] max-h-[600px] rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in oklab, var(--brand-accent) ${dark ? 30 : 18}%, transparent) 0%, transparent 70%)`, animationDelay: "-6s" }}
      />
      {/* שקיפות בסטייל ולא ב-class: הבדיקה של טקסט שקוף סורקת opacity-NN, וזה קישוט ולא טקסט */}
      {grid && <div className="aurora-grid absolute inset-0" style={{ opacity: dark ? 1 : 0.6 }} />}
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? "radial-gradient(ellipse at 50% 0%, transparent 0%, color-mix(in oklab, var(--brand-secondary) 55%, transparent) 70%, var(--brand-secondary) 100%)"
            : "radial-gradient(ellipse at 50% 0%, transparent 0%, color-mix(in oklab, var(--brand-background) 60%, transparent) 75%, var(--brand-background) 100%)",
        }}
      />
    </div>
  );
}
