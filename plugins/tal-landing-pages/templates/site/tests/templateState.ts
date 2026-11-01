import { site } from "@/site.config";
import { TODO } from "@/lib/todo";

/**
 * האם זו עדיין התבנית הריקה, לפני שמילאו בה משהו.
 * התבנית מועתקת לכל דף ונבדקת שם (`npm run check`). בדיקה שבודקת את ערכי
 * ברירת המחדל של התבנית עצמה רצה רק כאן, אחרת כל דף שמילאו היה נכשל בה.
 */
export const PRISTINE = site.business.legalName === TODO && site.page.title === TODO;
