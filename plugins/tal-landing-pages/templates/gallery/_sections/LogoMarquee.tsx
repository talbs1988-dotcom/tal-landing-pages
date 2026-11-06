/*
 * מתכון: עם מי עובדים. מתי: מיד אחרי הפתיחה או אחרי "מי אני", כשיש לוגואים של לקוחות
 * או של הכלים שהעסק מחבר. בלי לוגואים אמיתיים לא שמים את הסקשן הזה.
 * מה עושה אותו: שתי שורות שזזות לאט זו מול זו ונמוגות בקצוות, ומתחתן שלושה מספרים קטנים.
 * העין קולטת "הרבה עסקים" בלי שצריך לקרוא כל שם.
 * איך מתאימים לסקשן אמיתי: t("logos.title"), t("logos.stat1Value") וכו', עם
 * {...editProps("logos.title")} על כל אלמנט טקסט. כל "לוגו" כאן הוא next/image אמיתי
 * מ-public/assets (בשמות logo1, logo2...), בגובה קבוע (h-8 עד h-10), עם alt={alt("logo1")} בשם של העסק.
 * המספרים: Number(t("logos.stat1Value")).
 */
import {
  CountUp,
  Marquee,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/motion";

export type LogoMarqueeText = {
  title: string;
  logos: string[];
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

export const demo: LogoMarqueeText = {
  title: "עסקים שכבר עובדים כך",
  logos: [
    "מרפאת השקד",
    "סטודיו נוגה",
    "גלבוע ייעוץ",
    "פיזיו פלוס",
    "אדריכלות כרמל",
    "בית הפילאטיס",
    "דן מעבדות שיניים",
    "לוי ושות׳ רו״ח",
    "קליניקת אלון",
    "שיער ועוד",
  ],
  stat1Value: "120",
  stat1Suffix: "עסקים",
  stat1Label: "עברו אצלנו מיפוי",
  stat2Value: "14",
  stat2Suffix: "תחומים",
  stat2Label: "מקליניקות ועד משרדי רו״ח",
  stat3Value: "3",
  stat3Suffix: "חודשים",
  stat3Label: "עד שהמערכת עומדת לבד",
};

const ID = "gallery-logos-title";

/* סימן קטן ליד כל שם, כדי שהשורה תיראה כמו לוגואים ולא כמו רשימת מילים */
function Mark({ i }: { i: number }) {
  const k = i % 5;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-6 shrink-0 text-primary"
    >
      {k === 0 && <circle cx="12" cy="12" r="9" fill="currentColor" />}
      {k === 1 && (
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      )}
      {k === 2 && <path d="M12 3 21 20H3z" fill="currentColor" />}
      {k === 3 && (
        <g fill="currentColor">
          <circle cx="8" cy="12" r="5" />
          <circle cx="16" cy="12" r="5" opacity=".45" />
        </g>
      )}
      {k === 4 && <path d="M4 4h7v7H4zM13 13h7v7h-7z" fill="currentColor" />}
    </svg>
  );
}

/* בגלריה: "לוגו" מטקסט. בדף אמיתי: next/image של הלוגו, באותה קופסה */
const WEIGHTS = [
  "font-extrabold",
  "font-semibold",
  "font-bold",
  "font-medium",
  "font-black",
];

function Logo({ name, i }: { name: string; i: number }) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2.5 rounded-2xl border border-foreground/10 bg-white/70 px-6 text-foreground/70 shadow-[0_1px_0_rgb(255_255_255/0.8)_inset] transition-colors duration-300 hover:border-accent/50 hover:text-foreground sm:h-[4.5rem] sm:px-7">
      <Mark i={i} />
      <span
        className={`whitespace-nowrap text-lg ${WEIGHTS[i % WEIGHTS.length]}`}
      >
        {name}
      </span>
    </div>
  );
}

export default function LogoMarquee({ text }: { text: LogoMarqueeText }) {
  // כל שורה מקבלת את כל הלוגואים (בסדר אחר), כדי שהשורה תהיה רחבה מהמסך ולא ייפתח בה חור
  const rowA = text.logos;
  const half = Math.ceil(text.logos.length / 2);
  const rowB = [...text.logos.slice(half), ...text.logos.slice(0, half)];
  const stats = [
    { v: text.stat1Value, s: text.stat1Suffix, l: text.stat1Label },
    { v: text.stat2Value, s: text.stat2Suffix, l: text.stat2Label },
    { v: text.stat3Value, s: text.stat3Suffix, l: text.stat3Label },
  ];

  return (
    <section
      aria-labelledby={ID}
      className="relative overflow-hidden py-16 sm:py-24"
      style={{
        background:
          "linear-gradient(180deg, var(--brand-background), color-mix(in oklab, var(--brand-background) 92%, var(--brand-accent)))",
      }}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal
          variant="fade"
          className="flex items-center justify-center gap-4"
        >
          <span
            aria-hidden="true"
            className="h-px w-12 bg-gradient-to-r from-accent to-transparent sm:w-20"
          />
          <h2
            id={ID}
            className="text-center text-lg font-bold text-foreground/80 sm:text-xl"
          >
            {text.title}
          </h2>
          <span
            aria-hidden="true"
            className="h-px w-12 bg-gradient-to-l from-accent to-transparent sm:w-20"
          />
        </Reveal>
      </div>

      {/* שתי שורות שזזות זו מול זו, ברוחב המסך המלא */}
      <Reveal
        variant="fade"
        delay={0.15}
        duration={0.9}
        className="mt-10 space-y-4 sm:mt-12"
      >
        <Marquee seconds={48}>
          {rowA.map((n, i) => (
            <Logo key={n} name={n} i={i} />
          ))}
        </Marquee>
        <Marquee seconds={56} reverse>
          {rowB.map((n, i) => (
            <Logo key={n} name={n} i={i + 2} />
          ))}
        </Marquee>
      </Reveal>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Stagger
          gap={0.1}
          className="mx-auto mt-12 grid max-w-4xl grid-cols-1 divide-y divide-foreground/10 rounded-3xl border border-foreground/10 bg-white/55 backdrop-blur-sm sm:mt-16 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {stats.map((st, i) => (
            <StaggerItem
              key={i}
              className="flex items-center gap-4 px-6 py-5 sm:flex-col sm:items-start sm:gap-1.5 sm:px-8 sm:py-7"
            >
              <p className="flex shrink-0 items-baseline gap-1.5 text-primary">
                <CountUp
                  value={Number(st.v)}
                  className="text-[2.25rem] font-extrabold leading-none sm:text-[2.75rem]"
                />
                <span className="text-base font-bold sm:text-lg">{st.s}</span>
              </p>
              <p className="text-base leading-snug text-foreground/75">
                {st.l}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
