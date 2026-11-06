/*
 * מתכון: מחיר ודחיפות. מתי: אחרי ההוכחות, כשהקורא כבר רוצה ונשארה לו השאלה "כמה ומה אני מקבל".
 * מה עובד: סקשן כהה שעוצר את הגלילה, כרטיס אחד עם מסגרת שזורם בה אור, חמישה דברים שמקבלים,
 * מחיר אחד ברור, ודחיפות רק אם היא נכונה (מספר המקומות האמיתי). כפתור אחד, ומשפט ביטחון מתחתיו.
 * בדף אמיתי: כל טקסט מ-t("offer.<שדה>") עם {...editProps("offer.<שדה>")} על האלמנט שלו בלבד:
 * offer.eyebrow, offer.title, offer.sub, offer.plan, offer.planNote, offer.item1 עד offer.item5,
 * offer.oldPrice, offer.price, offer.priceNote, offer.urgency, offer.guarantee. הכפתור הוא CtaButton, לא DemoCta.
 * אין מחיר בקופי? שורת המחיר נמחקת (לא כותבים מחיר או "ללא עלות" שלא אושרו), וגם oldPrice.
 */
import type { CSSProperties } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { DemoCta } from "../_kit/DemoCta";

export type PriceOfferText = {
  eyebrow: string;
  title: string;
  sub: string;
  plan: string;
  planNote: string;
  items: string[];
  oldPrice: string;
  price: string;
  priceNote: string;
  urgency: string;
  cta: string;
  guarantee: string;
};

export const demo: PriceOfferText = {
  eyebrow: "ההצעה",
  title: "כל הנהלת החשבונות, במחיר קבוע לכל השנה",
  sub: "בלי חיוב לפי שעה ובלי הפתעות בסוף החודש. יודעים מראש כמה זה עולה ומה מקבלים.",
  plan: "חבילת עצמאי",
  planNote: "לעוסק פטור או מורשה, עם או בלי עובדים",
  items: [
    "דוח חודשי על הכנסות והוצאות, בשפה פשוטה",
    "הגשת מע״מ ומקדמות בזמן, בלי שתצטרך לזכור",
    "קליטת קבלות מצילום בוואטסאפ",
    "דוח שנתי והצהרת הון כלולים במחיר",
    "תשובה לשאלות באותו יום עבודה",
  ],
  oldPrice: "490 ₪",
  price: "390 ₪",
  priceNote: "לחודש, בשנה הראשונה. כולל מע״מ.",
  urgency: "נשארו 3 מקומות לחודש הזה",
  cta: "לשיחת היכרות קצרה",
  guarantee: "אחרי החודש הראשון זה לא מתאים? מפסיקים, בלי קנס יציאה.",
};

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mt-0.5 size-5 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6l7-3z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </svg>
  );
}

export default function PriceOffer({ text }: { text: PriceOfferText }) {
  const cardBg = {
    ["--card-bg" as string]:
      "color-mix(in oklab, var(--brand-secondary) 88%, white)",
  } as CSSProperties;
  return (
    <section data-tone="dark"
      aria-labelledby="gallery-priceoffer-title"
      className="relative isolate overflow-hidden bg-secondary px-5 py-24 text-white md:px-8 md:py-32"
    >
      {/* רקע: הילה זהובה מאחורי הכרטיס ורשת דקה. דקורטיבי */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 50% 62%, color-mix(in oklab, var(--brand-accent) 20%, transparent), transparent 70%), radial-gradient(ellipse 40% 30% at 50% 0%, color-mix(in oklab, var(--brand-primary) 35%, transparent), transparent 70%)",
          }}
        />
        <div className="aurora-grid absolute inset-0" style={{ opacity: 0.5 }} />
      </div>

      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-1.5 text-base font-semibold text-accent ring-1 ring-accent/30">
          {text.eyebrow}
        </p>
        <h2
          id="gallery-priceoffer-title"
          className="mt-5 text-[clamp(2.1rem,5.2vw,3.75rem)] font-black leading-[1.1] text-balance"
        >
          {text.title}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl">
          {text.sub}
        </p>
      </Reveal>

      <Reveal
        variant="scale"
        delay={0.1}
        amount={0.15}
        className="relative mx-auto mt-14 max-w-5xl md:mt-16"
      >
        {/* הילה רכה מתחת לכרטיס */}
        <div
          aria-hidden="true"
          className="absolute inset-x-[8%] -bottom-10 top-[20%] -z-10 rounded-full blur-3xl"
          style={{
            background:
              "color-mix(in oklab, var(--brand-accent) 28%, transparent)",
          }}
        />
        <div
          className="border-flow grid overflow-hidden rounded-[28px] shadow-[0_40px_120px_-40px_rgb(0_0_0/0.8)] lg:grid-cols-[1.25fr_1fr]"
          style={cardBg}
        >
          {/* מה מקבלים */}
          <div className="p-7 md:p-11">
            <h3 className="text-2xl font-bold md:text-[1.75rem]">
              {text.plan}
            </h3>
            <p className="mt-2 text-[17px] leading-relaxed text-white/70">
              {text.planNote}
            </p>
            <div
              aria-hidden="true"
              className="mt-7 h-px bg-linear-to-l from-accent/50 via-white/10 to-transparent"
            />
            <Stagger
              role="list"
              gap={0.08}
              delay={0.25}
              className="mt-7 space-y-4"
            >
              {text.items.map((item) => (
                <StaggerItem
                  key={item}
                  role="listitem"
                  variant="slide-start"
                  className="flex items-start gap-3.5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-accent ring-1 ring-accent/50"
                    style={{
                      background:
                        "color-mix(in oklab, var(--brand-accent) 16%, transparent)",
                    }}
                  >
                    <CheckIcon />
                  </span>
                  <span className="text-[17px] leading-relaxed text-white/90 md:text-lg">
                    {item}
                  </span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          {/* המחיר */}
          <div className="flex flex-col border-t border-white/10 bg-white/[0.03] p-7 md:p-11 lg:border-s lg:border-t-0">
            <p
              className="inline-flex items-center gap-2.5 self-start rounded-full px-4 py-2 text-base font-semibold text-accent ring-1 ring-accent/35"
              style={{
                background:
                  "color-mix(in oklab, var(--brand-accent) 12%, transparent)",
              }}
            >
              <span aria-hidden="true" className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent [animation-duration:2s]" style={{ opacity: 0.6 }} />
                <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
              </span>
              <span>{text.urgency}</span>
            </p>

            <div className="mt-8 lg:mt-auto lg:pt-10">
              {text.oldPrice && (
                <p className="text-xl font-semibold text-white/55 line-through decoration-accent/80 decoration-2">
                  <span className="sr-only">במקום </span>
                  {text.oldPrice}
                </p>
              )}
              <p className="text-shine mt-1 text-[clamp(3.25rem,9vw,4.75rem)] font-black leading-none">
                {text.price}
              </p>
              <p className="mt-3 text-[17px] text-white/70">{text.priceNote}</p>
            </div>

            <DemoCta className="mt-8 w-full">{text.cta}</DemoCta>

            <p className="mt-5 flex items-start gap-2.5 text-base leading-relaxed text-white/70">
              <ShieldIcon />
              <span>{text.guarantee}</span>
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
