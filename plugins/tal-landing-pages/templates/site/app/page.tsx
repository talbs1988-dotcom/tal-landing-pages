import type { Metadata } from "next";
import { site } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { ScrollToFormButton } from "@/components/ScrollToFormButton";

// canonical ו-og:url של הדף הראשי
export const metadata: Metadata = pageMetadata(site, { path: "/" });

/*
 * דף דוגמה מינימלי. שלב העיצוב מחליף את התוכן כאן ומוסיף סקשנים
 * מ-components/sections/. הטופס (#lead-form) חייב להישאר בדף, פעם אחת בלבד.
 */
export default function HomePage() {
  return (
    <>
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
            {site.page.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty opacity-85 sm:text-xl">
            {site.page.description}
          </p>
          <ScrollToFormButton className="mt-10 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-white shadow-sm transition hover:brightness-110 active:brightness-95">
            {site.page.ctaLabel}
          </ScrollToFormButton>
        </div>
      </section>

      {/* מקום לטופס הלידים. הטופס האמיתי (LeadForm) נכנס כאן. */}
      <section
        id="lead-form"
        tabIndex={-1}
        aria-labelledby="lead-form-title"
        className="scroll-mt-6 px-4 py-16"
      >
        <div className="mx-auto max-w-xl rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
          <h2 id="lead-form-title" className="text-2xl font-semibold">
            השארת פרטים
          </h2>
          <p className="mt-3 opacity-75">הטופס יופיע כאן.</p>
        </div>
      </section>
    </>
  );
}
