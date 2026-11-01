import { LeadFormClient } from "@/components/LeadFormClient";
import { siteCollects } from "@/components/LegalPage";
import { site } from "@/site.config";
import { assertContactFields } from "@/lib/lead";

/*
 * טופס הלידים, כמו שהדף משתמש בו: <LeadForm />.
 * רכיב שרת דק: מחשב בזמן הבנייה אם הדיווח למטא מהשרת (CAPI) פעיל (siteCollects),
 * כדי שיידוע הפרטיות ליד הטופס יזכיר את זה, ומעביר לטופס עצמו (components/LeadFormClient.tsx).
 * מייבאים אותו מדף או מסקשן שהם רכיבי שרת, לא מתוך קובץ עם "use client"
 * (שם משתני הסביבה של השרת לא קיימים, והמשפט על מטא ייעלם).
 */
export function LeadForm() {
  // בלי מייל ובלי טלפון אין איך לחזור לליד: הבנייה נכשלת עם הסבר, ולא עולה טופס שבור
  assertContactFields(site.form);
  return <LeadFormClient capi={siteCollects().capi} />;
}
