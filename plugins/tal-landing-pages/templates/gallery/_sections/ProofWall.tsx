/*
 * מתכון: קיר המלצות. מתי: אחרי שהסברנו מה עושים, כשהקורא שואל "זה עבד למישהו כמוני?".
 * מה עובד: הרבה צילומי וואטסאפ קצרים שזזים לאט בשתי שורות (בטלפון שורה אחת), ומתחתם שלושה סרטונים.
 * הכמות משכנעת, לא אף משפט בודד. בדף אמיתי כל כרטיס כאן הוא צילום מסך אמיתי של לקוח,
 * מטושטש לפי כללי התמונות (שם, מספר, תמונת פרופיל), דרך next/image עם alt={alt("proof-1")} וכו'.
 * הטקסטים: t("proof.eyebrow"), t("proof.title"), t("proof.sub"), t("proof.videosTitle"), t("proof.video1Name"),
 * t("proof.video1Line") וכו', כל אחד עם {...editProps(key)} על האלמנט שלו. פוסטר הסרטון הוא next/image,
 * והסרטון עצמו נטען רק אחרי לחיצה (לא iframe בטעינת הדף).
 */
import type { CSSProperties } from "react";
import { Marquee, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { DemoImage } from "../_kit/DemoImage";

export type ProofWallText = {
  eyebrow: string;
  title: string;
  sub: string;
  quotes: string[];
  names: string[];
  videosTitle: string;
  videoNames: string[];
  videoLines: string[];
};

export const demo: ProofWallText = {
  eyebrow: "מה לקוחות כותבים לנו",
  title: "ככה נשמעים לקוחות אחרי חודש איתנו",
  sub: "צילומי מסך מהוואטסאפ, כמו שהם. הסתרנו רק שמות ומספרי טלפון.",
  quotes: [
    "קיבלתי את הדוח החודשי לפני שבכלל נזכרתי לבקש. מה קרה פה",
    "פעם ראשונה שאני יודעת כמה נשאר לי בסוף החודש",
    "המע״מ הוגש ואני לא חיפשתי אף קבלה. אף אחת",
    "תודה על התזכורת על המקדמות, חסכת לי קנס",
    "שלחתי צילום של חשבונית, ותוך שעה היא כבר הייתה במערכת",
    "הקודם ענה לי אחרי שבוע. אתם עונים באותו יום",
    "הגעתי לפגישה בבנק עם מספרים מסודרים. הפקידה הייתה בהלם",
    "שאלתי שאלה שהתביישתי בה, ואף אחד לא גרם לי להרגיש ככה",
  ],
  names: [
    "מיכל, מעצבת גרפית",
    "נועה, מטפלת רגשית",
    "אורי, צלם אירועים",
    "יוסי, קבלן שיפוצים",
    "שירה, מאמנת כושר",
    "דני, יועץ ביטוח",
    "רותם, סטודיו לפילאטיס",
    "עמית, מתכנת עצמאי",
  ],
  videosTitle: "ושלושה לקוחות שהסכימו לספר מול מצלמה",
  videoNames: ["רונית, בעלת מספרה", "אבי, חשמלאי עצמאי", "ליאת, מאמנת אישית"],
  videoLines: [
    "איך נראה החודש הראשון אחרי שעברה אלינו",
    "על הקנס שכמעט קיבל, ולמה זה לא יקרה שוב",
    "מה השתנה כשהתחילה לקבל דוח כל חודש",
  ],
};

// שעות לתחושת צ'אט בלבד, דקורטיבי. בדף אמיתי הן חלק מצילום המסך
const TIMES = [
  "09:12",
  "13:47",
  "21:05",
  "08:30",
  "16:22",
  "11:58",
  "19:40",
  "10:15",
];

const CHAT_BG: CSSProperties = {
  background:
    "radial-gradient(color-mix(in oklab, var(--brand-accent) 22%, transparent) 1px, transparent 1.2px) 0 0 / 14px 14px, color-mix(in oklab, var(--brand-background) 82%, var(--brand-accent))",
};

/** כרטיס שנראה כמו צילום מסך של הודעה. בדף אמיתי: next/image של הצילום המטושטש */
function ChatCard({
  quote,
  name,
  time,
  hidden,
}: {
  quote: string;
  name: string;
  time: string;
  hidden?: boolean;
}) {
  return (
    <figure
      aria-hidden={hidden || undefined}
      className="flex w-[268px] shrink-0 flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_22px_45px_-28px_color-mix(in_oklab,var(--brand-secondary)_70%,transparent)] ring-1 ring-black/[0.06] md:w-[300px]"
    >
      <figcaption className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[15px] font-bold text-accent"
        >
          {name.trim().charAt(0)}
        </span>
        <span className="truncate text-[15px] font-semibold text-foreground">
          {name}
        </span>
      </figcaption>
      <div className="flex-1 px-3.5 pb-5 pt-4" style={CHAT_BG}>
        <blockquote className="relative w-fit max-w-[94%] rounded-2xl rounded-ss-[6px] bg-white px-4 py-2.5 shadow-[0_1px_1px_rgb(0_0_0/0.08)]">
          <p className="text-[17px] leading-[1.55] text-foreground">{quote}</p>
          <span
            aria-hidden="true"
            className="mt-0.5 block text-end text-xs text-foreground"
            style={{ opacity: 0.6 }}
            dir="ltr"
          >
            {time}
          </span>
        </blockquote>
      </div>
    </figure>
  );
}

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="currentColor"
    >
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

export default function ProofWall({ text }: { text: ProofWallText }) {
  const cards = text.quotes.map((q, i) => ({
    q,
    n: text.names[i] ?? "",
    time: TIMES[i % TIMES.length],
  }));
  const half = Math.ceil(cards.length / 2);
  const rows = [cards.slice(0, half), cards.slice(half)];

  return (
    <section
      aria-labelledby="gallery-proofwall-title"
      className="relative overflow-hidden bg-background py-24 md:py-32"
    >
      {/* הילה עדינה למעלה. דקורטיבי */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 70% 0%, color-mix(in oklab, var(--brand-accent) 16%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-6 px-5 md:grid-cols-[1.25fr_1fr] md:items-end md:gap-12 md:px-8">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[15px] font-semibold text-primary shadow-sm ring-1 ring-black/5">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5z" />
            </svg>
            <span>{text.eyebrow}</span>
          </p>
          <h2
            id="gallery-proofwall-title"
            className="mt-5 text-[clamp(2.1rem,5vw,3.6rem)] font-black leading-[1.1] text-balance text-foreground"
          >
            {text.title}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-lg leading-relaxed text-foreground/80 md:pb-2 md:text-xl">
            {text.sub}
          </p>
        </Reveal>
      </div>

      {/* הקיר: במחשב שתי שורות בכיוונים הפוכים, בטלפון שורה אחת עם כל ההודעות */}
      <Reveal variant="fade" duration={0.9} className="relative mt-14 md:mt-16">
        <div className="hidden space-y-2 md:block">
          {rows.map((row, r) => (
            <Marquee
              key={r}
              reverse={r === 1}
              seconds={r === 1 ? 75 : 65}
              className="py-3"
            >
              {row.map((c) => (
                <ChatCard key={c.q} quote={c.q} name={c.n} time={c.time} />
              ))}
              {/* השורה מוכפלת פעם נוספת כדי שתמלא גם מסך רחב. העותק מוסתר מקוראי מסך */}
              {row.map((c) => (
                <ChatCard
                  key={`${c.q}-again`}
                  quote={c.q}
                  name={c.n}
                  time={c.time}
                  hidden
                />
              ))}
            </Marquee>
          ))}
        </div>
        <div className="md:hidden">
          <Marquee seconds={60} className="py-3">
            {cards.map((c) => (
              <ChatCard key={c.q} quote={c.q} name={c.n} time={c.time} />
            ))}
          </Marquee>
        </div>
      </Reveal>

      {/* סרטונים: פוסטר + כפתור. בדף אמיתי הלחיצה טוענת את הסרטון */}
      <div className="relative mx-auto mt-20 max-w-6xl px-5 md:mt-24 md:px-8">
        <Reveal>
          <h3 className="text-2xl font-bold text-foreground md:text-[1.75rem]">
            {text.videosTitle}
          </h3>
        </Reveal>
        <Stagger
          role="list"
          gap={0.08}
          className="-mx-5 mt-8 flex snap-x snap-mandatory scroll-ps-5 gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0"
        >
          {text.videoNames.map((name, i) => (
            <StaggerItem
              key={name}
              role="listitem"
              className="w-[82%] shrink-0 snap-start md:w-auto"
            >
              <figure className="group relative grid overflow-hidden rounded-3xl bg-secondary shadow-[0_30px_60px_-35px_color-mix(in_oklab,var(--brand-secondary)_80%,transparent)]">
                <div className="[grid-area:1/1] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]">
                  <DemoImage
                    label={`פוסטר הסרטון: ${name}`}
                    ratio="4 / 5"
                    tone="dark"
                  />
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none z-10 [grid-area:1/1] bg-linear-to-t from-secondary via-secondary/40 to-transparent"
                />
                <figcaption className="z-20 flex items-end gap-4 self-end p-5 [grid-area:1/1] md:p-6">
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold text-white">
                      {name}
                    </span>
                    <span className="mt-1 block text-[17px] leading-snug text-white/85">
                      {text.videoLines[i]}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`צפייה בסרטון של ${name}`}
                    className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-secondary shadow-[0_10px_30px_-8px_var(--brand-accent)] ring-4 ring-white/15 transition-transform duration-150 after:absolute after:inset-0 after:content-[''] group-hover:scale-110 active:scale-95"
                  >
                    <PlayIcon />
                  </button>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
