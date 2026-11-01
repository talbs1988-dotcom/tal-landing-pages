import { randomBytes } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

/**
 * כתיבה אטומית: קודם לקובץ זמני באותה תיקייה, ואז rename מעל הקובץ.
 * כך הקובץ אף פעם לא נשאר חצי כתוב, גם אם התהליך נופל באמצע.
 * הקובץ הזמני מתחיל בנקודה, כדי שסורקים (check:todo) ושרת הפיתוח יתעלמו ממנו.
 */
export async function writeFileAtomic(
  path: string,
  content: string,
): Promise<void> {
  const tmp = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`,
  );
  try {
    await writeFile(tmp, content, "utf8");
    await rename(tmp, path);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}
