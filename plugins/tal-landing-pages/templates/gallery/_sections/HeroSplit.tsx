"use client";
/*
 * פתיחה בהירה מפוצלת: טקסט בצד ימין (שם מתחילים לקרוא) ותמונה בצד שמאל, עם שני כרטיסי הוכחה צפים.
 * מתאים כשיש צילום טוב של בעל העסק או של העבודה, ומספרים אמיתיים להציג מתחת לכפתור.
 * מה עושה אותו: סימון זהב שנמרח מתחת לביטוי המודגש, כרטיסים שצפים וזזים בקצב אחר מהתמונה בגלילה,
 * ושורת אמון קצרה. בטלפון הכול נערם, והכותרת, המשפט והכפתור נכנסים במסך הראשון.
 * ביצועים: הכותרת והתמונה גלויות מהציור הראשון (אין להן opacity 0), כי הן ה-LCP. רק השאר נכנס בתנועה.
 * בדף אמיתי: t("hero.eyebrow"), t("hero.titleStart"), t("hero.titleHighlight"), t("hero.subtitle"), t("hero.ctaNote"),
 * t("hero.stat1Value") / t("hero.stat1Label") וכו', t("hero.chipValue"), t("hero.noticeTitle"); {...editProps(key)} על כל אחד.
 * התמונה: next/image עם priority ו-alt={alt("hero")}. הכפתור: CtaButton, לא DemoCta.
 */
import {
  type MotionValue,
  motion,
  useReducedMotionConfig,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef, type ReactNode } from "react";
import { Aurora, EASE } from "@/components/motion";
import { DemoImage } from "../_kit/DemoImage";
import { DemoCta } from "../_kit/DemoCta";

export type HeroSplitText = {
  eyebrow: string;
  titleStart: string;
  titleHighlight: string;
  subtitle: string;
  cta: string;
  ctaNote: string;
  statValues: string[];
  statLabels: string[];
  chipValue: string;
  chipLabel: string;
  noticeTitle: string;
  noticeSub: string;
  image: string;
};

export const demo: HeroSplitText = {
  eyebrow: "פיזיותרפיה לכאבי גב, בתל אביב",
  titleStart: "חוזרים להרים את הילדים",
  titleHighlight: "בלי לחשוב פעמיים",
  subtitle:
    "תוכנית של 6 שבועות לכאבי גב תחתון: אבחון מסודר במפגש הראשון, טיפול בקליניקה, ותרגילים קצרים לבית שנכנסים ביום עבודה רגיל.",
  cta: "קובעים אבחון ראשון",
  ctaNote: "חוזרים אליך עוד באותו יום",
  statValues: ["14", "1,200+", "45"],
  statLabels: [
    "שנים בקליניקה",
    "מטופלים עם כאבי גב",
    "דקות לכל טיפול",
  ],
  chipValue: "6 שבועות",
  chipLabel: "תוכנית טיפול מלאה",
  noticeTitle: "התרגיל של היום: 8 דקות",
  noticeSub: "נשלח לוואטסאפ · 07:30",
  image: "צילום: הפיזיותרפיסטית בזמן טיפול",
};

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: EASE },
});

/** כרטיס צף: נכנס אחרי התמונה, זז בגלילה בקצב משלו, ומרחף לאט */
function FloatChip({
  children,
  className,
  delay,
  drift,
  float,
}: {
  children: ReactNode;
  className: string;
  delay: number;
  drift: MotionValue<number>;
  float: number;
}) {
  const reduce = useReducedMotionConfig();
  return (
    <motion.div
      style={reduce ? undefined : { y: drift }}
      className={`absolute z-20 ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, delay, ease: EASE }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -float, 0] }}
          transition={{
            duration: 5 + float / 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay + 0.7,
          }}
          className="rounded-2xl border border-foreground/10 p-3.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)] backdrop-blur-md sm:p-4"
          style={{
            background:
              "color-mix(in oklab, var(--brand-background) 82%, white)",
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function HeroSplit({ text }: { text: HeroSplitText }) {
  const reduce = useReducedMotionConfig();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, 36]);
  const chipA = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const chipB = useTransform(scrollYProgress, [0, 1], [0, -90]);

  return (
    <section
      ref={ref}
      aria-labelledby="gallery-herosplit-title"
      className="relative isolate overflow-hidden bg-background pb-16 pt-10 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20"
    >
      <Aurora tone="light" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 xl:gap-24">
        {/* טקסט: ימין בדסקטופ, ראשון בטלפון */}
        <div className="text-start">
          <motion.p
            {...enter(0.05)}
            className="flex items-center gap-3 text-[0.9375rem] font-semibold text-primary sm:text-base"
          >
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            <span>{text.eyebrow}</span>
          </motion.p>

          {/* בלי כניסה: הכותרת גלויה מהציור הראשון. רק סימון הזהב נמרח */}
          <h1
            id="gallery-herosplit-title"
            className="mt-5 text-balance text-[clamp(2.35rem,5.4vw,4.6rem)] font-black leading-[1.06] text-foreground"
          >
            <span>{text.titleStart}</span>{" "}
            <motion.span
              className="mt-1 block w-fit max-w-full text-primary [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
              style={{
                backgroundImage:
                  "linear-gradient(color-mix(in oklab, var(--brand-accent) 42%, transparent), color-mix(in oklab, var(--brand-accent) 42%, transparent))",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "100% 88%",
              }}
              initial={{ backgroundSize: reduce ? "100% 0.3em" : "0% 0.3em" }}
              animate={{ backgroundSize: "100% 0.3em" }}
              transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
            >
              {text.titleHighlight}
            </motion.span>
          </h1>

          <motion.p
            {...enter(0.18)}
            className="mt-6 max-w-[34rem] text-pretty text-[1.0625rem] leading-relaxed text-foreground/80 sm:text-xl"
          >
            {text.subtitle}
          </motion.p>

          <motion.div
            {...enter(0.3)}
            className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5"
          >
            <DemoCta>
              <span>{text.cta}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5l-5 5 5 5" />
              </svg>
            </DemoCta>
            <p className="flex items-center gap-2 text-[0.9375rem] text-foreground/80">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-primary"
              />
              <span>{text.ctaNote}</span>
            </p>
          </motion.div>

          {/* שורת אמון: מספרים אמיתיים בלבד */}
          <motion.dl
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.08, delayChildren: 0.45 },
              },
            }}
            className="mt-10 grid max-w-[34rem] grid-cols-3 gap-4 border-t border-foreground/10 pt-6 sm:mt-12"
          >
            {text.statValues.map((v, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: EASE },
                  },
                }}
                className={`flex flex-col gap-1 ${i > 0 ? "border-s border-foreground/10 ps-4" : ""}`}
              >
                <dt className="text-sm leading-snug text-foreground/80 sm:text-[0.9375rem]">
                  {text.statLabels[i]}
                </dt>
                <dd
                  className="order-first self-start text-2xl font-black text-foreground sm:text-3xl"
                  dir="ltr"
                >
                  {v}
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>

        {/* תמונה: שמאל בדסקטופ, אחרי הטקסט בטלפון */}
        <div className="relative mx-auto w-full max-w-[30rem] px-3 sm:px-0 lg:max-w-none">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 translate-x-[-5%] translate-y-[4%] border-[1.5px] border-accent/70"
            style={{ borderRadius: "50% 50% 2.25rem 2.25rem / 40% 40% 2.25rem 2.25rem" }}
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-10 -end-6 -z-10 size-40"
            style={{
              backgroundImage:
                "radial-gradient(color-mix(in oklab, var(--brand-accent) 80%, transparent) 1.5px, transparent 1.6px)",
              backgroundSize: "14px 14px",
              opacity: 0.7,
            }}
          />

          <motion.div style={reduce ? undefined : { y: imgY }}>
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1, ease: EASE }}
              className="overflow-hidden shadow-[0_40px_90px_-40px_rgb(0_0_0/0.55)] ring-1 ring-foreground/10"
              style={{ borderRadius: "50% 50% 2rem 2rem / 40% 40% 2rem 2rem" }}
            >
              <DemoImage label={text.image} ratio="4 / 5" tone="light" />
            </motion.div>
          </motion.div>

          <FloatChip
            className="-start-1 bottom-[12%] sm:-start-10"
            delay={0.7}
            drift={chipA}
            float={8}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-accent"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3.5" y="5" width="17" height="15" rx="3" />
                  <path d="M3.5 10h17M8 3v4M16 3v4" />
                </svg>
              </span>
              <div className="text-start">
                <p className="text-xl font-black leading-tight text-foreground sm:text-2xl">
                  {text.chipValue}
                </p>
                <p className="text-sm text-foreground/80">{text.chipLabel}</p>
              </div>
            </div>
          </FloatChip>

          <FloatChip
            className="-end-1 top-[9%] sm:-end-8"
            delay={0.85}
            drift={chipB}
            float={10}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-secondary"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="size-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                </svg>
              </span>
              <div className="text-start">
                <p className="text-[0.9375rem] font-bold leading-tight text-foreground">
                  {text.noticeTitle}
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-foreground/80">
                  {text.noticeSub}
                </p>
              </div>
            </div>
          </FloatChip>
        </div>
      </div>
    </section>
  );
}
