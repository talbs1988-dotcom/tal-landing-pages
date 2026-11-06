/*
 * מתכון: מי אני. מתי: אחרי הכאב והמפנה, כשהגולש שואל "ולמה דווקא את?".
 * מה עושה אותו: פורטרט גדול עם מסגרת זהב מוסטת וטבעת אור שמסתובבת לאט מאחוריו,
 * תגית קטנה שצפה על התמונה, שם גדול ושורת תפקיד, שתי פסקאות קצרות ושלושה מספרים שרצים.
 * איך מתאימים לסקשן אמיתי: כל שדה כאן הוא מפתח ב-copy.json, למשל t("about.name"),
 * ועל כל אלמנט טקסט {...editProps("about.name")}. המספרים: <CountUp text={t("about.stat1Value")} {...editProps("about.stat1Value")} /> (הטקסט כמו שהוא, גם "1,200").
 * את DemoImage מחליפים ב-next/image עם alt={alt("about")}, width/height מסקריפט התמונות.
 * אין כאן כפתור. אם הקופי מבקש כפתור, CtaButton מתחת למספרים (לא DemoCta).
 */
"use client";

import { motion, useReducedMotionConfig } from "motion/react";
import {
  CountUp,
  EASE,
  Parallax,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/motion";
import { DemoImage } from "../_kit/DemoImage";

export type AboutAuthorityText = {
  kicker: string;
  name: string;
  role: string;
  p1: string;
  p2: string;
  badge: string;
  imageLabel: string;
  stat1Value: string;
  stat1Suffix: string;
  stat1Label: string;
  stat2Value: string;
  stat2Suffix: string;
  stat2Label: string;
  stat3Value: string;
  stat3Suffix: string;
  stat3Label: string;
};

export const demo: AboutAuthorityText = {
  kicker: "נעים להכיר",
  name: "מיכל אברהם",
  role: "יועצת עסקית לעסקי שירותים קטנים",
  p1: "עשר שנים ניהלתי תפעול ברשת מרפאות. ראיתי מקרוב מה קורה כשהכל עובר דרך אדם אחד: הוא לא יוצא לחופש, והעסק לא זז.",
  p2: "היום אני יושבת עם בעלי עסקים ובונה איתם את מה שחסר. תהליכים כתובים, יומן שמתמלא בלי לרדוף, ועובד ראשון שאפשר לסמוך עליו.",
  badge: "מלווה עסקים מאז 2016",
  imageLabel: "פורטרט של מיכל במשרד",
  stat1Value: "240",
  stat1Suffix: "עסקים",
  stat1Label: "ליוויתי עד היום",
  stat2Value: "10",
  stat2Suffix: "שנים",
  stat2Label: "בניהול תפעול לפני הייעוץ",
  stat3Value: "6",
  stat3Suffix: "שבועות",
  stat3Label: "עד שהתהליך הראשון רץ בלעדיך",
};

const ID = "gallery-about-title";

export default function AboutAuthority({ text }: { text: AboutAuthorityText }) {
  const reduce = useReducedMotionConfig();
  const stats = [
    { v: text.stat1Value, s: text.stat1Suffix, l: text.stat1Label },
    { v: text.stat2Value, s: text.stat2Suffix, l: text.stat2Label },
    { v: text.stat3Value, s: text.stat3Suffix, l: text.stat3Label },
  ];

  return (
    <section
      aria-labelledby={ID}
      className="relative isolate overflow-hidden bg-background py-20 sm:py-28 lg:py-32"
    >
      {/* אור חם רך מאחורי הפורטרט, ורשת דקה שנמוגה לשוליים */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          className="absolute -top-40 end-[-10%] size-[42rem] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--brand-accent) 22%, transparent), transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(color-mix(in oklab, var(--brand-text) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--brand-text) 6%, transparent) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 60% 55% at 70% 40%, #000 10%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 55% at 70% 40%, #000 10%, transparent 75%)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        {/* הפורטרט: בטלפון מעל הטקסט, במחשב בצד שבו מתחילים לקרוא */}
        <Reveal
          variant="scale"
          duration={0.9}
          className="relative mx-auto w-full max-w-[19rem] sm:max-w-sm lg:max-w-none"
        >
          <Parallax strength={24}>
            <div className="relative">
              {/* טבעת אור שמסתובבת לאט. נעצרת עם "פחות תנועה" */}
              <motion.div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[2.75rem] opacity-80 blur-md sm:-inset-8"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--brand-accent) 70%, transparent) 70deg, transparent 150deg, transparent 200deg, color-mix(in oklab, var(--brand-primary) 45%, transparent) 260deg, transparent 330deg)",
                }}
                animate={reduce ? undefined : { rotate: 360 }}
                transition={
                  reduce
                    ? undefined
                    : { duration: 26, repeat: Infinity, ease: "linear" }
                }
              />
              {/* מסגרת זהב מוסטת לצד ולמטה */}
              <div
                aria-hidden="true"
                className="absolute -bottom-4 -end-4 top-4 start-4 rounded-[2rem] border-2 border-accent/70 sm:-bottom-5 sm:-end-5 sm:top-5 sm:start-5"
              />
              <div className="relative overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-30px_color-mix(in_oklab,var(--brand-secondary)_55%,transparent)] ring-1 ring-black/5">
                <DemoImage label={text.imageLabel} ratio="4 / 5" tone="light" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
                />
              </div>

              {/* תגית שצפה על פינת התמונה */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
                className="absolute -bottom-5 start-4 flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3 shadow-xl sm:-start-6 sm:bottom-10"
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-accent)_25%,transparent)]"
                />
                <span className="text-sm font-semibold text-background sm:text-base">
                  {text.badge}
                </span>
              </motion.div>
            </div>
          </Parallax>
        </Reveal>

        {/* הטקסט */}
        <div className="max-w-[36rem]">
          <Reveal variant="fade">
            <p className="flex items-center gap-3 text-base font-semibold text-primary">
              <span aria-hidden="true" className="h-px w-10 bg-primary/50" />
              <span>{text.kicker}</span>
            </p>
          </Reveal>
          <Reveal variant="blur" delay={0.08}>
            <h2
              id={ID}
              className="mt-4 text-[2.25rem] font-extrabold leading-[1.05] text-foreground sm:text-5xl lg:text-[3.5rem]"
            >
              {text.name}
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-3 text-xl font-medium leading-snug text-primary sm:text-2xl">
              {text.role}
            </p>
          </Reveal>

          <Reveal
            delay={0.24}
            className="mt-8 space-y-5 border-s-2 border-accent/60 ps-5 sm:ps-6"
          >
            <p className="text-lg leading-[1.7] text-foreground/85 sm:text-[1.1875rem]">
              {text.p1}
            </p>
            <p className="text-lg leading-[1.7] text-foreground/85 sm:text-[1.1875rem]">
              {text.p2}
            </p>
          </Reveal>

          {/* שלושה מספרים שרצים */}
          <Stagger
            gap={0.12}
            delay={0.1}
            className="mt-12 grid grid-cols-3 gap-2.5 sm:gap-4"
          >
            {stats.map((st, i) => (
              <StaggerItem
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-foreground/10 bg-white/60 p-3.5 backdrop-blur-sm transition-colors duration-300 hover:border-accent/60 sm:p-5"
              >
                <span
                  aria-hidden="true"
                  className="absolute start-0 top-0 h-[3px] w-1/3 bg-accent transition-[width] duration-500 group-hover:w-full"
                />
                <p className="flex flex-col gap-1 text-primary sm:flex-row sm:items-baseline sm:gap-1.5">
                  <CountUp
                    text={st.v}
                    className="text-[1.75rem] font-extrabold leading-none sm:text-[2.75rem]"
                  />
                  <span className="text-base font-bold sm:text-lg">{st.s}</span>
                </p>
                <p className="mt-2 text-sm leading-snug text-foreground/75 sm:text-[0.9375rem]">
                  {st.l}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
