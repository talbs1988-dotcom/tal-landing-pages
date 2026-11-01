import { LeadFormClient } from "@/components/LeadFormClient";
import { siteCollects } from "@/components/LegalPage";

/*
 * טופס הלידים, כמו שהדף משתמש בו: <LeadForm />.
 * רכיב שרת דק: מחשב בזמן הבנייה אם הדיווח למטא מהשרת (CAPI) פעיל (siteCollects),
 * כדי שיידוע הפרטיות ליד הטופס יזכיר את זה, ומעביר לטופס עצמו (components/LeadFormClient.tsx).
 * מייבאים אותו מדף או מסקשן שהם רכיבי שרת, לא מתוך קובץ עם "use client"
 * (שם משתני הסביבה של השרת לא קיימים, והמשפט על מטא ייעלם).
 */
export function LeadForm() {
  return <LeadFormClient capi={siteCollects().capi} />;
}
