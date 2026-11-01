/**
 * site.config.ts — מקור האמת היחיד של האתר.
 *
 * כל פרט על העסק, הדף, המיתוג והטופס נמצא כאן ורק כאן.
 * הדפים המשפטיים, הפוטר, תמונת השיתוף וגוגל קוראים מהקובץ הזה,
 * אז שינוי כאן מעדכן את כל האתר בבת אחת.
 *
 * לקלוד שממלא את הקובץ:
 * - כל מה שלא ידוע נשאר TODO (מוצג באתר כ"למלא" בסוגריים מרובעים). לא ממציאים פרטים.
 * - `npm run check:todo` מונה את כל ה-TODO שנשארו, והאתר לא עולה לאוויר עד שהם נגמרים.
 * - לא מקלידים פרטי עסק ישירות בדפים. מוסיפים או משנים אותם כאן.
 */
import { TODO, type Todo } from "@/lib/todo";

/** איך פונים לקהל בטקסטים: לגבר, לאישה, או ברבים */
export type Audience = "male" | "female" | "plural";

/** האם לבקש טלפון בטופס: חובה, רשות, או לא להציג בכלל */
export type PhoneField = "required" | "optional" | "hidden";

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
     * אם לעסק אין כתובת פיזית לפרסום, למלא "" (מחרוזת ריקה) בכל שלושת השדות.
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
    /** כותרת הדף: מופיעה בלשונית הדפדפן, בגוגל ובראש הדף */
    title: string;
    /** תיאור קצר (עד כ-155 תווים): מופיע בגוגל ומתחת לכותרת הראשית */
    description: string;
    /** הטקסט על הכפתור הראשי שגולל לטופס */
    ctaLabel: string;
    /** הכותרת הגדולה בתמונה שמופיעה כשמשתפים את הדף בוואטסאפ או בפייסבוק */
    ogTitle: string;
    /** שורת המשנה באותה תמונת שיתוף */
    ogSubtitle: string;
    /** התאריך שבו הדפים המשפטיים עודכנו לאחרונה, בפורמט YYYY-MM-DD */
    lastUpdated: string;
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
  form: {
    /** האם לבקש טלפון בטופס */
    phone: PhoneField;
    /** הטקסט על כפתור השליחה (בפנייה שמתאימה ל-audience, למשל "שלחו לי את המדריך") */
    submitLabel: string;
    /**
     * הטקסט ליד תיבת ההסכמה לדיוור (התיבה לא מסומנת מראש, לפי חוק התקשורת).
     * למשל: "אני מסכים/ה לקבל מ<שם העסק> עדכונים ותוכן שיווקי במייל ובוואטסאפ. אפשר להסיר בכל רגע."
     */
    marketingConsentText: string;
    /**
     * יידוע הפרטיות שמופיע ליד כפתור השליחה (תיקון 13 לחוק הגנת הפרטיות):
     * מה נאסף, למה, האם חובה למסור, ולאן הפרטים עוברים. לינק למדיניות הפרטיות מתווסף אוטומטית.
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
    ctaLabel: TODO,
    ogTitle: TODO,
    ogSubtitle: TODO,
    lastUpdated: TODO,
  },
  brand: {
    primary: "#0F766E",
    secondary: "#334155",
    accent: "#B45309",
    background: "#FAFAF9",
    text: "#1E293B",
  },
  form: {
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
};
