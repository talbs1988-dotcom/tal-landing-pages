import type { Metadata } from "next";
import { site } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { editProps, t } from "@/lib/copyText";
import { ScrollToFormButton } from "@/components/ScrollToFormButton";
import { LeadForm } from "@/components/LeadForm";

// canonical ו-og:url של הדף הראשי
export const metadata: Metadata = pageMetadata(site, { path: "/" });

/*
 * דף דוגמה מינימלי. שלב העיצוב מחליף את התוכן כאן ומוסיף סקשנים
 * מ-components/sections/. הטופס (#lead-form) חייב להישאר בדף, פעם אחת בלבד.
 *
 * כל טקסט שיווקי מגיע מ-content/copy.json דרך t("מפתח"), ולכל אלמנט כזה
 * {...editProps("מפתח")} כדי שמצב העריכה יוכל לשנות אותו. לא מקלידים טקסט שיווקי ב-TSX.
 */
export default function HomePage() {
  return (
    <>
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1
            {...editProps("hero.title")}
            className="text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl"
          >
            {t("hero.title")}
          </h1>
          <p
            {...editProps("hero.subtitle")}
            className="mx-auto mt-6 max-w-2xl text-lg text-pretty opacity-85 sm:text-xl"
          >
            {t("hero.subtitle")}
          </p>
          <ScrollToFormButton className="mt-10 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-white shadow-sm transition hover:brightness-110 active:brightness-95">
            {/* הטקסט ב-span: כך עורכים אותו בלי ללחוץ על הכפתור עצמו */}
            <span {...editProps("hero.cta")}>{t("hero.cta")}</span>
          </ScrollToFormButton>
        </div>
      </section>

      {/* טופס הלידים. id="lead-form" נמצא על הטופס עצמו, והכפתורים בדף גוללים אליו */}
      <section aria-labelledby="lead-form-title" className="px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <h2
            id="lead-form-title"
            {...editProps("form.title")}
            className="mb-6 text-center text-2xl font-semibold"
          >
            {t("form.title")}
          </h2>
          <LeadForm />
        </div>
      </section>
    </>
  );
}
