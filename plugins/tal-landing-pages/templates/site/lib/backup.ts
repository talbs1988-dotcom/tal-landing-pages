import type { LeadRecord } from "@/lib/lead";

/**
 * גיבוי לידים ב-Vercel Blob, בגישה פרטית (access: "private").
 * חנות פרטית דורשת הזדהות לכל קריאה, אז הקבצים לא נגישים מכתובת ציבורית.
 * תנאי: ב-Vercel יוצרים את ה-Blob store עם Access = Private.
 * חנות ציבורית תדחה את השמירה, הגיבוי ייכשל, והליד עדיין יעבור בוובהוק.
 */

type PutFn = (
  pathname: string,
  body: string,
  options: {
    access: "private";
    contentType: string;
    addRandomSuffix: boolean;
    allowOverwrite: boolean;
  },
) => Promise<unknown>;

const dateInIsrael = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** leads/YYYY-MM-DD/<id>.json (התאריך לפי שעון ישראל) */
export function backupPath(
  record: Pick<LeadRecord, "id" | "createdAt">,
): string {
  return `leads/${dateInIsrael.format(new Date(record.createdAt))}/${record.id}.json`;
}

/**
 * יוצר פונקציית גיבוי. putFn הוא put של @vercel/blob (מוזרק כדי שאפשר לבדוק בלי רשת).
 * ה-SDK מזדהה לבד: OIDC + BLOB_STORE_ID ב-Vercel, או BLOB_READ_WRITE_TOKEN.
 * לא מחזיר את כתובת הקובץ, כדי שלא תדלוף לשום תגובה.
 */
export function createBlobBackup(
  putFn: PutFn,
): (record: LeadRecord) => Promise<void> {
  return async (record) => {
    await putFn(backupPath(record), JSON.stringify(record), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  };
}
