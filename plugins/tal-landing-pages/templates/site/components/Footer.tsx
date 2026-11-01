import Link from "next/link";
import { site } from "@/site.config";
import { isFilled } from "@/lib/todo";
import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";

/*
 * הפוטר. כל הפרטים מגיעים מ-site.config.ts. לא מקלידים כאן פרטי עסק.
 * הקישורים המשפטיים חובה ואסור להוריד אותם.
 */

const ID_LABEL: Record<string, string> = {
  "עוסק פטור": "מס' עוסק",
  "עוסק מורשה": "מס' עוסק",
  'חברה בע"מ': "ח.פ.",
  עמותה: "מס' עמותה",
};

const linkClass =
  "underline-offset-4 hover:underline focus-visible:underline inline-flex min-h-11 items-center";

export function Footer() {
  const { business } = site;
  const idLabel = ID_LABEL[business.type] ?? "מס' עוסק";
  const addressParts = [
    business.address.street,
    business.address.city,
    business.address.postalCode,
  ];
  // כל השדות ריקים = אין כתובת לפרסום. TODO נשאר גלוי
  const address = addressParts.every((p) => p.trim() === "")
    ? ""
    : addressParts.filter((p) => p.trim() !== "").join(", ");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-black/10 bg-white/60 px-4 py-10 text-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <nav aria-label="מידע משפטי ויצירת קשר">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            <li>
              <Link href="/accessibility" className={linkClass}>
                הצהרת נגישות
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkClass}>
                תקנון ותנאי שימוש
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClass}>
                מדיניות פרטיות
              </Link>
            </li>
            <li>
              <Link href="/data-deletion" className={linkClass}>
                מחיקת נתונים
              </Link>
            </li>
            <li>
              <CookiePreferencesButton
                className={`${linkClass} cursor-pointer`}
              />
            </li>
            <li>
              {isFilled(business.email) ? (
                <a href={`mailto:${business.email}`} className={linkClass}>
                  יצירת קשר
                </a>
              ) : (
                <span className="inline-flex min-h-11 items-center">
                  יצירת קשר: {business.email}
                </span>
              )}
            </li>
          </ul>
        </nav>

        <div className="space-y-1 opacity-80">
          <p>
            {business.legalName} · {business.type} · {idLabel}{" "}
            {business.idNumber}
          </p>
          {address && <p>{address}</p>}
          <p>
            © {year} {business.displayName}
          </p>
        </div>
      </div>
    </footer>
  );
}
