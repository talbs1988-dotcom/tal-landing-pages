/*
 * מתכון: הטופס. מתי: הסקשן האחרון בדף, המקום שאליו כל כפתור בדף מוביל.
 * מה עובד: במה כהה עם רקע חי, כותרת קצרה ושורה אחת, וכרטיס בהיר עם מסגרת שזורם בה אור. העין הולכת ישר לכרטיס.
 * שלושה משפטי ביטחון קטנים מורידים את הפחד לפני שמשאירים פרטים. הטופס עצמו לא זז ולא נכנס באנימציה.
 * בדף אמיתי: t("form.eyebrow"), t("form.title"), t("form.sub"), t("form.cardTitle"), t("form.assure1") עד assure3,
 * כל אחד עם {...editProps(key)} על האלמנט שלו. בתוך הכרטיס שמים <LeadForm /> כמו שהוא, בלי לשנות אותו ובלי לעטוף
 * את השדות. הכרטיס בהיר בכוונה: הצבעים של LeadForm (שדות לבנים, שגיאה באדום כהה) בנויים לרקע בהיר.
 */
import type { CSSProperties } from "react";
import { Aurora, Reveal, Stagger, StaggerItem } from "@/components/motion";

export type FormStageText = {
  eyebrow: string;
  title: string;
  sub: string;
  cardTitle: string;
  assurances: string[];
};

export const demo: FormStageText = {
  eyebrow: "צעד אחד ואנחנו בקשר",
  title: "בוא נבדוק יחד אם זה מתאים לעסק שלך",
  sub: "משאירים פרטים, ואנחנו חוזרים אליך עוד היום לשיחה של רבע שעה. בלי מצגת מכירה.",
  cardTitle: "לשיחת היכרות קצרה",
  assurances: [
    "בלי התחייבות ובלי עלות",
    "חוזרים אליך תוך יום עבודה",
    "הפרטים נשארים אצלנו בלבד",
  ],
};

const ICONS = [
  // יד פתוחה / בלי התחייבות
  <path key="a" d="M20 6L9 17l-5-5" />,
  // שעון
  <g key="b">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </g>,
  // מנעול
  <g key="c">
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </g>,
];

/*
 * תצוגה בלבד, בגלריה: כך ייראה LeadForm בתוך הכרטיס.
 * בדף אמיתי כל הבלוק הזה מוחלף ב-<LeadForm /> (components/LeadForm.tsx), שלא משנים.
 */
function LeadFormMock() {
  const fields: [string, string][] = [
    ["שם מלא", ""],
    ["אימייל", "name@example.com"],
    ["טלפון", "050-1234567"],
  ];
  return (
    <>
      <p className="sr-only">כאן מופיע טופס השארת הפרטים</p>
      <div aria-hidden="true" className="mt-6 select-none space-y-4 text-start">
        {fields.map(([label, ph]) => (
          <div key={label}>
            <div className="mb-1.5 font-medium">{label}</div>
            <div
              dir={ph ? "ltr" : undefined}
              className="flex min-h-12 w-full items-center rounded-lg border border-black/25 bg-white px-4 py-2.5 text-base"
              style={{ color: "color-mix(in oklab, var(--brand-text) 68%, white)" }}
            >
              {ph}
            </div>
            <div className="mt-1.5 min-h-5" />
          </div>
        ))}
        <div className="flex items-start gap-3 rounded-lg border border-black/10 p-3">
          <span className="mt-1 size-5 shrink-0 rounded border border-black/40 bg-white" />
          <span className="text-sm">
            אשמח לקבל עדכונים ותוכן מקצועי במייל (לא חובה)
          </span>
        </div>
        <div className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-lg font-semibold text-white shadow-sm">
          שליחה
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">
          השם, המייל והטלפון נאספים כדי לחזור אליך בנוגע לפנייה. לפרטים:{" "}
          <span className="font-medium underline underline-offset-2">
            מדיניות הפרטיות
          </span>
          .
        </p>
      </div>
    </>
  );
}

export default function FormStage({ text }: { text: FormStageText }) {
  const cardBg = {
    ["--card-bg" as string]: "var(--brand-background)",
  } as CSSProperties;
  return (
    <section data-tone="dark"
      aria-labelledby="gallery-formstage-title"
      className="relative isolate overflow-hidden px-5 py-24 text-white md:px-8 md:py-32"
    >
      <Aurora tone="dark" />

      <div className="relative mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1fr_minmax(0,31rem)] lg:grid-rows-[auto_1fr] lg:gap-x-20 lg:gap-y-10">
        <Reveal className="lg:col-start-1 lg:row-start-1 lg:pt-10">
          <p className="inline-flex items-center rounded-full bg-white/[0.07] px-4 py-1.5 text-base font-semibold text-accent ring-1 ring-white/15 backdrop-blur">
            {text.eyebrow}
          </p>
          <h2
            id="gallery-formstage-title"
            className="mt-5 text-[clamp(2.2rem,5.2vw,3.9rem)] font-black leading-[1.08] text-balance"
          >
            {text.title}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80 md:text-xl">
            {text.sub}
          </p>
        </Reveal>

        {/* הכרטיס: מסגרת זכוכית, ובתוכה כרטיס בהיר עם אור שזורם במסגרת. לא זז בכניסה */}
        <div className="relative isolate lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div
            aria-hidden="true"
            className="absolute -inset-x-8 -inset-y-10 -z-10 rounded-[60px] blur-3xl"
            style={{
              opacity: 0.7,
              background:
                "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--brand-accent) 45%, transparent), transparent 70%)",
            }}
          />
          <div className="rounded-[34px] bg-white/[0.06] p-2.5 shadow-[0_50px_120px_-40px_rgb(0_0_0/0.85)] ring-1 ring-white/15 backdrop-blur-xl">
            <div
              className="border-flow rounded-[26px] p-6 text-foreground md:p-8"
              style={cardBg}
            >
              <h3 className="text-2xl font-bold">{text.cardTitle}</h3>
              <LeadFormMock />
            </div>
          </div>
        </div>

        <Stagger
          role="list"
          gap={0.08}
          className="space-y-4 lg:col-start-1 lg:row-start-2"
        >
          {text.assurances.map((a, i) => (
            <StaggerItem
              key={a}
              role="listitem"
              variant="slide-start"
              className="flex items-center gap-3.5"
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full text-accent ring-1 ring-accent/40"
                style={{
                  background:
                    "color-mix(in oklab, var(--brand-accent) 14%, transparent)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[i % ICONS.length]}
                </svg>
              </span>
              <span className="text-[17px] font-medium text-white/90 md:text-lg">
                {a}
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
