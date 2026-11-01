/**
 * כיווניות עברית לתמונת השיתוף.
 *
 * satori (המנוע של next/og) לא מכיר כיווניות בכלל: הוא מצייר כל תו משמאל לימין
 * בסדר שבו הוא כתוב. בלי טיפול, "סדנת" יוצאת "תנדס", ומשפט מעורב
 * ("סדנת Claude Code ב-2026") יוצא גם בסדר מילים הפוך. (נבדק בעיניים על PNG)
 *
 * הפתרון, בשני צעדים:
 * 1. bidiUnits מפרק את הטקסט ל"יחידות" בסדר הלוגי: מילה עברית, רצף אנגלית/מספרים,
 *    או סימן פיסוק. הרכיב מסדר אותן ב-flex עם `row-reverse` + `wrap`, כך שהיחידה
 *    הראשונה יושבת בימין והשורות נשברות כמו בעברית.
 * 2. visualText הופך את האותיות בתוך יחידה עברית (ומחליף סוגריים), כי satori
 *    יצייר אותן משמאל לימין. אנגלית ומספרים נשארים כמו שהם.
 *
 * זה קירוב פשוט של אלגוריתם הכיווניות של יוניקוד (UBA) לפסקה מימין לשמאל,
 * מספיק לכותרות ושורות משנה. אם גרסה עתידית של satori תתחיל להפוך עברית בעצמה,
 * הטקסט ייצא הפוך: לבדוק בעיניים אחרי כל שדרוג של Next.
 */

export type BidiUnit = {
  text: string;
  /** rtl: עברית · ltr: אנגלית/מספרים · neutral: סימן פיסוק בהקשר מימין לשמאל */
  dir: "rtl" | "ltr" | "neutral";
  /** האם אחרי היחידה (בסדר הלוגי) היה רווח */
  spaceAfter: boolean;
};

type Dir = "R" | "L" | "N";

const RTL_CHAR = /[\u0590-\u05FF\uFB1D-\uFB4F\u0600-\u06FF]/;
const STRONG_LTR = /[\p{L}\p{N}]/u;
const DIGIT = /\p{Nd}/u;
const SPACE = /\s/;
/** סימנים שנצמדים למספר (50%, ₪100) ומתנהגים כמוהו */
const NUMBER_AFFIX = /^[%‰$₪€£¥#°+]$/;

/** סוגריים מתהפכים בהקשר מימין לשמאל */
const MIRROR: Record<string, string> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "«": "»",
  "»": "«",
};

function classify(ch: string): Dir {
  if (RTL_CHAR.test(ch)) return "R";
  if (STRONG_LTR.test(ch)) return "L";
  return "N";
}

/** הכיוון הסופי של כל תו, בפסקה שהכיוון הבסיסי שלה מימין לשמאל */
function resolve(chars: string[]): ("R" | "L")[] {
  const dirs: Dir[] = chars.map(classify);
  const out: ("R" | "L")[] = new Array(chars.length);

  let i = 0;
  while (i < chars.length) {
    if (dirs[i] !== "N") {
      out[i] = dirs[i] as "R" | "L";
      i++;
      continue;
    }
    // רצף ניטרלי: [i, j)
    let j = i;
    while (j < chars.length && dirs[j] === "N") j++;
    // ניטרלי בין שני צדדים באותו כיוון מקבל אותו. אחרת, הכיוון הבסיסי (ימין לשמאל)
    const prev = i > 0 ? out[i - 1] : "R";
    const next = j < chars.length ? (dirs[j] as "R" | "L") : "R";
    const dir = prev === next ? prev : "R";
    for (let k = i; k < j; k++) out[k] = dir;

    // סימנים שצמודים למספר (50%, ₪100) מתנהגים כמו המספר
    if (i > 0 && DIGIT.test(chars[i - 1])) {
      for (let k = i; k < j && NUMBER_AFFIX.test(chars[k]); k++) out[k] = "L";
    }
    if (j < chars.length && DIGIT.test(chars[j])) {
      for (let k = j - 1; k >= i && NUMBER_AFFIX.test(chars[k]); k--)
        out[k] = "L";
    }
    i = j;
  }
  return out;
}

/**
 * מפרק טקסט ליחידות בסדר הלוגי.
 * כל יחידה נכונה לציור לבד ב-satori, והסדר ביניהן נקבע ב-row-reverse.
 */
export function bidiUnits(text: string): BidiUnit[] {
  const chars = Array.from(text.replace(/\s+/g, " ").trim());
  if (chars.length === 0) return [];
  const dirs = resolve(chars);
  const units: BidiUnit[] = [];

  const markSpace = () => {
    const last = units[units.length - 1];
    if (last) last.spaceAfter = true;
  };
  const push = (t: string, dir: BidiUnit["dir"]) => {
    if (t) units.push({ text: t, dir, spaceAfter: false });
  };

  let i = 0;
  while (i < chars.length) {
    let j = i;
    while (j < chars.length && dirs[j] === dirs[i]) j++;
    const run = chars.slice(i, j);

    if (dirs[i] === "L") {
      // רצף אנגלית/מספרים (כולל הרווחים שבתוכו): satori מצייר אותו נכון כמו שהוא
      push(run.join(""), "ltr");
    } else {
      // רצף מימין לשמאל: מפרקים למילים לפי רווחים
      let piece: string[] = [];
      const flush = () => {
        if (piece.length === 0) return;
        // סימנים בקצוות המילה יוצאים ליחידות נפרדות, כדי שיעמדו בצד הנכון
        let a = 0;
        let b = piece.length;
        while (a < b && !RTL_CHAR.test(piece[a])) a++;
        while (b > a && !RTL_CHAR.test(piece[b - 1])) b--;
        for (const ch of piece.slice(0, a)) push(MIRROR[ch] ?? ch, "neutral");
        push(piece.slice(a, b).join(""), "rtl");
        for (const ch of piece.slice(b)) push(MIRROR[ch] ?? ch, "neutral");
        piece = [];
      };
      for (const ch of run) {
        if (SPACE.test(ch)) {
          flush();
          markSpace();
        } else {
          piece.push(ch);
        }
      }
      flush();
    }
    i = j;
  }
  return units;
}

/** תווים שמשתנים בסדר משמאל לימין: אותיות בודדות, וכל ניקוד צמוד לאות שלו */
function graphemes(text: string): string[] {
  const seg = new Intl.Segmenter("he", { granularity: "grapheme" });
  return Array.from(seg.segment(text), (s) => s.segment);
}

/**
 * הטקסט כמו ש-satori צריך לקבל אותו כדי שיוצג נכון.
 * יחידה עברית: האותיות בסדר הפוך (הניקוד נשאר על האות), וסוגריים בפנים מתחלפים.
 * השאר: כמו שהוא (סימן ניטרלי כבר הוחלף ב-bidiUnits).
 */
export function visualText(unit: BidiUnit): string {
  if (unit.dir !== "rtl") return unit.text;
  return graphemes(unit.text)
    .reverse()
    .map((g) => MIRROR[g] ?? g)
    .join("");
}
