/**
 * site.config.ts — מקור האמת היחיד של האתר.
 *
 * כל פרט על העסק, הדף, המיתוג והטופס נמצא כאן ורק כאן.
 * הדפים המשפטיים, הפוטר, תמונת השיתוף וגוגל קוראים מהקובץ הזה,
 * אז שינוי כאן מעדכן את כל האתר בבת אחת.
 *
 * הטקסטים השיווקיים שמוצגים בדף (כותרת, תת-כותרת, כפתור, דף התודה) לא כאן:
 * הם ב-content/copy.json, ונקראים עם t("hero.title") מ-lib/copyText.ts.
 *
 * לקלוד שממלא את הקובץ:
 * - כל מה שלא ידוע נשאר TODO (מוצג באתר כ"למלא" בסוגריים מרובעים). לא ממציאים פרטים.
 * - `npm run check:todo` מונה את כל ה-TODO שנשארו, והאתר לא עולה לאוויר עד שהם נגמרים.
 * - לא מקלידים פרטי עסק ישירות בדפים. מוסיפים או משנים אותם כאן.
 */
import { TODO, type Todo } from "@/lib/todo";

/** איך פונים לקהל בטקסטים: לגבר, לאישה, או ברבים */
export type Audience = "male" | "female" | "plural";

/** שדה פרטי קשר בטופס: חובה, רשות, או לא להציג בכלל */
export type ContactField = "required" | "optional" | "hidden";

/** האם לבקש טלפון בטופס */
export type PhoneField = ContactField;

/** האם לבקש מייל בטופס */
export type EmailField = ContactField;

/** מה העסק מוכר: שירות (פגישה, ליווי, סדנה, קורס), מוצר פיזי שנשלח, או גם וגם. קובע את נוסח הביטול וההחזרה בתקנון */
export type OfferType = "service" | "product" | "both";

/** סוג העסק כפי שהוא רשום ברשויות */
export type BusinessType = "עוסק פטור" | "עוסק מורשה" | 'חברה בע"מ' | "עמותה";

export type SiteConfig = {
  business: {
    /** השם הרשמי של העסק, כמו שהוא רשום ברשויות (מופיע בדפים המשפטיים ובפוטר) */
    legalName: string;
    /** השם שהקהל מכיר. מופיע בכותרות, בזכויות היוצרים ובתמונת השיתוף */
    displayName: string;
    /** סוג העסק. משפיע על מה שכתוב בפוטר ובתקנון */
    type: BusinessType | Todo;
    /** מספר עוסק או ח.פ. (ספרות בלבד) */
    idNumber: string;
    /**
     * הכתובת של העסק. מופיעה בפוטר, בדפים המשפטיים ובנתונים לגוגל.
     * אם לעסק אין כתובת פיזית לפרסום, למלא "" (מחרוזת ריקה) בכל שלושת השדות,
     * ואז חובה למלא את legal.noticeAddress (מען להודעות ביטול ולהחזרות).
     */
    address: {
      /** רחוב ומספר */
      street: string;
      /** עיר */
      city: string;
      /** מיקוד (לא חובה, אפשר "") */
      postalCode: string;
    };
    /** טלפון ליצירת קשר, כמו שרוצים שיופיע באתר (למשל 050-1234567) */
    phone: string;
    /** מייל ליצירת קשר. אליו מגיעות גם בקשות למחיקת מידע */
    email: string;
    /** מי מטפל בפניות נגישות. מופיע בהצהרת הנגישות (חובה לפי החוק) */
    accessibilityCoordinator: {
      name: string;
      phone: string;
      email: string;
    };
  };
  page: {
    /** הכתובת המלאה של הדף באוויר, עם https:// ובלי / בסוף (למשל https://example.co.il) */
    url: string;
    /**
     * כותרת הדף לגוגל ולשונית הדפדפן (SEO). לא מוצגת בדף עצמו:
     * הכותרת הגדולה בדף היא "hero.title" ב-content/copy.json.
     */
    title: string;
    /** תיאור קצר לגוגל (עד כ-155 תווים). לא מוצג בדף: שורת המשנה בדף היא "hero.subtitle" ב-copy.json */
    description: string;
    /** הכותרת הגדולה בתמונה שמופיעה כשמשתפים את הדף בוואטסאפ או בפייסבוק */
    ogTitle: string;
    /** שורת המשנה באותה תמונת שיתוף */
    ogSubtitle: string;
    /** התאריך שבו הדפים המשפטיים עודכנו לאחרונה, בפורמט YYYY-MM-DD */
    lastUpdated: string;
    /**
     * דף שהפעולה בו היא קנייה: הכתובת של דף התשלום החיצוני (https מלא, למשל דף סליקה של Grow או Cardcom).
     * מלא ← כל כפתור בדף (CtaAction) הוא קישור לדף התשלום, ולא גולל לטופס.
     * "" (ברירת המחדל) ← דף לידים: כל כפתור גולל לטופס.
     * בעל העסק בחר תשלום ועוד אין לו כתובת ← TODO, ו-check:todo חוסם עד שהיא מגיעה.
     */
    checkoutUrl: string;
    /**
     * אימות ב-Google Search Console בתגית meta, לדף בלי דומיין משלו (כתובת vercel.app).
     * רק הערך שבתוך content="..." של התגית שגוגל נותן. זה לא סוד: התגית מופיעה בכל דף.
     * "" ← אין תגית (ברירת המחדל, ואם האימות נעשה ברשומת TXT אצל ספק הדומיין).
     */
    googleVerification: string;
  };
  /**
   * צבעי המותג בפורמט hex (#RRGGBB).
   * כלל נגישות: הטקסט על הרקע, וטקסט לבן על primary, צריכים יחס ניגודיות של 4.5:1 לפחות.
   * ברירת המחדל ניטרלית ועוברת את הכלל. מחליפים בשלב העיצוב.
   */
  brand: {
    /** הצבע הראשי: כפתורים וקישורים. טקסט לבן יושב עליו */
    primary: string;
    /** צבע משני: כותרות משנה ומסגרות */
    secondary: string;
    /** צבע הדגשה: פרטים קטנים שצריכים לבלוט */
    accent: string;
    /** צבע הרקע של הדף */
    background: string;
    /** צבע הטקסט הרגיל */
    text: string;
  };
  /**
   * הטופס. השדות נקבעים בשלב העיצוב (/page-design), לפי התשובה באפיון לשאלה "איך רוצים שיחזרו אלייך".
   * הטקסטים: submitLabel ו-marketingConsentText מועתקים מהקופי בשלב העיצוב.
   * privacyNotice נקבע רק בשלב המשפטי (/page-legal).
   */
  form: {
    /**
     * האם לבקש מייל בטופס. ברירת המחדל: "required".
     * חובה שלפחות אחד, מייל או טלפון, לא יהיה "hidden". שניהם "hidden" ← הבנייה נכשלת ו-check:todo סופר את זה.
     */
    email: EmailField;
    /** האם לבקש טלפון בטופס. אותו כלל: לפחות אחד מהשניים מוצג */
    phone: PhoneField;
    /** הטקסט על כפתור השליחה (בפנייה שמתאימה ל-audience, למשל "שלחו לי את המדריך") */
    submitLabel: string;
    /**
     * הטקסט ליד תיבת ההסכמה לדיוור (התיבה לא מסומנת מראש, לפי חוק התקשורת).
     * התיבה נשארת תמיד בטופס, גם בעסק בלי מערכת דיוור: היא מכסה גם הודעות שיווקיות בוואטסאפ,
     * ובלי הסכמה אסור לשלוח אותן. הנוסח מתאים את עצמו לערוצים שבאמת משתמשים בהם.
     * למשל: "אני מסכים/ה לקבל מ<שם העסק> עדכונים ותוכן שיווקי במייל ובוואטסאפ. אפשר להסיר בכל רגע."
     * עסק שלא שולח שום דבר שיווקי: "אשמח לקבל מ<שם העסק> עדכונים בוואטסאפ. אפשר להסיר בכל רגע."
     */
    marketingConsentText: string;
    /**
     * יידוע הפרטיות שמופיע ליד כפתור השליחה (תיקון 13 לחוק הגנת הפרטיות), בארבעה חלקים:
     * מה נאסף (לפי השדות שמוצגים), למה, שאין חובה לפי חוק למסור, ולאן הפרטים עוברים.
     * נקבע בשלב המשפטי (/page-legal), לא בעיצוב. לינק למדיניות הפרטיות מתווסף אוטומטית.
     */
    privacyNotice: string;
  };
  /** איך פונים לקהל בכל הטקסטים באתר */
  audience: Audience | Todo;
  /** מה האתר אוסף. קובע אילו סעיפים יופיעו במדיניות הפרטיות ובבאנר העוגיות */
  collects: {
    /** טופס לידים (שם, מייל, טלפון) */
    form: boolean;
    /** פיקסל של מטא (פייסבוק/אינסטגרם) */
    pixel: boolean;
    /** כלי ניתוח תנועה (למשל Google Analytics) */
    analytics: boolean;
  };
  /**
   * פרטים שהדפים המשפטיים צריכים (פרטיות, תקנון, נגישות, מחיקת נתונים).
   * ממלאים רק לפי מה שבעל העסק אמר. מה שלא ידוע נשאר TODO.
   */
  legal: {
    /**
     * מה העסק מוכר. ברירת המחדל: "service".
     * "service" ← בתקנון אין משפט על החזרת מוצר. "product" ← יש. "both" ← שני הנוסחים.
     */
    offerType: OfferType;
    /**
     * לאן עוברים פרטי מי שהשאיר פרטים. שם הכלי בלבד (למשל "Make", "רב מסר", "Monday").
     * אם העסק לא משתמש בכלי מסוג כזה: "" (מחרוזת ריקה), והשורה לא תופיע במדיניות.
     */
    processors: {
      /** הכלי שמקבל את הליד מהאתר ומעביר הלאה (וובהוק). ברירת המחדל בסיסטם: Make */
      automation: string;
      /** מערכת הדיוור (מיילים, וואטסאפ) */
      mailing: string;
      /** איפה מנהלים את הלקוחות: CRM, טבלה או מסד נתונים */
      crm: string;
      /** כלי ניתוח התנועה. רלוונטי רק אם collects.analytics הוא true, אחרת "" */
      analytics: string;
    };
    /**
     * כמה זמן שומרים את פרטי הלידים.
     * הצעה לבעל העסק: "עד 24 חודשים מהפנייה האחרונה, או עד שמבקשים מחיקה, המוקדם מביניהם".
     */
    retention: string;
    /** תוך כמה זמן מטפלים בבקשת מחיקה. הצעה לבעל העסק: "30 ימים" */
    deletionTimeframe: string;
    /**
     * מוצרים או שירותים של העסק שלא חלה עליהם זכות הביטול לפי החוק
     * (למשל מוצר שיוצר במיוחד ללקוח, או תוכן דיגיטלי שאפשר להעתיק).
     * אם אין כאלה: "אין".
     */
    cancellationExceptions: string;
    /** רכיבים באתר שעדיין לא נגישים במלואם, ומה החלופה. אם לא ידוע על כאלה: "לא ידוע לנו על רכיבים כאלה" */
    accessibilityLimitations: string;
    /**
     * הסדרי הנגישות במקום העסק (חניה, כניסה, שירותים). מופיע רק אם יש כתובת.
     * אם אין קבלת קהל במקום: "אין קבלת קהל בכתובת העסק".
     */
    physicalAccessibility: string;
    /**
     * מען למשלוח הודעות ביטול (ולהחזרת מוצרים, כשמוכרים מוצר), כשאין לעסק כתובת פומבית (business.address ריק).
     * למשל ת"ד או כתובת למשלוח. מופיע בתקנון. כשיש כתובת פומבית, התקנון משתמש בה והשדה הזה לא נחוץ.
     */
    noticeAddress: string;
  };
};

export const site: SiteConfig = {
  business: {
    legalName: TODO,
    displayName: TODO,
    type: TODO,
    idNumber: TODO,
    address: {
      street: TODO,
      city: TODO,
      postalCode: TODO,
    },
    phone: TODO,
    email: TODO,
    accessibilityCoordinator: {
      name: TODO,
      phone: TODO,
      email: TODO,
    },
  },
  page: {
    url: TODO,
    title: TODO,
    description: TODO,
    ogTitle: TODO,
    ogSubtitle: TODO,
    lastUpdated: TODO,
    checkoutUrl: "",
    googleVerification: "",
  },
  brand: {
    primary: "#0F766E",
    secondary: "#334155",
    accent: "#B45309",
    background: "#FAFAF9",
    text: "#1E293B",
  },
  form: {
    email: "required",
    phone: "required",
    submitLabel: TODO,
    marketingConsentText: TODO,
    privacyNotice: TODO,
  },
  audience: TODO,
  collects: {
    form: true,
    pixel: false,
    analytics: false,
  },
  legal: {
    offerType: "service",
    processors: {
      automation: TODO,
      mailing: TODO,
      crm: TODO,
      analytics: "",
    },
    retention: TODO,
    deletionTimeframe: TODO,
    cancellationExceptions: TODO,
    accessibilityLimitations: TODO,
    physicalAccessibility: TODO,
    noticeAddress: TODO,
  },
};
