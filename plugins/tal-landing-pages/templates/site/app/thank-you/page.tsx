import type { Metadata } from "next";
import Link from "next/link";
import { noindex } from "@/lib/seo";
import { isUuid } from "@/lib/lead";
import { editProps, t } from "@/lib/copyText";
import { LeadPixelEvent } from "@/components/LeadPixelEvent";

// דף התודה לא נכנס לגוגל
export const metadata: Metadata = {
  title: "תודה",
  ...noindex,
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { e } = await searchParams;
  // מזהה האירוע מהטופס. משמש את אירוע ה-Lead בפיקסל (מניעת כפילות מול השרת)
  const eventId = typeof e === "string" && isUuid(e) ? e : undefined;

  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        {/* הטקסטים מ-content/copy.json. "מה קורה עכשיו" הוא thankYou.body */}
        <h1 {...editProps("thankYou.title")} className="text-3xl font-bold sm:text-4xl">
          {t("thankYou.title")}
        </h1>
        <p {...editProps("thankYou.body")} className="mt-6 text-lg text-pretty opacity-85">
          {t("thankYou.body")}
        </p>

        {/* אירוע Lead בפיקסל: פעם אחת, רק עם הסכמה לשיווק, עם אותו eventId שנשלח מהשרת */}
        <LeadPixelEvent eventId={eventId} />

        <Link
          href="/"
          className="mt-10 inline-flex min-h-12 items-center justify-center rounded-lg border border-black/20 bg-white px-6 py-3 font-semibold shadow-sm hover:bg-black/5"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </section>
  );
}
