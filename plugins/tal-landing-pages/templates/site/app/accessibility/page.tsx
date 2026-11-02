import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/site.config";
import {
  ACCESSIBILITY_SECTIONS,
  display,
  formatHebrewDate,
  parseIsoDate,
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
  path: "/accessibility",
  title: "הצהרת נגישות",
  description: "מה עשינו כדי שהאתר יהיה נגיש, ואיך פונים אלינו בנושא נגישות.",
});

export default function AccessibilityPage() {
  const { business, legal, page } = site;
  const name = display(business.displayName);
  const coord = business.accessibilityCoordinator;
  const date = parseIsoDate(page.lastUpdated);

  const sections = buildSections(ACCESSIBILITY_SECTIONS, {
    commitment: (
      <p>
        אנחנו רוצים שכל אחד יוכל להשתמש באתר, כולל אנשים עם מוגבלות. האתר הונגש
        לפי חוק שוויון זכויות לאנשים עם מוגבלות, התשנ&quot;ח-1998, ותקנות שוויון
        זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג-2013.
      </p>
    ),
    standard: (
      <p>
        התאמות הנגישות נעשו לפי התקן הישראלי ת&quot;י 5568, שמבוסס על הנחיות
        WCAG 2.0 של ארגון W3C, ברמה AA.
      </p>
    ),
    done: (
      <Bullets>
        <li>האתר בעברית ומוגדר מימין לשמאל, גם עבור קוראי מסך.</li>
        <li>אפשר לנווט בכל האתר במקלדת בלבד, והרכיב שבפוקוס מסומן בבירור.</li>
        <li>בתחילת כל דף יש קישור &quot;דילוג לתוכן הראשי&quot;.</li>
        <li>
          הכותרות מסודרות לפי היררכיה, ואזורי הדף מסומנים (תוכן ראשי, תחתית
          הדף).
        </li>
        <li>הצבעים עומדים ביחס ניגודיות של רמה AA לפחות בטקסט רגיל.</li>
        <li>
          לכל שדה בטופס יש תווית, והודעות השגיאה כתובות במילים ומוקראות לקוראי
          מסך.
        </li>
        <li>לתמונות שמעבירות מידע יש טקסט חלופי.</li>
        <li>האתר מתאים את עצמו לכל גודל מסך ולהגדלה בדפדפן.</li>
        <li>
          האתר מכבד את הגדרת &quot;הפחתת תנועה&quot; של מערכת ההפעלה, ומפסיק
          אנימציות.
        </li>
      </Bullets>
    ),
    widget: (
      <>
        <p>
          בפינה השמאלית התחתונה של כל דף יש כפתור נגישות. אפשר בו להגדיל את
          הטקסט (שלושה גדלים), להפעיל ניגודיות גבוהה, להדגיש קישורים ולעצור
          אנימציות. הבחירה נשמרת בדפדפן שלכם.
        </p>
        <p>הכפתור הוא עזר נוסף. הוא לא מחליף את ההנגשה של האתר עצמו.</p>
      </>
    ),
    limitations: (
      <p>
        למרות המאמצים, ייתכן שחלקים באתר עדיין לא נגישים במלואם. מה שידוע לנו:{" "}
        {display(legal.accessibilityLimitations)}. נתקלתם בבעיה? ספרו לנו בפרטים
        שבהמשך, ונטפל בה.
      </p>
    ),
    physical: <p>{display(legal.physicalAccessibility)}</p>,
    coordinator: (
      <>
        <p>לפניות, שאלות והצעות בנושא נגישות אפשר לפנות לרכז/ת הנגישות:</p>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[max-content_1fr] rounded-xl border border-black/15 bg-white p-5">
          <dt className="font-semibold">שם</dt>
          <dd className="min-w-0">{display(coord.name)}</dd>
          <dt className="font-semibold">טלפון</dt>
          <dd className="min-w-0">
            <PhoneLink phone={coord.phone} />
          </dd>
          <dt className="font-semibold">מייל</dt>
          <dd className="min-w-0">
            <EmailLink email={coord.email} />
          </dd>
        </dl>
        <p>
          כדי שנוכל לעזור מהר, כתבו מה הבעיה, באיזה דף נתקלתם בה, ובאיזה דפדפן
          או טכנולוגיה מסייעת השתמשתם.
        </p>
      </>
    ),
    updated: (
      <p>
        ההצהרה עודכנה ב-
        {date ? (
          <time dateTime={page.lastUpdated.trim()}>
            {formatHebrewDate(page.lastUpdated)}
          </time>
        ) : (
          formatHebrewDate(page.lastUpdated)
        )}
        .
      </p>
    ),
  });

  return (
    <>
      {/*
        טיוטה כללית לבדיקת עורך דין ומורשה/ת נגישות. לא חוות דעת משפטית.
        ההערה הזו לא מוצגת לגולשים. כל פרט עסקי מגיע מ-site.config.ts.
        רשימת "מה עשינו" נכונה לתבנית כמו שהיא. אם שלב העיצוב מוסיף רכיב
        שלא עומד בה (וידאו בלי כתוביות, למשל), לעדכן כאן וב-legal.accessibilityLimitations.
      */}
      <LegalPage
        slug="accessibility"
        title="הצהרת נגישות"
        intro={<p>ההצהרה מתארת את הנגישות של האתר של {name}.</p>}
        sections={sections}
      />
    </>
  );
}
