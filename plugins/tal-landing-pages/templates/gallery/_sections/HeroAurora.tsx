"use client";
/*
 * פתיחה כהה עם רקע חי (Aurora). מתאים כשיש משפט פתיחה חזק ותמונה אחת רחבה (צילום עבודה, מסך, מוצר).
 * מה עושה אותו: כותרת ענקית במרכז עם ביטוי אחד מבריק וקו זהב שנמתח מתחתיו, שלושה "בלי X" קצרים,
 * כפתור אחד, ותמונה גדולה במסגרת זוהרת שמתיישרת מהטייה כשגוללים.
 * ביצועים: הכותרת והתמונה גלויות מהציור הראשון (אין להן opacity 0), כי הן ה-LCP. רק השאר נכנס בתנועה.
 * בדף אמיתי: הטקסטים מ-t("hero.eyebrow"), t("hero.titleStart"), t("hero.titleHighlight"), t("hero.subtitle"),
 * t("hero.without1..3"), t("hero.ctaNote"), ועל כל אלמנט טקסט {...editProps(key)}.
 * התמונה: next/image עם priority ו-alt={alt("hero")}. הכפתור: CtaButton, לא DemoCta.
 */
import {
  motion,
  useReducedMotionConfig,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import { Aurora, EASE } from "@/components/motion";
import { DemoImage } from "../_kit/DemoImage";
import { DemoCta } from "../_kit/DemoCta";

export type HeroAuroraText = {
  eyebrow: string;
  titleStart: string;
  titleHighlight: string;
  subtitle: string;
  without: string[];
  cta: string;
  ctaNote: string;
  image: string;
};

export const demo: HeroAuroraText = {
  eyebrow: "הנהלת חשבונות לעצמאים ולעסקים קטנים",
  titleStart: "מצלמים את הקבלה",
  titleHighlight: "ושוכחים ממנה",
  subtitle:
    "אנחנו מנהלים לך את הספרים, מגישים את הדוחות למע״מ ולמס הכנסה, ופעם בחודש שולחים לך סיכום אחד ברור: כמה הרווחת וכמה לשים בצד.",
  without: [
    "בלי שקית קבלות במגירה",
    "בלי קנסות על איחור",
    "בלי לרדוף אחרי רואה חשבון",
  ],
  cta: "קובעים שיחת היכרות",
  ctaNote: "20 דקות בטלפון, בלי התחייבות",
  image: "צילום: היועצת עם לקוח מול המסך",
};

/** כניסה בטעינה (לא בגלילה): עולה מעט ומופיעה */
const enter = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.75, delay, ease: EASE },
});

export default function HeroAurora({ text }: { text: HeroAuroraText }) {
  const reduce = useReducedMotionConfig();
  const frameRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start end", "start 35%"],
  });
  const tilt = useTransform(scrollYProgress, [0, 1], [10, 0]);

  return (
    <section
      aria-labelledby="gallery-heroaurora-title"
      className="relative isolate overflow-hidden bg-secondary pb-16 pt-14 sm:pb-24 sm:pt-20 lg:pt-24"
    >
      <Aurora tone="dark" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-5 text-center sm:px-8">
        <motion.p
          {...enter(0.05)}
          className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md sm:text-base"
        >
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/70 motion-reduce:animate-none" />
            <span className="relative size-2 rounded-full bg-accent" />
          </span>
          <span>{text.eyebrow}</span>
        </motion.p>

        {/* בלי כניסה: הכותרת גלויה מהציור הראשון */}
        <h1
          id="gallery-heroaurora-title"
          className="max-w-[16ch] text-balance text-[clamp(2.25rem,8.4vw,6.4rem)] font-black leading-[1.02] text-white"
        >
          <span className="block">{text.titleStart}</span>
          <span className="relative mt-1 inline-block max-w-full pb-[0.12em]">
            <span className="text-shine">{text.titleHighlight}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 300 16"
              preserveAspectRatio="none"
              className="absolute inset-x-[2%] -bottom-[0.06em] h-[0.16em] w-[96%] overflow-visible"
            >
              <motion.path
                d="M4 11 C 70 3, 150 2, 296 8"
                fill="none"
                stroke="var(--brand-accent)"
                strokeWidth="5"
                strokeLinecap="round"
                initial={{ pathLength: reduce ? 1 : 0, opacity: 0.9 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
              />
            </svg>
          </span>
        </h1>

        <motion.p
          {...enter(0.2)}
          className="mt-7 max-w-[56ch] text-balance text-[1.0625rem] leading-relaxed text-white/80 sm:text-xl"
        >
          {text.subtitle}
        </motion.p>

        {/* בטלפון הכפתור לפני ה"בלי", כדי שייכנס למסך הראשון */}
        <div className="flex flex-col items-center">
        <ul className="order-last mt-9 flex max-w-3xl flex-wrap justify-center gap-2 sm:order-none sm:mt-8 sm:gap-2.5">
          {text.without.map((w, i) => (
            <motion.li
              key={i}
              {...enter(0.32 + i * 0.08)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pe-3.5 ps-2 text-[0.9375rem] text-white/90 sm:text-base"
            >
              <span
                aria-hidden="true"
                className="grid size-6 place-items-center rounded-full bg-accent/15 text-accent"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </span>
              <span>{w}</span>
            </motion.li>
          ))}
        </ul>

        <motion.div
          {...enter(0.55)}
          className="mt-9 flex flex-col items-center gap-3 sm:mt-10"
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
          <p className="text-sm text-white/70 sm:text-[0.9375rem]">
            {text.ctaNote}
          </p>
        </motion.div>
        </div>

        {/* התמונה: גלויה מיד. בטעינה רק מתקרבת קלות, ובגלילה מתיישרת מהטייה */}
        <div
          ref={frameRef}
          className="relative mt-14 w-full max-w-5xl sm:mt-20 [perspective:1400px]"
        >
          <div
            aria-hidden="true"
            className="absolute -inset-x-6 -inset-y-8 -z-10 rounded-[48px] blur-3xl sm:-inset-x-16"
            style={{
              opacity: 0.8,
              background:
                "radial-gradient(60% 55% at 50% 40%, color-mix(in oklab, var(--brand-accent) 42%, transparent), transparent 70%), radial-gradient(40% 40% at 15% 90%, color-mix(in oklab, var(--brand-primary) 50%, transparent), transparent 70%)",
            }}
          />
          <motion.div
            style={
              reduce ? undefined : { rotateX: tilt, transformOrigin: "50% 0%" }
            }
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.1, delay: 0.15, ease: EASE }}
          >
            <div
              className="rounded-[30px] p-px shadow-[0_40px_120px_-30px_rgb(0_0_0/0.7)]"
              style={{
                background:
                  "linear-gradient(160deg, color-mix(in oklab, var(--brand-accent) 70%, transparent), rgb(255 255 255 / 0.08) 35%, rgb(255 255 255 / 0.04) 65%, color-mix(in oklab, var(--brand-accent) 40%, transparent))",
              }}
            >
              <div className="relative rounded-[29px] bg-secondary/80 p-2 backdrop-blur sm:p-3">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-[15%] top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-accent) 80%, #fff), transparent)",
                  }}
                />
                <div className="aspect-[4/5] overflow-hidden rounded-[22px] sm:aspect-[16/9]">
                  <DemoImage
                    label={text.image}
                    ratio="auto"
                    tone="dark"
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--brand-secondary))",
        }}
      />
    </section>
  );
}
