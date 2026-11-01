import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { site } from "@/site.config";
import {
  DELETION_SECTIONS,
  collectedFields,
  display,
  listHe,
} from "@/lib/legal";
import {
  Bullets,
  EmailLink,
  LegalPage,
  PhoneLink,
  buildSections,
} from "@/components/LegalPage";

// כותרת, תיאור, canonical ו-og:url משלו (lib/seo.ts)
export const metadata: Metadata = pageMetadata(site, {
  path: "/data-deletion",
  title: "מחיקת נתונים",
  description: "איך מבקשים למחוק את הפרטים שמסרתם באתר, ומה נמחק.",
});

const link = "text-primary underline underline-offset-4";

export default function DataDeletionPage() {
  const { business, form, legal } = site;
  const name = display(business.displayName);
  const fields = listHe(collectedFields(form).map((f) => f.label));
  const p = legal.processors;
  const places = [
    "גיבוי הפניות של האתר",
    ...(p.automation !== ""
      ? [`כלי האוטומציה (${display(p.automation)})`]
      : []),
    ...(p.mailing !== "" ? [`מערכת הדיוור (${display(p.mailing)})`] : []),
    ...(p.crm !== "" ? [`מערכת ניהול הלקוחות (${display(p.crm)})`] : []),
  ];

  const sections = buildSections(DELETION_SECTIONS, {
    how: (
      <>
        <p>
          שולחים בקשה במייל <EmailLink email={business.email} />, או מתקשרים{" "}
          <PhoneLink phone={business.phone} />. לא צריך לנמק.
        </p>
        <p>
          כתבו &quot;בקשה למחיקת מידע&quot;, ואת הפרטים שמסרתם בטופס ({fields}),
          כדי שנמצא אותם. ייתכן שנבקש לוודא שהבקשה באמת מכם, למשל בתשובה מאותה
          כתובת מייל.
        </p>
      </>
    ),
    what: (
      <>
        <p>נמחק את הפרטים שלכם מכל המקומות שבהם הם שמורים אצלנו:</p>
        <Bullets>
          {places.map((place) => (
            <li key={place}>{place}</li>
          ))}
        </Bullets>
        <p>כשהמחיקה תסתיים, נשלח לכם אישור.</p>
      </>
    ),
    kept: (
      <p>
        מידע שהחוק מחייב אותנו לשמור (למשל חשבוניות וקבלות, אם רכשתם מאיתנו)
        יישמר רק לתקופה שהחוק קובע, ולא ישמש לשום מטרה אחרת. ייתכן שנשאיר את
        כתובת המייל ברשימת &quot;לא לשלוח&quot;, רק כדי לוודא שלא תקבלו מאיתנו
        דיוור שוב.
      </p>
    ),
    time: (
      <p>
        נטפל בבקשה תוך {display(legal.deletionTimeframe)} מהיום שקיבלנו אותה.
      </p>
    ),
    meta: (
      <>
        <p>
          אם אישרתם עוגיות שיווק, הפיקסל של מטא שלח למטא מידע על הביקור שלכם
          באתר. אם סימנתם בטופס הסכמה לדיוור, דיווחנו למטא גם על ההרשמה, עם
          המייל והטלפון בהצפנה חד-כיוונית (hash). את המידע הזה מטא שומרת אצלה,
          לפי{" "}
          <a
            href="https://www.facebook.com/privacy/policy/"
            className={link}
            rel="noopener"
            target="_blank"
          >
            מדיניות הפרטיות של מטא
            <span className="sr-only"> (נפתח בחלון חדש)</span>
          </a>
          .
        </p>
        <Bullets>
          <li>
            כדי לראות ולנתק את המידע הזה: בחשבון הפייסבוק או האינסטגרם, במרכז
            החשבונות, בהגדרה &quot;הפעילות שלך מחוץ לטכנולוגיות של Meta&quot;.
          </li>
          <li>
            כדי שהאתר יפסיק לשלוח למטא מידע על הגלישה שלכם: לחצו על &quot;העדפות
            עוגיות&quot; בתחתית הדף ובטלו את ההסכמה לעוגיות שיווק.
          </li>
        </Bullets>
      </>
    ),
    mailing: (
      <p>
        רוצים רק להפסיק לקבל מאיתנו הודעות? לחצו על קישור ההסרה שבכל הודעה, או
        כתבו לנו. זה לא מוחק את שאר הפרטים. אם תרצו גם מחיקה, שלחו בקשה כמו
        שמוסבר למעלה. עוד על המידע שאנחנו אוספים, ב
        <Link href="/privacy" className={link}>
          מדיניות הפרטיות
        </Link>
        .
      </p>
    ),
  });

  return (
    <>
      {/*
        טיוטה כללית לבדיקת עורך דין. לא חוות דעת משפטית.
        ההערה הזו לא מוצגת לגולשים. כל פרט עסקי מגיע מ-site.config.ts.
        מטא דורשת כתובת לדף הזה בהגדרות האפליקציה/הפיקסל: <url>/data-deletion
      */}
      <LegalPage
        title="מחיקת נתונים"
        intro={
          <p>
            אפשר לבקש בכל רגע ש{name} ימחק את הפרטים שמסרתם באתר. כאן מוסבר איך.
          </p>
        }
        sections={sections}
      />
    </>
  );
}
