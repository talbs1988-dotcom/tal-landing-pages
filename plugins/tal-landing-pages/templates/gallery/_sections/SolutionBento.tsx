/*
 * מתכון: הפתרון. מתי: אחרי שהגולש הבין את הבעיה, כשמראים מה בפועל משתנה אצלו.
 * מה עושה אותו: סקשן כהה עם אור חי ועדין, ורשת "בנטו" של חמישה כרטיסים בגדלים שונים.
 * כרטיס אחד גדול עם תמונה מוביל את העין, והשאר קטנים עם אייקון, כותרת ושורה אחת.
 * הכרטיסים נכנסים בזה אחר זה, וההילה בכל כרטיס עוקבת אחרי העכבר.
 * איך מתאימים לסקשן אמיתי: t("solution.title"), t("solution.card1Title") וכו',
 * ועל כל אלמנט טקסט {...editProps("solution.card1Title")}. את DemoImage מחליפים
 * ב-next/image (fill, object-cover) עם alt={alt("solution")}. האייקונים נשארים aria-hidden.
 * כפתור, אם יש בקופי: CtaButton מתחת לרשת.
 */
import type { ReactNode } from "react";
import {
  Aurora,
  GlowCard,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/motion";
import { DemoImage } from "../_kit/DemoImage";

export type SolutionBentoText = {
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  imageLabel: string;
  card1Tag: string;
  card1Title: string;
  card1Text: string;
  card2Title: string;
  card2Text: string;
  card3Title: string;
  card3Text: string;
  card4Title: string;
  card4Text: string;
  card5Title: string;
  card5Text: string;
};

export const demo: SolutionBentoText = {
  kicker: "מה עושים ביחד",
  title: "לא עוד טיפ.",
  titleAccent: "מערכת שהעסק עובד לפיה",
  subtitle:
    "שלושה חודשים, פגישה בשבוע. בסוף יש לך עסק שאפשר להסביר, למדוד ולהעביר הלאה.",
  imageLabel: "פגישת מיפוי ליד לוח מחיק",
  card1Tag: "החודש הראשון",
  card1Title: "מיפוי העסק",
  card1Text:
    "יום אחד מול הלוח: מהפנייה הראשונה ועד התשלום, רואים איפה הכל נתקע.",
  card2Title: "תהליכים כתובים",
  card2Text: "מה שיושב לך בראש עובר למסמך שעובד חדש יכול לקרוא.",
  card3Title: "יומן שמתמלא לבד",
  card3Text: "תזכורות ומעקב אחרי פניות רצים בלי לרדוף אחרי אף אחד.",
  card4Title: "עובד ראשון",
  card4Text: "מגדירים תפקיד, מראיינים ביחד וקולטים לפי תוכנית.",
  card5Title: "תמונת מספרים חודשית",
  card5Text: "מה נכנס, מה יצא ואיפה באמת נשאר הרווח, בדף אחד.",
};

const ID = "gallery-solution-title";

/* אייקונים פשוטים בקו אחד, בצבע הטקסט של הכרטיס */
const ICON = "size-6";
const icons: Record<string, ReactNode> = {
  doc: (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON}
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  calendar: (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON}
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17M8.5 14.5l2 2 4-4" />
    </svg>
  ),
  person: (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON}
    >
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.6 0 3 .5 4.2 1.4M18 14v6M15 17h6" />
    </svg>
  ),
  chart: (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON}
    >
      <path d="M4 20h16M7 16v-4M12 16V8M17 16v-6" />
    </svg>
  ),
};

function IconBox({ name }: { name: string }) {
  return (
    <span
      className="grid size-12 shrink-0 place-items-center rounded-2xl text-accent"
      style={{
        background: "color-mix(in oklab, var(--brand-accent) 14%, transparent)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklab, var(--brand-accent) 35%, transparent)",
      }}
    >
      {icons[name]}
    </span>
  );
}

/* הכרטיס על רקע כהה: מסגרת בהירה עדינה במקום המסגרת הכהה של glow-card */
const CARD = "h-full bg-white/[0.035] p-6 sm:p-7";
const CARD_STYLE = { borderColor: "rgb(255 255 255 / 0.1)" };

export default function SolutionBento({ text }: { text: SolutionBentoText }) {
  const small = [
    {
      icon: "doc",
      title: text.card2Title,
      body: text.card2Text,
      cls: "lg:col-start-3 lg:row-start-1",
    },
    {
      icon: "calendar",
      title: text.card3Title,
      body: text.card3Text,
      cls: "lg:col-start-3 lg:row-start-2",
    },
    {
      icon: "person",
      title: text.card4Title,
      body: text.card4Text,
      cls: "lg:col-start-1 lg:row-start-3",
    },
  ];

  return (
    <section
      aria-labelledby={ID}
      className="relative isolate overflow-hidden bg-secondary py-20 text-background sm:py-28 lg:py-32"
    >
      <div className="absolute inset-0 -z-10" style={{ opacity: 0.5 }}>
        <Aurora tone="dark" grid={false} />
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal variant="fade">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold text-accent">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent"
              />
              <span>{text.kicker}</span>
            </p>
          </Reveal>
          <Reveal variant="blur" delay={0.08}>
            <h2
              id={ID}
              className="mt-5 text-balance text-[2rem] font-extrabold leading-[1.12] sm:text-4xl lg:text-[2.75rem]"
            >
              <span className="block">{text.title}</span>
              <span className="text-shine block pb-1">{text.titleAccent}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg leading-[1.65] text-background/75 sm:text-xl">
              {text.subtitle}
            </p>
          </Reveal>
        </div>

        <Stagger
          gap={0.1}
          amount={0.15}
          className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto] lg:gap-5"
        >
          {/* הכרטיס הגדול: תמונה מלאה וטקסט על שכבה כהה */}
          <StaggerItem
            variant="scale"
            className="sm:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1"
          >
            <GlowCard
              className="group h-full min-h-[24rem] bg-white/[0.035]"
              style={CARD_STYLE}
            >
              <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]">
                <DemoImage
                  label={text.imageLabel}
                  ratio="auto"
                  tone="dark"
                  className="size-full"
                />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, var(--brand-secondary) 8%, color-mix(in oklab, var(--brand-secondary) 70%, transparent) 40%, transparent 75%)",
                }}
              />
              <div className="relative flex h-full flex-col justify-end p-6 sm:p-9">
                <p className="w-fit rounded-full bg-accent px-3 py-1 text-sm font-bold text-secondary">
                  {text.card1Tag}
                </p>
                <h3 className="mt-4 text-2xl font-bold sm:text-[1.875rem]">
                  {text.card1Title}
                </h3>
                <p className="mt-2 max-w-md text-lg leading-[1.6] text-background/80">
                  {text.card1Text}
                </p>
              </div>
            </GlowCard>
          </StaggerItem>

          {small.map((c) => (
            <StaggerItem key={c.icon} className={c.cls}>
              {/* בטלפון האייקון ליד הכותרת (כרטיס נמוך יותר), מטאבלט ומעלה מעליה */}
              <GlowCard className={`${CARD} flex items-start gap-4 sm:block`} style={CARD_STYLE}>
                <IconBox name={c.icon} />
                <div>
                  <h3 className="text-xl font-bold sm:mt-5 sm:text-[1.375rem]">{c.title}</h3>
                  <p className="mt-2 text-[1.0625rem] leading-[1.6] text-background/75">{c.body}</p>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}

          {/* כרטיס רחב: אייקון וטקסט בצד אחד, גרף קטן מעוטר בצד השני */}
          <StaggerItem className="lg:col-span-2 lg:col-start-2 lg:row-start-3">
            <GlowCard
              className={`${CARD} flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between`}
              style={CARD_STYLE}
            >
              <div className="max-w-sm">
                <IconBox name="chart" />
                <h3 className="mt-5 text-xl font-bold sm:text-[1.375rem]">
                  {text.card5Title}
                </h3>
                <p className="mt-2 text-[1.0625rem] leading-[1.6] text-background/75">
                  {text.card5Text}
                </p>
              </div>
              <div
                aria-hidden="true"
                dir="ltr"
                className="flex h-24 items-end gap-2 sm:h-32 sm:gap-2.5"
              >
                {[38, 52, 44, 66, 58, 80, 92].map((h, i) => (
                  <span
                    key={i}
                    className="w-5 rounded-t-md sm:w-6"
                    style={{
                      height: `${h}%`,
                      background:
                        i === 6
                          ? "var(--brand-accent)"
                          : `color-mix(in oklab, var(--brand-accent) ${18 + i * 6}%, transparent)`,
                    }}
                  />
                ))}
              </div>
            </GlowCard>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
