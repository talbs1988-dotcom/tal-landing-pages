/*
 * מתכון: שאלות ותשובות. מתי: לפני הטופס, כדי לענות על ההתנגדויות האחרונות מהאפיון (מחיר, זמן, "זה מתאים לי?").
 * מה עובד: הכותרת בצד ונשארת במקום בגלילה במחשב, והשאלות בצד השני. רק שאלה אחת פתוחה בכל רגע,
 * הגובה נפתח בתנועה רכה והפלוס הופך למינוס. כפתור עם aria-expanded ואזור תשובה עם aria-labelledby.
 * בדף אמיתי: t("faq.eyebrow"), t("faq.title"), t("faq.sub"), t("faq.note"), ו-t("faq.q1") עם t("faq.a1") עד q6/a6,
 * כל אחד עם {...editProps(key)} על האלמנט שמכיל רק אותו. השאלות והתשובות מהאפיון, במילים של הלקוחות.
 * בלי כפתור כאן: ה-CTA בא בסקשן הבא (הטופס).
 */
"use client";

import { useId, useState } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

export type FaqAccordionText = {
  eyebrow: string;
  title: string;
  sub: string;
  note: string;
  questions: string[];
  answers: string[];
};

export const demo: FaqAccordionText = {
  eyebrow: "שאלות שחוזרות",
  title: "לפני שמתחילים, בטח עולות לך כמה שאלות",
  sub: "ריכזנו כאן את מה ששואלים אותנו הכי הרבה בשיחה הראשונה.",
  note: "לא מצאת את השאלה שלך? בשיחת ההיכרות אפשר לשאול הכל, גם מה שנראה לך קטן.",
  questions: [
    "אני עוסק פטור. זה מתאים גם לי?",
    "מה קורה עם החומר מהשנים הקודמות?",
    "צריך להגיע למשרד?",
    "איך שולחים קבלות וחשבוניות?",
    "אפשר לעבור אליכם באמצע שנה?",
    "ומה אם ארצה להפסיק?",
  ],
  answers: [
    "כן. גם לעוסק פטור יש דוח שנתי, מקדמות לביטוח לאומי ותקרת הכנסה שצריך לעקוב אחריה. אנחנו עוקבים בשבילך ומתריעים לפני שמתקרבים אליה.",
    "בחודש הראשון עוברים על מה שיש, משלימים את מה שחסר ומגישים דוחות פתוחים אם צריך. אם יש עבודה נוספת, אומרים לך מראש כמה היא עולה.",
    "לא. הכל עובד מרחוק: שולחים קבלות בצילום, מקבלים דוחות במייל ונפגשים בזום כשצריך. מי שרוצה, מוזמן גם לקפה במשרד.",
    "מצלמים ושולחים בוואטסאפ, או מעבירים במייל. כל קבלה נקלטת במערכת באותו יום, ואתה מקבל אישור שהיא נכנסה.",
    "כן, ורוב הלקוחות עוברים באמצע שנה. אנחנו מבקשים את התיק מרואה החשבון הקודם ודואגים להעברה מההתחלה ועד הסוף.",
    "מודיעים חודש מראש, וזהו. אין קנס יציאה, ואת כל החומר שלך מקבלים מסודר בתיקייה אחת.",
  ],
};

export default function FaqAccordion({ text }: { text: FaqAccordionText }) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();

  return (
    <section
      aria-labelledby="gallery-faqaccordion-title"
      className="relative overflow-x-clip bg-background px-5 py-24 md:px-8 md:py-32"
    >

      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
        {/* הכותרת. במחשב נשארת במקום בזמן שגוללים בשאלות */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Reveal>
            <p className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-[15px] font-semibold text-primary shadow-sm ring-1 ring-black/5">
              {text.eyebrow}
            </p>
            <h2
              id="gallery-faqaccordion-title"
              className="mt-5 text-[clamp(2.1rem,4.6vw,3.4rem)] font-black leading-[1.1] text-balance text-foreground"
            >
              {text.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-foreground/80 md:text-xl">
              {text.sub}
            </p>
          </Reveal>
          <Reveal
            delay={0.15}
            className="mt-8 flex items-start gap-4 rounded-2xl border border-foreground/10 bg-white/60 p-5"
          >
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-accent"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5z" />
                <path d="M9 10.5h6M9 13.5h3.5" />
              </svg>
            </span>
            <p className="text-[17px] leading-relaxed text-foreground/80">
              {text.note}
            </p>
          </Reveal>
        </div>

        {/* השאלות */}
        <Stagger gap={0.06} amount={0.1} className="space-y-3 md:space-y-4">
          {text.questions.map((q, i) => {
            const isOpen = open === i;
            const btnId = `${uid}-q${i}`;
            const panelId = `${uid}-a${i}`;
            return (
              <StaggerItem
                key={q}
                className={`rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300 ${
                  isOpen
                    ? "border-accent/60 bg-white shadow-[0_24px_50px_-30px_color-mix(in_oklab,var(--brand-secondary)_55%,transparent)]"
                    : "border-foreground/10 bg-white/55 hover:border-foreground/20 hover:bg-white"
                }`}
              >
                <h3>
                  <button
                    type="button"
                    id={btnId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-5 text-start md:gap-4 md:px-7 md:py-6"
                  >
                    <span
                      aria-hidden="true"
                      className="w-6 shrink-0 text-sm font-bold tabular-nums text-primary"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-[18px] font-bold leading-snug text-foreground md:text-xl">
                      {q}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`relative grid size-9 shrink-0 md:size-10 place-items-center rounded-full transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isOpen
                          ? "rotate-180 bg-accent text-secondary"
                          : "bg-foreground/[0.06] text-foreground"
                      }`}
                    >
                      <span className="absolute h-0.5 w-4 rounded-full bg-current" />
                      <span
                        className={`absolute h-4 w-0.5 rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  inert={!isOpen}
                  style={{ opacity: isOpen ? 1 : 0 }}
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-6 pe-4 ps-4 text-[17px] leading-[1.7] text-foreground/80 md:pe-20 md:ps-[4.25rem] md:text-lg">
                      {text.answers[i]}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
