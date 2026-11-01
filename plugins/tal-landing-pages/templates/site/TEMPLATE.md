# תבנית האתר — הוראות לקלוד

> גרסה ראשונה. ההוראות המלאות לכל שלב, רשימת "אסור להוריד" ומשתני הסביבה יושלמו בהמשך (משימה 7 בתוכנית 2).

זו תבנית Next.js לדף נחיתה בעברית, מימין לשמאל. כל דף נחיתה נבנה על עותק שלה.

## הכלל הראשון: `site.config.ts` הוא מקור האמת

כל פרט על העסק, הדף, המיתוג והטופס יושב ב-`site.config.ts`, ורק שם.
הדפים המשפטיים, הפוטר, תמונת השיתוף והנתונים לגוגל קוראים ממנו.

- לא מקלידים שם עסק, טלפון, מייל או כתובת ישירות בדף. משנים ב-config.
- כל מה שלא ידוע נשאר `TODO` (מוצג באתר כ-`[למלא]`). לא ממציאים.
- `npm run check:todo` מראה מה נשאר למלא. האתר לא עולה לאוויר עד שזה אפס.
- צבעים: רק ב-`brand` שב-config. טקסט לבן על `primary`, וטקסט רגיל על `background`, צריכים ניגודיות 4.5:1 לפחות.

## המבנה

| מה                         | איפה                                          |
| -------------------------- | --------------------------------------------- |
| פרטי העסק, הדף, הצבעים     | `site.config.ts`                              |
| הדף הראשי                  | `app/page.tsx`                                |
| סקשנים של הדף              | `components/sections/`                        |
| מבנה כללי (שפה, פונט, צבע) | `app/layout.tsx`, `app/globals.css`           |
| לוגיקה (בלי תצוגה)         | `lib/`                                        |
| תמונות                     | `public/assets/`                              |
| בדיקות                     | `tests/`                                      |
| שמות משתני הסביבה          | `.env.example` (שמות בלבד, ערכים רק ב-Vercel) |

## דברים שלא משנים

- `<html lang="he" dir="rtl">` ב-`app/layout.tsx`.
- הפונט Rubik נטען דרך `next/font` ומוגש מהאתר עצמו, בלי פנייה לגוגל מהדפדפן.
- בדף יש טופס אחד בלבד עם `id="lead-form"`, וכפתורי הקריאה לפעולה גוללים אליו.
- סודות (טוקנים, כתובות וובהוק) רק במשתני סביבה, אף פעם לא בקוד.

## קליטת לידים: `POST /api/lead`

הלוגיקה ב-`lib/handleLead.ts`, והחיבור לשירותים ב-`app/api/lead/route.ts`. הסדר:
ולידציה ← מלכודת בוטים ← גיבוי (Blob) ← וובהוק (Make) ← דיווח למטא (CAPI).

- **הצלחה** אם הגיבוי **או** הוובהוק הצליחו. שניהם נכשלו ← 500 עם הודעה כללית בעברית, והלקוח יכול לנסות שוב.
- **אף אחד מהם לא מוגדר:** במחשב ← 200 עם `mode: "dev"` (לא נשמר כלום). ב-Vercel production ← 500, כדי שלידים לא ילכו לאיבוד בשקט.
- **CAPI** נשלח רק אם הליד סימן הסכמה לשיווק, ויש `META_PIXEL_ID` ו-`META_CAPI_TOKEN`. הוא רץ אחרי שהתשובה נשלחה (`after()`), כך שהגולש לא מחכה למטא, וכישלון שלו לא משנה את התשובה.
- **לוגים:** רק מזהה ליד ותוצאה. אף פעם לא שם, מייל, טלפון או IP.
- **הגבלת קצב:** 10 בקשות בדקה לכתובת IP (בזיכרון, הגנה בסיסית). גוף מעל 10KB ← 413.
- **מקור הבקשה:** אם יש כותרת `Origin`, היא חייבת להתאים לכתובת האתר (host של הבקשה, `x-forwarded-host`, או `site.page.url`). אחרת ← 403. בלי `Origin` מאשרים.
- **הגיבוי פרטי:** הקבצים נשמרים ב-`leads/YYYY-MM-DD/<id>.json` (תאריך לפי שעון ישראל) עם `access: "private"`. ב-Vercel יוצרים את ה-Blob store עם **Access = Private**. בחנות ציבורית השמירה תיכשל (והליד עדיין יעבור בוובהוק).
- **גרסת ה-API של מטא:** הקבוע `GRAPH_API_VERSION` ב-`lib/capi.ts`.

### מה הוובהוק מקבל

POST עם `content-type: application/json`, עד 8 שניות לניסיון, וניסיון חוזר אחד על שגיאת רשת או 5xx. הגוף שטוח, שדה לכל עמודה ב-Make:

```json
{
  "id": "c3423cfc-…",
  "createdAt": "2026-11-01T15:34:15.639Z",
  "name": "ישראל ישראלי",
  "email": "israel@example.co.il",
  "phone": "0501234567",
  "marketingConsent": true,
  "utm_source": "facebook",
  "utm_medium": "paid",
  "utm_campaign": "nov-launch",
  "utm_content": "video-1",
  "utm_term": "",
  "fbclid": "IwAR…",
  "fbp": "",
  "fbc": "",
  "referrer": "https://l.facebook.com/",
  "landingPath": "/?utm_source=facebook",
  "source": "facebook",
  "eventId": "3f1c2b9e-…",
  "pageUrl": "https://example.co.il/?utm_source=facebook"
}
```

- `phone` בפורמט מקומי (`05…`, `0X…`), או `""` אם לא נמסר. `email` באותיות קטנות.
- כל שדה מעקב הוא מחרוזת (ריקה אם אין). `source` = `utm_source`, ואם אין ← `"אחר"`.
- `marketingConsent` הוא `true` רק אם הליד סימן בעצמו את תיבת הדיוור. רק לידים עם `true` נכנסים לרשימת דיוור.

### משתני סביבה

| משתנה                              | מה הוא עושה                                                      |
| ---------------------------------- | ---------------------------------------------------------------- |
| `WEBHOOK_URL`                      | הכתובת שמקבלת כל ליד (Make)                                      |
| `BLOB_READ_WRITE_TOKEN`            | גיבוי ב-Vercel Blob (נוסף אוטומטית כשמחברים store)               |
| `BLOB_STORE_ID`                    | גיבוי ב-Vercel Blob עם הזדהות OIDC (נוסף אוטומטית בחנויות חדשות) |
| `NEXT_PUBLIC_META_PIXEL_ID`        | הפיקסל בדפדפן (נטען רק אחרי הסכמה לעוגיות שיווק)                 |
| `META_PIXEL_ID`, `META_CAPI_TOKEN` | דיווח לידים מהשרת למטא (Conversions API)                         |
| `META_CAPI_TEST_CODE`              | קוד בדיקה מ-Events Manager. רק בזמן בדיקה, למחוק אחרי            |

## הטופס, דף התודה והפוטר

- `components/LeadForm.tsx`: הטופס היחיד בדף (`id="lead-form"`). שדה הטלפון לפי `site.form.phone`. הטקסטים מה-config: `submitLabel`, `marketingConsentText`, `privacyNotice`.
- כל עוד `privacyNotice` לא מולא, מוצג יידוע פרטיות כללי עם `[למלא]` גלוי (לאן הפרטים מועברים). לא מסתירים טקסט משפטי חסר.
- תיבת הדיוור נפרדת מיידוע הפרטיות, לא מסומנת, ולא חובה.
- פנייה לפי קהל: `lib/copy.ts` (`pick(g(זכר, נקבה, רבים), site.audience)`). כל עוד הקהל לא הוגדר, פונים ברבים.
- אחרי שליחה מוצלחת עוברים ל-`/thank-you?e=<eventId>` (בלי `e` אם השרת לא החזיר מזהה). דף התודה לא נכנס לגוגל.
- הטקסט "מה קורה עכשיו" בדף התודה: `site.page.thankYouNextSteps`.
- `components/Footer.tsx`: קישורים משפטיים, "העדפות עוגיות" (שולח `cookie-consent-reopen`), יצירת קשר, ופרטי העסק מה-config. אסור להוריד.

## עוגיות ופיקסל

- `lib/consent.ts`: הבחירה של הגולש (`cookie-consent-v1` ב-localStorage, עם גרסה ותאריך). `useConsent()` הוא המקור היחיד לבאנר, לפיקסל ולאירוע ה-Lead. `writeConsent()` שולח `cookie-consent-changed`.
- `components/CookieBanner.tsx`: שלושה כפתורים זהים (דחיית הכול, התאמה, אישור הכול). נפתח מחדש מ"העדפות עוגיות" בפוטר עם הבחירה הנוכחית. אסור להוריד או להקטין את "דחיית הכול".
- `components/MetaPixel.tsx`: נטען **רק** עם `NEXT_PUBLIC_META_PIXEL_ID` תקין (ספרות בלבד) **וגם** הסכמה לשיווק. בלי זה אין שום בקשה לפייסבוק. PageView אחד בטעינה, ובמעברי דף בתוך האתר הפיקסל שולח PageView לבד (נבדק: fbevents מתעלם מ-PageView ידני נוסף באותו מסמך). ביטול הסכמה ← `fbq('consent','revoke')`. זיהוי אוטומטי של כפתורים (autoConfig) כבוי.
- `components/LeadPixelEvent.tsx` בדף התודה: Lead עם אותו `eventID` שהשרת שולח ל-CAPI. פעם אחת לכל ליד, גם אחרי רענון.
- **מדידה (analytics):** הקטגוריה קיימת בבאנר, אבל אין כרגע סקריפט מדידה. מי שמוסיף (למשל Google Analytics) יוצר רכיב בדמות `MetaPixel`: קורא `useConsent()`, טוען את הסקריפט רק כש-`consent?.analytics === true`, ומוסיף אותו ל-`app/layout.tsx` ליד `<MetaPixel />`. וגם מעדכן את `site.collects.analytics` כדי שמדיניות הפרטיות תזכיר אותו.

## פקודות

```bash
npm install        # פעם אחת
npm run dev        # צפייה במחשב: http://localhost:3000
npm run build      # בנייה, כמו ב-Vercel
npm test           # בדיקות
npm run typecheck  # בדיקת טיפוסים
npm run check:todo # מה נשאר למלא
```
