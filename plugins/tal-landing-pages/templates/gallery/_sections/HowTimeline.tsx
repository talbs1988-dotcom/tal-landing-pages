/*
 * מתכון: איך זה עובד. מתי: אחרי הפתרון, כשצריך להראות שיש תהליך ברור ולא קפיצה לאוויר.
 * מה עושה אותו: קו אנכי שמתמלא בזהב בזמן הגלילה, ועליו שלבים ממוספרים שנכנסים אחד אחד.
 * כשהשלב מגיע לאמצע המסך העיגול שלו "נדלק". במחשב הכותרת והכפתור נשארים צמודים בצד,
 * והשלבים גוללים לידם, כך שהגולש לא מאבד את ההקשר.
 * איך מתאימים לסקשן אמיתי: t("how.title"), t("how.step1Title"), t("how.step1Text") וכו',
 * ועל כל אלמנט טקסט {...editProps("how.step1Title")}. המספר של השלב בא מהסדר, לא מהקופי.
 * הכפתור: CtaButton (לא DemoCta). פחות או יותר שלבים? מוסיפים או מורידים שורה במערך.
 */
"use client";

import { useInView } from "motion/react";
import { useRef } from "react";
import { Reveal, ScrollLine } from "@/components/motion";
import { DemoCta } from "../_kit/DemoCta";

export type HowTimelineText = {
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  step1Tag: string;
  step1Title: string;
  step1Text: string;
  step2Tag: string;
  step2Title: string;
  step2Text: string;
  step3Tag: string;
  step3Title: string;
  step3Text: string;
  step4Tag: string;
  step4Title: string;
  step4Text: string;
};

export const demo: HowTimelineText = {
  kicker: "איך זה עובד",
  title: "ארבעה שלבים, והעסק לא עוצר באמצע",
  subtitle:
    "כל שלב נגמר במשהו שאפשר לראות ולגעת בו. לא עוברים לשלב הבא לפני שהקודם עובד.",
  cta: "לקביעת שיחת היכרות",
  step1Tag: "שבוע 1",
  step1Title: "שיחת מיפוי",
  step1Text:
    "שעה וחצי בזום. עוברים על מה שקורה בעסק ומסמנים את שלושת המקומות ששורפים לך הכי הרבה זמן.",
  step2Tag: "שבועות 2 עד 4",
  step2Title: "כותבים את התהליכים",
  step2Text: "כל תהליך עובר לדף אחד ברור: מה עושים, מי עושה, ומתי זה נגמר.",
  step3Tag: "חודש 2",
  step3Title: "מחברים אוטומציות",
  step3Text: "תזכורות, טפסים וחשבוניות יוצאים לבד. אתה רק מאשר.",
  step4Tag: "חודש 3",
  step4Title: "מעבירים לעובד",
  step4Text:
    "אדם אחד מקבל את התהליכים ועובד לפיהם. אתה בודק פעם בשבוע, לא כל שעה.",
};

const ID = "gallery-how-title";

function Step({
  n,
  tag,
  title,
  body,
}: {
  n: number;
  tag: string;
  title: string;
  body: string;
}) {
  const ref = useRef<HTMLLIElement>(null);
  // העיגול נדלק כשהשלב עובר את אמצע המסך, ונשאר דלוק
  const lit = useInView(ref, { once: true, margin: "0px 0px -45% 0px" });
  return (
    <li ref={ref} className="relative pb-5 ps-14 last:pb-0 md:pb-7 md:ps-24">
      <span
        aria-hidden="true"
        className={`absolute start-0 top-4 grid size-10 place-items-center rounded-full border-2 text-base font-extrabold transition-[background-color,border-color,color,box-shadow] duration-700 md:size-14 md:text-xl ${
          lit
            ? "border-accent bg-accent text-secondary shadow-[0_0_0_8px_color-mix(in_oklab,var(--brand-accent)_18%,transparent)]"
            : "border-foreground/15 bg-background text-foreground/80"
        }`}
      >
        {String(n).padStart(2, "0")}
      </span>
      <Reveal
        variant="slide-start"
        amount={0.4}
        className={`rounded-2xl border p-5 transition-[border-color,box-shadow,background-color] duration-700 sm:p-7 ${
          lit
            ? "border-accent/40 bg-white/70 shadow-[0_20px_50px_-30px_color-mix(in_oklab,var(--brand-primary)_60%,transparent)]"
            : "border-foreground/10 bg-white/40"
        }`}
      >
        <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {tag}
        </p>
        <h3 className="mt-3 text-xl font-bold leading-snug text-foreground sm:text-2xl">
          {title}
        </h3>
        <p className="mt-2 max-w-[34rem] text-lg leading-[1.65] text-foreground/75">
          {body}
        </p>
      </Reveal>
    </li>
  );
}

export default function HowTimeline({ text }: { text: HowTimelineText }) {
  const steps = [
    { tag: text.step1Tag, title: text.step1Title, body: text.step1Text },
    { tag: text.step2Tag, title: text.step2Title, body: text.step2Text },
    { tag: text.step3Tag, title: text.step3Title, body: text.step3Text },
    { tag: text.step4Tag, title: text.step4Title, body: text.step4Text },
  ];

  return (
    <section
      aria-labelledby={ID}
      className="relative isolate py-20 sm:py-28 lg:py-32"
      style={{
        background:
          "color-mix(in oklab, var(--brand-background) 94%, var(--brand-primary))",
      }}
    >
      <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        {/* הכותרת: במחשב נשארת צמודה בזמן שהשלבים גוללים */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal variant="fade">
            <p className="flex items-center gap-3 text-base font-semibold text-primary">
              <span aria-hidden="true" className="h-px w-10 bg-primary/50" />
              <span>{text.kicker}</span>
            </p>
          </Reveal>
          <Reveal variant="blur" delay={0.08}>
            <h2
              id={ID}
              className="mt-4 text-balance text-[2rem] font-extrabold leading-[1.12] text-foreground sm:text-4xl lg:text-[2.75rem]"
            >
              {text.title}
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-md text-lg leading-[1.65] text-foreground/75">
              {text.subtitle}
            </p>
          </Reveal>
          <Reveal delay={0.24} className="mt-8 hidden lg:block">
            <DemoCta>{text.cta}</DemoCta>
          </Reveal>
        </div>

        <ScrollLine>
          <ol>
            {steps.map((s, i) => (
              <Step key={i} n={i + 1} {...s} />
            ))}
          </ol>
        </ScrollLine>

        {/* בטלפון הכפתור בא אחרי השלבים, כשכבר ברור מה קורה */}
        <Reveal className="lg:hidden">
          <DemoCta className="w-full sm:w-auto">{text.cta}</DemoCta>
        </Reveal>
      </div>
    </section>
  );
}
