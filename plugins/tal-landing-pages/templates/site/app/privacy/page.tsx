import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { site } from "@/site.config";
import {
  collectedFields,
  display,
  listHe,
  PRIVACY_SECTIONS,
} from "@/lib/legal";
import {
  Bullets,
  BusinessDetails,
  ContactLine,
  LegalPage,
  buildSections,
  siteCollects,
} from "@/components/LegalPage";

// כותרת, תיאור, canonical ו-og:url משלו (lib/seo.ts)
export const metadata: Metadata = pageMetadata(site, {
  path: "/privacy",
  title: "מדיניות פרטיות",
  description: "איזה מידע נאסף באתר, למה, למי הוא מועבר ומה הזכויות שלכם.",
});

const link = "text-primary underline underline-offset-4";

export default function PrivacyPage() {
  const { business, form, legal } = site;
  // כולל את הפיקסל אם הוא מוגדר בסביבה, גם אם collects.pixel לא סומן
  const collects = siteCollects();
  const name = display(business.displayName);
  const fields = collectedFields(form);
  const required = fields.filter((f) => f.required).map((f) => f.label);
  const optional = fields.filter((f) => !f.required).map((f) => f.label);
  const p = legal.processors;

  const sections = buildSections(PRIVACY_SECTIONS, {
    controller: (
      <>
        <p>
          האחראי על המידע שנאסף באתר (&quot;בעל השליטה במאגר&quot;, בלשון חוק
          הגנת הפרטיות) הוא:
        </p>
        <BusinessDetails />
        <p>בכל שאלה על המידע שלכם אפשר לפנות אלינו בפרטים האלה.</p>
      </>
    ),
    collected: (
      <>
        <p>
          כשממלאים את הטופס באתר, אנחנו מקבלים{" "}
          {listHe(fields.map((f) => f.label))}, ואת התשובה שלכם לשאלה אם אתם
          מסכימים לקבל דיוור.
        </p>
        <Bullets>
          <li>
            <strong>למה:</strong> כדי לחזור אליכם בעניין הפנייה ולשלוח לכם את מה
            שביקשתם.
          </li>
          <li>
            <strong>דיוור:</strong> רק אם סימנתם בעצמכם את תיבת ההסכמה, נשלח לכם
            גם עדכונים ותוכן שיווקי. התיבה לא מסומנת מראש. אפשר לבטל את ההסכמה
            בכל רגע, בקישור ההסרה שבכל הודעה או בפנייה אלינו. בלי ההסכמה הזו לא
            נשלח לכם דיוור שיווקי.
          </li>
          <li>
            <strong>האם חובה למסור:</strong> אין חובה לפי חוק למסור לנו את
            הפרטים, והמסירה תלויה ברצונכם. בטופס, {listHe(required)} הם שדות
            חובה
            {optional.length > 0 && <>, ו{listHe(optional)} רשות</>}.
          </li>
          <li>
            <strong>מה קורה אם לא מוסרים:</strong> בלי שדות החובה לא נוכל לקבל
            את הפנייה ולחזור אליכם. זה הכול. אפשר תמיד לפנות אלינו גם בדרכים
            שבסעיף יצירת קשר.
          </li>
        </Bullets>
      </>
    ),
    automatic: (
      <>
        <p>
          כמו בכל אתר, ספקית האחסון שלנו (Vercel) רושמת פרטים טכניים על כל בקשה
          לאתר, למשל כתובת IP, שעה וסוג הדפדפן, לצורכי אבטחה ותפעול.
        </p>
        {collects.form && (
          <>
            <p>
              כששולחים את הטופס, נשמר איתו גם מאיפה הגעתם: פרמטרים בקישור (כמו
              utm_source ו-fbclid), הדף שממנו הגעתם, הכתובת שבה נחתתם וסוג
              הדפדפן. כך אנחנו יודעים אילו פרסומים עובדים.
            </p>
            <p>
              כתובת ה-IP שלכם לא נשמרת אצלנו עם הפנייה. השרת משתמש בה לזמן קצר
              כדי לחסום הצפה של בקשות.
            </p>
          </>
        )}
      </>
    ),
    recipients: (
      <>
        <p>
          אנחנו לא מוכרים את המידע שלכם. כדי לטפל בפנייה, המידע עובר לספקים
          שנותנים לנו שירות, ורק לצורך המטרות שבמדיניות הזו:
        </p>
        <Bullets>
          <li>אחסון האתר וגיבוי הפניות: Vercel</li>
          {p.automation !== "" && (
            <li>
              העברת הפניות בין המערכות (אוטומציה): {display(p.automation)}
            </li>
          )}
          {p.mailing !== "" && <li>מערכת הדיוור: {display(p.mailing)}</li>}
          {p.crm !== "" && <li>ניהול לקוחות: {display(p.crm)}</li>}
          {collects.pixel && (
            <li>מטא (פייסבוק ואינסטגרם), למדידת פרסום. פרטים בהמשך.</li>
          )}
          {collects.analytics && (
            <li>ניתוח תנועה באתר: {display(p.analytics)}</li>
          )}
        </Bullets>
        <p>
          נמסור מידע גם לרשות מוסמכת, אם החוק או צו של בית משפט יחייבו אותנו.
        </p>
      </>
    ),
    cookies: (
      <>
        <p>האתר שומר בדפדפן שלכם (בעוגיות ובאחסון המקומי) רק את מה שצריך:</p>
        <Bullets>
          <li>
            <strong>חיוני:</strong> הבחירה שלכם בבאנר העוגיות, והעדפות הנגישות
            אם שיניתם אותן. הם נשמרים רק אצלכם בדפדפן, ותמיד פעילים.
          </li>
          {collects.analytics && (
            <li>
              <strong>ניתוח:</strong> נטען רק אם אישרתם עוגיות ניתוח.
            </li>
          )}
          {collects.pixel && (
            <li>
              <strong>שיווק:</strong> הפיקסל של מטא. נטען רק אם אישרתם עוגיות
              שיווק.
            </li>
          )}
        </Bullets>
        <p>
          אפשר לשנות את הבחירה בכל רגע בכפתור &quot;העדפות עוגיות&quot; שבתחתית
          כל דף, וגם למחוק עוגיות בהגדרות הדפדפן.
        </p>
      </>
    ),
    pixel: (
      <>
        <p>
          אם אישרתם עוגיות שיווק, האתר טוען את הפיקסל של מטא (Meta Platforms).
          הוא מדווח למטא על הביקור בדף ועל השארת פרטים, כדי שנוכל למדוד את
          המודעות שלנו ולהציג אותן לאנשים שהן רלוונטיות להם. מטא מקבלת בין היתר
          את כתובת ה-IP, את סוג הדפדפן ומזהה עוגייה.
        </p>
        <p>
          אם סימנתם בטופס הסכמה לדיוור, השרת שלנו מדווח למטא גם על ההרשמה עצמה
          (Conversions API). הדיווח כולל את המייל והטלפון שלכם בהצפנה חד-כיוונית
          (hash), את כתובת ה-IP ואת סוג הדפדפן. מטא משתמשת בהם כדי לשייך את
          ההרשמה למודעה שראיתם.
        </p>
        <p>
          בלי הסכמה לעוגיות שיווק, הפיקסל לא נטען בכלל. בלי הסכמה לדיוור, ההרשמה
          לא מדווחת למטא מהשרת. מה שמטא מקבלת כפוף ל
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
      </>
    ),
    analytics: (
      <p>
        אם אישרתם עוגיות ניתוח, האתר משתמש ב-{display(p.analytics)} כדי להבין
        כמה אנשים מבקרים בדף ומה הם עושים בו. בלי ההסכמה הזו הכלי לא נטען.
      </p>
    ),
    abroad: (
      <p>
        חלק מהספקים שלנו שומרים מידע בשרתים מחוץ לישראל, למשל בארצות הברית
        ובאירופה. כך Vercel (אחסון האתר והגיבוי)
        {collects.pixel && ", מטא"}, וייתכן שגם חלק מהכלים שברשימה למעלה. העברה
        כזו נעשית לפי תקנות הגנת הפרטיות (העברת מידע למאגרי מידע שמחוץ לגבולות
        המדינה), התשס&quot;א-2001.
      </p>
    ),
    retention: (
      <p>
        אנחנו שומרים את פרטי הפניות {display(legal.retention)}. אחר כך נמחק
        אותם, אלא אם החוק מחייב לשמור אותם יותר זמן (למשל מסמכים חשבונאיים).
        אפשר לבקש מחיקה מוקדמת יותר, כמו שמוסבר ב
        <Link href="/data-deletion" className={link}>
          דף מחיקת הנתונים
        </Link>
        .
      </p>
    ),
    security: (
      <p>
        אנחנו נוקטים אמצעים סבירים כדי להגן על המידע: האתר עובד בחיבור מוצפן
        (HTTPS), גיבוי הפניות שמור באחסון פרטי שאין אליו גישה מהאינטרנט, והגישה
        למערכות מוגבלת למי שצריך אותה. אף שיטה לא מגינה במאה אחוז. אם יקרה אירוע
        אבטחה חמור, נפעל לפי תקנות הגנת הפרטיות (אבטחת מידע), התשע&quot;ז-2017.
      </p>
    ),
    rights: (
      <>
        <p>לפי חוק הגנת הפרטיות, התשמ&quot;א-1981, אתם יכולים:</p>
        <Bullets>
          <li>
            <strong>לעיין</strong> במידע שיש לנו עליכם (סעיף 13 לחוק).
          </li>
          <li>
            <strong>לתקן או למחוק</strong> מידע שאינו נכון, שלם, ברור או מעודכן
            (סעיף 14 לחוק).
          </li>
          <li>
            <strong>להפסיק לקבל דיוור</strong> ולבקש שנמחק אתכם מרשימת הדיוור
            (סעיף 17ו לחוק, וסעיף 30א לחוק התקשורת).
          </li>
          <li>
            <strong>לבקש שנמחק את כל הפרטים</strong> שמסרתם. איך עושים את זה, ב
            <Link href="/data-deletion" className={link}>
              דף מחיקת הנתונים
            </Link>
            .
          </li>
        </Bullets>
        <p>
          פונים אלינו בדרכים שבסעיף יצירת קשר. נענה לבקשת עיון תוך 30 ימים, כמו
          שקובעות התקנות. אם לא קיבלתם מענה, אפשר לפנות ל
          <a
            href="https://www.gov.il/he/departments/the_privacy_protection_authority"
            className={link}
            rel="noopener"
            target="_blank"
          >
            רשות להגנת הפרטיות
            <span className="sr-only"> (נפתח בחלון חדש)</span>
          </a>
          .
        </p>
      </>
    ),
    contact: (
      <>
        <p>בכל שאלה או בקשה בנושא פרטיות אפשר לפנות ל{name}:</p>
        <ContactLine />
      </>
    ),
    changes: (
      <p>
        אם נשנה את המדיניות, נעדכן את התאריך שבראש הדף. אם השינוי ישפיע מהותית
        על השימוש במידע שכבר מסרתם, נבקש את הסכמתכם כשהחוק דורש זאת.
      </p>
    ),
  });

  return (
    <>
      {/*
        טיוטה כללית לבדיקת עורך דין. לא חוות דעת משפטית.
        ההערה הזו לא מוצגת לגולשים. כל פרט עסקי מגיע מ-site.config.ts.
      */}
      <LegalPage
        title="מדיניות פרטיות"
        intro={
          <p>
            כאן מוסבר איזה מידע נאסף באתר של {name}, למה, למי הוא מועבר ומה
            הזכויות שלכם. המדיניות חלה על האתר הזה בלבד.
          </p>
        }
        sections={sections}
      />
    </>
  );
}
