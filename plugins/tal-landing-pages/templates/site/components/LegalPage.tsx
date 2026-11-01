import type { ReactNode } from "react";
import { site } from "@/site.config";
import { isFilled } from "@/lib/todo";
import {
  display,
  effectiveCollects,
  formatAddress,
  formatHebrewDate,
  hasAddress,
  idLabel,
  parseIsoDate,
  visibleSections,
  type SectionDef,
} from "@/lib/legal";

/*
 * המבנה האחיד של כל הדפים המשפטיים: כותרת, "עודכן לאחרונה" מה-config,
 * תוכן עניינים עם קישורים לסעיפים, והסעיפים עצמם.
 * הטקסטים עצמם בדפים (app/privacy וכו'). פרטי העסק רק מ-site.config.ts.
 */

export type LegalSectionContent = {
  id: string;
  title: string;
  body: ReactNode;
};

/** מה האתר אוסף בפועל: ה-config ועוד הפיקסל אם הוא מוגדר בסביבה (ראו effectiveCollects) */
export function siteCollects() {
  return effectiveCollects(site.collects, {
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    META_PIXEL_ID: process.env.META_PIXEL_ID,
    META_CAPI_TOKEN: process.env.META_CAPI_TOKEN,
  });
}

/** מה קובע אילו סעיפים מופיעים באתר הזה */
export function sectionContext() {
  return { ...siteCollects(), hasAddress: hasAddress(site.business.address) };
}

/** הסעיפים שמופיעים בפועל, כל אחד עם התוכן שלו */
export function buildSections<const T extends readonly SectionDef[]>(
  defs: T,
  bodies: Record<T[number]["id"], ReactNode>,
): LegalSectionContent[] {
  return visibleSections(defs, sectionContext()).map((d) => ({
    id: d.id,
    title: d.title,
    body: bodies[d.id as T[number]["id"]],
  }));
}

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: ReactNode;
  sections: LegalSectionContent[];
}) {
  const updated = site.page.lastUpdated;
  const date = parseIsoDate(updated);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <header>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base">
          עודכן לאחרונה:{" "}
          {date ? (
            <time dateTime={updated.trim()}>{formatHebrewDate(updated)}</time>
          ) : (
            formatHebrewDate(updated)
          )}
        </p>
        {intro && <div className="mt-6 space-y-4 text-lg">{intro}</div>}
      </header>

      <nav
        aria-labelledby="toc-title"
        className="mt-8 rounded-xl border border-black/15 bg-white p-5"
      >
        <h2 id="toc-title" className="text-lg font-semibold">
          תוכן העניינים
        </h2>
        <ol className="mt-3 list-decimal space-y-1 ps-6">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex min-h-8 items-center text-primary underline underline-offset-4"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="legal-body mt-10 space-y-10">
        {sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            aria-labelledby={`${s.id}-title`}
            className="scroll-mt-6"
          >
            <h2 id={`${s.id}-title`} className="text-2xl font-semibold">
              {s.title}
            </h2>
            <div className="mt-3 space-y-3">{s.body}</div>
          </section>
        ))}
      </div>
    </article>
  );
}

/** רשימה עם תבליטים, באותו עיצוב בכל הדפים */
export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 ps-6">{children}</ul>;
}

/** מייל כקישור mailto אם מולא, אחרת TODO גלוי */
export function EmailLink({ email }: { email: string }) {
  if (!isFilled(email)) return <>{display(email)}</>;
  return (
    <a
      href={`mailto:${email.trim()}`}
      className="text-primary underline underline-offset-4"
      dir="ltr"
    >
      {email.trim()}
    </a>
  );
}

/** טלפון כקישור tel אם מולא, אחרת TODO גלוי */
export function PhoneLink({ phone }: { phone: string }) {
  if (!isFilled(phone)) return <>{display(phone)}</>;
  const tel = phone.replace(/[^\d+]/g, "");
  return (
    <a
      href={`tel:${tel}`}
      className="text-primary underline underline-offset-4"
      dir="ltr"
    >
      {phone.trim()}
    </a>
  );
}

/** פרטי העסק המלאים, מה-config. כתובת מופיעה רק אם יש */
export function BusinessDetails() {
  const b = site.business;
  const address = formatAddress(b.address);
  const rows: [string, ReactNode][] = [
    ["שם העסק", display(b.legalName)],
    ["השם המסחרי", display(b.displayName)],
    ["סוג העסק", display(b.type)],
    [idLabel(b.type), display(b.idNumber)],
    ...(address ? [["כתובת", address] as [string, ReactNode]] : []),
    ["טלפון", <PhoneLink key="p" phone={b.phone} />],
    ["מייל", <EmailLink key="e" email={b.email} />],
  ];
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-xl border border-black/15 bg-white p-5">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-semibold">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** שורת יצירת קשר קצרה: מייל וטלפון */
export function ContactLine() {
  return (
    <p>
      במייל <EmailLink email={site.business.email} /> או בטלפון{" "}
      <PhoneLink phone={site.business.phone} />.
    </p>
  );
}
