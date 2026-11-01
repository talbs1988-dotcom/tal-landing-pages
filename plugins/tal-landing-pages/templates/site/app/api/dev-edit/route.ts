import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import { devEditDisabled, devEditNotFound, handleDevEdit } from "@/lib/devEdit";

/*
 * POST /api/dev-edit: מצב העריכה שומר טקסט ל-content/copy.json.
 * קיים רק ב-`npm run dev` (שמאזין רק למחשב עצמו, 127.0.0.1). בכל סביבה אחרת (גם באתר באוויר)
 * כל בקשה מקבלת 404. גם ב-`npm run dev:phone` (פתוח לרשת, לצפייה מהטלפון) מצב העריכה כבוי: 404.
 * הלוגיקה ב-lib/devEdit.ts.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COPY_FILE = join(process.cwd(), "content", "copy.json");

// שמירה אחת בכל פעם, כדי ששתי עריכות מהירות לא ידרסו זו את זו
let queue: Promise<unknown> = Promise.resolve();

export function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== "development")
    return Promise.resolve(devEditNotFound());
  if (devEditDisabled(process.env.DEV_EDIT))
    return Promise.resolve(devEditNotFound());
  const run = queue.then(() =>
    handleDevEdit(request, {
      nodeEnv: process.env.NODE_ENV,
      readCopy: () => readFile(COPY_FILE, "utf8"),
      writeCopy: (content) => writeFileAtomic(COPY_FILE, content),
    }),
  );
  queue = run.catch(() => {});
  return run;
}

/** שאר השיטות: 404 מחוץ לפיתוח (לא 405, כדי לא לגלות שהנתיב קיים), ו-405 בפיתוח */
function other(): Response {
  if (process.env.NODE_ENV !== "development") return devEditNotFound();
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { allow: "POST" },
  });
}

export const GET = other;
export const PUT = other;
export const PATCH = other;
export const DELETE = other;
export const OPTIONS = other;
