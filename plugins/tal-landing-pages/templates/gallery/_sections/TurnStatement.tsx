"use client";
/*
 * נקודת המפנה: משפט ענק בשתיים-שלוש שורות, פסקה קצרה אחת, ותמונה שנחשפת מתוך חלון כשגוללים.
 * מתאים בין הכאב לפתרון, כשיש משפט אחד שמסכם את השינוי. לא לשים פה רשימות או כפתור.
 * מה עושה אותו: כל שורה עולה מתוך "חריץ" משלה (מסכה), השורה האחרונה מבריקה, וקו זהב נמתח מתחת.
 * התמונה נפתחת מחלון קטן למסך מלא תוך כדי גלילה (clip-path) ומתקרבת פנימה. בלי תנועה: הכול גלוי ועומד.
 * בדף אמיתי: t("turn.kicker"), t("turn.line1"), t("turn.line2"), t("turn.highlight"), t("turn.paragraph"),
 * {...editProps(key)} על ה-span הפנימי של כל שורה (זה שמכיל רק את הטקסט). התמונה: next/image עם alt={alt("turn")}.
 */
import {
  motion,
  useReducedMotionConfig,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import { EASE, Reveal } from "@/components/motion";
import { DemoImage } from "../_kit/DemoImage";

export type TurnStatementText = {
  kicker: string;
  line1: string;
  line2: string;
  highlight: string;
  paragraph: string;
  image: string;
};

export const demo: TurnStatementText = {
  kicker: "מה שמשתנה כשיש שיטה",
  line1: "הניירת לא נעלמת.",
  line2: "היא פשוט מפסיקה",
  highlight: "להיות הבעיה שלך.",
  paragraph:
    "מצלמים קבלה בוואטסאפ, מקבלים תזכורת אחת לפני כל דיווח, ופעם בחודש יושבים חצי שעה על המספרים. את כל השאר אנחנו עושים, ואתה יודע בכל רגע איפה העסק עומד.",
  image: "צילום: לקוח עובר על הסיכום החודשי בטלפון",
};

/** שורה שעולה מתוך מסכה. העטיפה חותכת, ה-span הפנימי מחזיק רק את הטקסט */
function MaskLine({
  children,
  delay,
  className = "",
}: {
  children: string;
  delay: number;
  className?: string;
}) {
  return (
    <span className="block overflow-hidden pb-[0.04em] pt-[0.1em]">
      <motion.span
        className={`block ${className}`}
        variants={{
          hidden: { y: "108%" },
          show: { y: "0%", transition: { duration: 0.85, delay, ease: EASE } },
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function TurnStatement({ text }: { text: TurnStatementText }) {
  const reduce = useReducedMotionConfig();
  const imgRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: imgRef,
    offset: ["start 95%", "start 25%"],
  });
  const clip = useTransform(
    scrollYProgress,
    [0, 1],
    ["inset(16% 18% 16% 18% round 120px)", "inset(0% 0% 0% 0% round 28px)"],
  );
  const zoom = useTransform(scrollYProgress, [0, 1], [1.28, 1]);

  return (
    <section
      aria-labelledby="gallery-turnstatement-title"
      className="relative isolate overflow-hidden bg-secondary py-24 text-white sm:py-32 lg:py-40"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 45% at 90% 8%, color-mix(in oklab, var(--brand-accent) 22%, transparent), transparent 70%), radial-gradient(45% 40% at 5% 70%, color-mix(in oklab, var(--brand-primary) 35%, transparent), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal variant="fade">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-white/15 px-4 py-1.5 text-[0.9375rem] font-medium text-white/80">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-accent"
            />
            <span>{text.kicker}</span>
          </p>
        </Reveal>

        <motion.h2
          id="gallery-turnstatement-title"
          initial={reduce ? "show" : "hidden"}
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="mt-8 text-[clamp(2.5rem,8.2vw,7.25rem)] font-black leading-[0.98] text-white"
        >
          <MaskLine delay={0}>{text.line1}</MaskLine>
          <MaskLine delay={0.12} className="text-white/60">
            {text.line2}
          </MaskLine>
          <MaskLine delay={0.24} className="w-fit text-shine">{text.highlight}</MaskLine>
        </motion.h2>

        <motion.div
          aria-hidden="true"
          initial={{ scaleX: reduce ? 1 : 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 1 }}
          transition={{ duration: 1.1, delay: 0.5, ease: EASE }}
          className="mt-10 h-px origin-[100%_50%] sm:mt-14"
          style={{
            background:
              "linear-gradient(to left, var(--brand-accent), color-mix(in oklab, var(--brand-accent) 10%, transparent))",
          }}
        />

        <div className="mt-10 grid items-start gap-10 sm:mt-14 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-4 lg:pt-4" delay={0.1}>
            <p className="max-w-[38ch] text-pretty text-[1.0625rem] leading-[1.75] text-white/80 sm:text-xl sm:leading-[1.7]">
              {text.paragraph}
            </p>
          </Reveal>

          <div ref={imgRef} className="lg:col-span-8">
            <motion.div
              style={reduce ? undefined : { clipPath: clip }}
              className="relative aspect-[4/5] overflow-hidden rounded-[28px] sm:aspect-[16/10]"
            >
              <motion.div
                style={reduce ? undefined : { scale: zoom }}
                className="absolute inset-0"
              >
                <DemoImage
                  label={text.image}
                  ratio="auto"
                  tone="dark"
                  className="h-full w-full"
                />
              </motion.div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
