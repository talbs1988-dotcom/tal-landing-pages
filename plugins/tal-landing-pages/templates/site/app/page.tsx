import { site } from "@/site.config";
import { ScrollToFormButton } from "@/components/ScrollToFormButton";
import { LeadForm } from "@/components/LeadForm";

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

      {/* טופס הלידים. id="lead-form" נמצא על הטופס עצמו, והכפתורים בדף גוללים אליו */}
      <section aria-labelledby="lead-form-title" className="px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <h2
            id="lead-form-title"
            className="mb-6 text-center text-2xl font-semibold"
          >
            השארת פרטים
          </h2>
          <LeadForm />
        </div>
      </section>
    </>
  );
}
