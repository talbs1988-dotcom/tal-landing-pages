"use client";
/*
 * הכאב: כותרת, שלושה כרטיסים עם משפטים במילים של הלקוחות (כמו שכתבו בוואטסאפ), ושורת סיום גדולה.
 * מתאים מיד אחרי הפתיחה, כשיש ב-customer-words.md משפטים אמיתיים. לא להמציא ציטוטים.
 * מה עושה אותו: הכרטיסים נכנסים בזה אחר זה עם הטיה קטנה שמתיישרת, הכרטיס האמצעי יורד מעט (קצב ולא רשת),
 * ובשורת הסיום ביטוי אחד נצבע בסימון זהב שנמרח כשהוא נכנס למסך.
 * בדף אמיתי: t("pain.eyebrow"), t("pain.title"), t("pain.card1") + t("pain.card1Tag") וכו',
 * t("pain.closingStart"), t("pain.closingHighlight"), t("pain.closingEnd"); {...editProps(key)} על כל אלמנט טקסט.
 * הסימון הוא רקע על ה-span של הביטוי, אז הוא נשבר יפה גם כשהביטוי יורד שורה.
 */
import { motion, useReducedMotionConfig } from "motion/react";
import { EASE, Reveal, Stagger } from "@/components/motion";

export type PainCardsText = {
  eyebrow: string;
  title: string;
  cards: string[];
  cardTags: string[];
  closingStart: string;
  closingHighlight: string;
  closingEnd: string;
};

export const demo: PainCardsText = {
  eyebrow: "נשמע מוכר?",
  title: "ככה זה נשמע אצל רוב העצמאים שמגיעים אלינו",
  cards: [
    "כל סוף חודש אני יושב עם שקית של קבלות ומנסה להיזכר מה זה בכלל.",
    "הגיע מכתב ממס הכנסה, לא הבנתי מה רוצים ממני, אז שמתי אותו במגירה.",
    "אני לא באמת יודע כמה אני מרוויח. יש כסף בחשבון, ופתאום אין.",
  ],
  cardTags: ["סוף החודש", "המכתב במגירה", "החשבון בבנק"],
  closingStart: "זה לא שאתה לא מסודר.",
  closingHighlight: "אף אחד עוד לא בנה לך שיטה",
  closingEnd: "שעובדת גם בחודש עמוס.",
};

/** אייקונים קטנים לכרטיסים, לפי הסדר. בדף אמיתי בוחרים אייקון שמתאים לכל כאב */
const ICONS = [
  // קבלה
  <path
    key="r"
    d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5zM9 8h6M9 11.5h6M9 15h3.5"
  />,
  // מעטפה
  <path key="e" d="M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7" />,
  // גרף יורד
  <path key="g" d="M3.5 6.5l6 6 4-4 7 7M20.5 11v4.5H16" />,
];

export default function PainCards({ text }: { text: PainCardsText }) {
  const reduce = useReducedMotionConfig();
  const marker = "color-mix(in oklab, var(--brand-accent) 45%, transparent)";

  return (
    <section
      aria-labelledby="gallery-paincards-title"
      className="relative isolate overflow-hidden bg-background py-20 sm:py-28 lg:py-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[60%]"
        style={{
          background:
            "radial-gradient(60% 70% at 85% 0%, color-mix(in oklab, var(--brand-accent) 14%, transparent), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="flex items-center gap-3 text-base font-semibold text-primary">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            <span>{text.eyebrow}</span>
          </p>
          <h2
            id="gallery-paincards-title"
            className="mt-4 text-balance text-[clamp(2rem,4.6vw,3.5rem)] font-black leading-[1.1] text-foreground"
          >
            {text.title}
          </h2>
        </Reveal>

        <Stagger
          gap={0.14}
          amount={0.25}
          className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-3 md:gap-6"
        >
          {text.cards.map((quote, i) => (
            <motion.figure
              key={i}
              variants={{
                hidden: { opacity: 0, y: 40, rotate: i % 2 ? 1.5 : -1.5 },
                show: {
                  opacity: 1,
                  y: 0,
                  rotate: 0,
                  transition: { duration: 0.8, ease: EASE },
                },
              }}
              className={`group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-foreground/10 p-7 shadow-[0_20px_50px_-30px_rgb(0_0_0/0.35)] transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.45)] sm:p-8 ${
                i === 1 ? "md:-mb-10 md:mt-10" : ""
              }`}
              style={{
                background:
                  "color-mix(in oklab, var(--brand-background) 70%, white)",
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 48 40"
                className="pointer-events-none absolute end-6 top-6 h-9 w-11 text-accent/30 transition-colors duration-300 group-hover:text-accent/55 sm:end-7 sm:top-7"
                fill="currentColor"
              >
                <path d="M0 40V24C0 10.7 6.4 2.7 19.2 0l2.2 5.2C14.5 7.3 11 11.6 10.6 18H20v22H0zm28 0V24C28 10.7 34.4 2.7 47.2 0l2.2 5.2C42.5 7.3 39 11.6 38.6 18H48v22H28z" />
              </svg>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-accent"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {ICONS[i % ICONS.length]}
                  </svg>
                </span>
                <span className="text-[0.9375rem] font-medium text-foreground/80">
                  {text.cardTags[i]}
                </span>
              </div>
              <blockquote className="relative mt-6 flex-1">
                <p className="text-[1.1875rem] font-medium leading-relaxed text-foreground sm:text-[1.3125rem] sm:leading-[1.6]">
                  {quote}
                </p>
              </blockquote>
              <div
                aria-hidden="true"
                className="mt-7 h-1 w-10 rounded-full bg-accent/60 transition-[width] duration-500 group-hover:w-20"
              />
            </motion.figure>
          ))}
        </Stagger>

        <Reveal
          className="mx-auto mt-20 max-w-4xl text-center sm:mt-28"
          amount={0.6}
        >
          <p className="text-balance text-[clamp(1.6rem,3.6vw,2.75rem)] font-bold leading-[1.35] text-foreground">
            <span className="text-foreground/80">{text.closingStart}</span>{" "}
            <motion.span
              className="rounded-[0.2em] px-[0.1em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
              style={{
                backgroundImage: `linear-gradient(${marker}, ${marker})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "100% 85%",
              }}
              initial={{ backgroundSize: reduce ? "100% 55%" : "0% 55%" }}
              whileInView={{ backgroundSize: "100% 55%" }}
              viewport={{ once: true, amount: 1 }}
              transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
            >
              {text.closingHighlight}
            </motion.span>{" "}
            <span>{text.closingEnd}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
