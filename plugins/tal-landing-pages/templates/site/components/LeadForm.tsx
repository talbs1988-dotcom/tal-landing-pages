import { LeadFormClient } from "@/components/LeadFormClient";

/*
 * טופס הלידים, כמו שהדף משתמש בו: <LeadForm />.
 * רכיב שרת דק: מחשב בזמן הבנייה מה צריך להופיע ביידוע הפרטיות, ומעביר לטופס עצמו
 * (components/LeadFormClient.tsx). מייבאים אותו מדף או מסקשן שהם רכיבי שרת,
 * לא מתוך קובץ עם "use client".
 */
export function LeadForm() {
  return <LeadFormClient capi={false} />;
}
