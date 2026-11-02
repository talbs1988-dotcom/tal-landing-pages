import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * נוסח משפטי משלכם, בקבצי markdown ב-content/legal/ (אופציונלי).
 * לכל דף (terms, privacy, accessibility, data-deletion) יכולים להיות שני קבצים:
 *  - <slug>.md            החלפה מלאה: הטקסט הזה במקום הסעיפים של התבנית.
 *  - <slug>.additions.md  תוספות: סעיפים שנכנסים אחרי הסעיפים של התבנית.
 *                         כשיש החלפה מלאה, מתעלמים ממנו.
 * אין קובץ (או קובץ ריק) ← הדף נבנה מהתבנית בלבד, כמו תמיד.
 *
 * הפורמט מצומצם בכוונה, ואין בו HTML גולמי:
 *  "# " בשורה הראשונה ← מתעלמים (לדף כבר יש כותרת).
 *  "## כותרת" ← פותח סעיף. טקסט לפני הכותרת הראשונה ← הפתיח של הדף (רק בהחלפה מלאה).
 *  שורה ריקה ← פסקה חדשה. "- " או "* " בתחילת שורה ← תבליט.
 *  **מודגש** ← מודגש. כל השאר מוצג כטקסט רגיל, כמו שהוא.
 * כאן רק הקריאה והפירוק. התצוגה ב-components/LegalPage.tsx.
 */

export const LEGAL_SLUGS = [
  "terms",
  "privacy",
  "accessibility",
  "data-deletion",
] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/** קטע בתוך שורה: טקסט רגיל או מודגש */
export type Inline = { text: string; strong: boolean };

export type LegalBlock =
  { kind: "p"; inlines: Inline[] } | { kind: "ul"; items: Inline[][] };

export type LegalTextSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalText = { intro: LegalBlock[]; sections: LegalTextSection[] };

/** **מודגש** ← strong. "**" בלי סגירה נשאר טקסט רגיל */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last)
      out.push({ text: text.slice(last, m.index), strong: false });
    out.push({ text: m[1], strong: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), strong: false });
  return out;
}

const HEADING = /^##\s+(.*\S)\s*$/;
const BULLET = /^[-*]\s+(.*)$/;

/** שורות של סעיף אחד ← פסקאות ורשימות */
function toBlocks(lines: string[]): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let para: string[] = [];
  let items: string[] | null = null;
  const flush = () => {
    if (para.length > 0)
      blocks.push({ kind: "p", inlines: parseInline(para.join(" ")) });
    if (items) blocks.push({ kind: "ul", items: items.map(parseInline) });
    para = [];
    items = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flush();
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      if (para.length > 0) flush();
      (items ??= []).push(bullet[1].trim());
    } else if (items && /^\s/.test(raw)) {
      // שורה מוזחת אחרי תבליט ← ממשיכה את אותו תבליט
      items[items.length - 1] += ` ${line}`;
    } else {
      if (items) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

/**
 * הטקסט של קובץ ← פתיח וסעיפים. prefix קובע את המזהים: own-1, own-2… או add-1….
 * קובץ ריק או רק רווחים ← null, כאילו אין קובץ.
 */
export function parseLegalText(
  text: string,
  prefix: "own" | "add",
): LegalText | null {
  const lines = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  // "# " בשורה הראשונה שיש בה תוכן: הכותרת של הדף כבר קיימת
  const first = lines.findIndex((l) => l.trim() !== "");
  if (first === -1) return null;
  if (/^#\s/.test(lines[first].trim())) lines.splice(first, 1);

  const intro: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  for (const line of lines) {
    const h = HEADING.exec(line.trim());
    if (h) sections.push({ title: h[1], lines: [] });
    else (sections.at(-1)?.lines ?? intro).push(line);
  }

  const result: LegalText = {
    intro: toBlocks(intro),
    sections: sections.map((s, i) => ({
      id: `${prefix}-${i + 1}`,
      // בכותרת (וגם בתוכן העניינים) אין הדגשה: מורידים את הסימון
      title: parseInline(s.title)
        .map((p) => p.text)
        .join(""),
      blocks: toBlocks(s.lines),
    })),
  };
  if (result.intro.length === 0 && result.sections.length === 0) return null;
  return result;
}

/** התיקייה של הנוסחים. נקראת בזמן הבנייה (הדפים סטטיים), מתוך שורש האתר */
export function legalTextDir(): string {
  return join(process.cwd(), "content", "legal");
}

function readOptional(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/**
 * מה יש לדף הזה ב-content/legal/.
 * own: החלפה מלאה, או null. additions: תוספות, או null (תמיד null כשיש own).
 * בקובץ תוספות כל טקסט חייב להיות תחת "## כותרת": אין לו מקום בלי סעיף,
 * ועדיף שהבנייה תיכשל מאשר שטקסט משפטי ייעלם בשקט.
 */
export function readLegalText(
  slug: LegalSlug,
  dir: string = legalTextDir(),
): { own: LegalText | null; additions: LegalText | null } {
  const ownText = readOptional(join(dir, `${slug}.md`));
  const own = ownText === null ? null : parseLegalText(ownText, "own");
  if (own) return { own, additions: null };
  const addText = readOptional(join(dir, `${slug}.additions.md`));
  const additions = addText === null ? null : parseLegalText(addText, "add");
  if (additions && additions.intro.length > 0)
    throw new Error(
      `content/legal/${slug}.additions.md: יש טקסט לפני הכותרת הראשונה. בקובץ תוספות כל טקסט צריך להיות תחת כותרת "## ".`,
    );
  return { own: null, additions };
}
