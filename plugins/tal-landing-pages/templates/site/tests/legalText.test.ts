import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseInline, parseLegalText, readLegalText } from "@/lib/legalText";
import TermsPage from "@/app/terms/page";
import PrivacyPage from "@/app/privacy/page";
import AccessibilityPage from "@/app/accessibility/page";
import DataDeletionPage from "@/app/data-deletion/page";

/*
 * נוסח משלכם ב-content/legal/: הפירוק (lib/legalText.ts), והדפים כמו שהם נבנים איתו.
 */

describe("parseInline: הדגשה", () => {
  it("**מודגש** ← strong, והשאר טקסט רגיל", () => {
    expect(parseInline("לפני **חשוב** אחרי")).toEqual([
      { text: "לפני ", strong: false },
      { text: "חשוב", strong: true },
      { text: " אחרי", strong: false },
    ]);
  });

  it('"**" בלי סגירה נשאר כמו שהוא', () => {
    expect(parseInline("סתם ** כוכביות")).toEqual([
      { text: "סתם ** כוכביות", strong: false },
    ]);
  });
});

describe("parseLegalText", () => {
  it("כותרת # בשורה הראשונה נזרקת, ## פותח סעיף עם מזהה לפי הסדר", () => {
    const r = parseLegalText("# תקנון\n\n## אחד\nטקסט\n\n## שניים\nעוד", "own");
    expect(r?.intro).toEqual([]);
    expect(r?.sections.map((s) => [s.id, s.title])).toEqual([
      ["own-1", "אחד"],
      ["own-2", "שניים"],
    ]);
  });

  it("המזהים בתוספות: add-1, add-2", () => {
    const r = parseLegalText("## א\nx\n## ב\ny", "add");
    expect(r?.sections.map((s) => s.id)).toEqual(["add-1", "add-2"]);
  });

  it("שורה ריקה מפרידה פסקאות, ושורות צמודות הן אותה פסקה", () => {
    const r = parseLegalText("## א\nשורה אחת\nשורה שתיים\n\nפסקה שנייה", "own");
    expect(r?.sections[0].blocks).toEqual([
      { kind: "p", inlines: [{ text: "שורה אחת שורה שתיים", strong: false }] },
      { kind: "p", inlines: [{ text: "פסקה שנייה", strong: false }] },
    ]);
  });

  it('"- " ו-"* " ← רשימה, גם צמוד לפסקה, ושורה מוזחת ממשיכה תבליט', () => {
    const r = parseLegalText(
      "## א\nאסור:\n- ראשון\n* שני\n  המשך\nאחרי",
      "own",
    );
    expect(r?.sections[0].blocks).toEqual([
      { kind: "p", inlines: [{ text: "אסור:", strong: false }] },
      {
        kind: "ul",
        items: [
          [{ text: "ראשון", strong: false }],
          [{ text: "שני המשך", strong: false }],
        ],
      },
      { kind: "p", inlines: [{ text: "אחרי", strong: false }] },
    ]);
  });

  it("הדגשה בתוך תבליט, ובכותרת הסימון יורד", () => {
    const r = parseLegalText("## **ביטול** עסקה\n- **מוצר:** 14 ימים", "own");
    expect(r?.sections[0].title).toBe("ביטול עסקה");
    expect(r?.sections[0].blocks[0]).toEqual({
      kind: "ul",
      items: [
        [
          { text: "מוצר:", strong: true },
          { text: " 14 ימים", strong: false },
        ],
      ],
    });
  });

  it("טקסט לפני ה-## הראשון ← פתיח", () => {
    const r = parseLegalText("# כותרת\nפתיח של הדף\n\n## סעיף\nתוכן", "own");
    expect(r?.intro).toEqual([
      { kind: "p", inlines: [{ text: "פתיח של הדף", strong: false }] },
    ]);
    expect(r?.sections).toHaveLength(1);
  });

  it("קובץ ריק, רק רווחים, או רק כותרת # ← null", () => {
    expect(parseLegalText("", "own")).toBeNull();
    expect(parseLegalText("  \n\n\t\n", "own")).toBeNull();
    expect(parseLegalText("# תקנון\n\n", "own")).toBeNull();
  });

  it("BOM ו-CRLF לא מפריעים", () => {
    const r = parseLegalText("﻿# כותרת\r\n## א\r\nטקסט\r\n", "own");
    expect(r?.sections[0].title).toBe("א");
  });

  it("markdown אחר נשאר טקסט רגיל: ### וקישורים", () => {
    const r = parseLegalText(
      "## א\n### תת-כותרת\n[קישור](https://x.co.il)",
      "own",
    );
    expect(r?.sections[0].blocks).toEqual([
      {
        kind: "p",
        inlines: [
          { text: "### תת-כותרת [קישור](https://x.co.il)", strong: false },
        ],
      },
    ]);
  });
});

// הדפים קוראים מ-<cwd>/content/legal. בבדיקה: תיקייה זמנית
let root: string;
const legalDir = () => join(root, "content", "legal");

function setFiles(files: Record<string, string>) {
  rmSync(legalDir(), { recursive: true, force: true });
  mkdirSync(legalDir(), { recursive: true });
  for (const [name, text] of Object.entries(files))
    writeFileSync(join(legalDir(), name), text);
}

const PAGES = {
  terms: TermsPage,
  privacy: PrivacyPage,
  accessibility: AccessibilityPage,
  "data-deletion": DataDeletionPage,
};

const render = (page: keyof typeof PAGES) =>
  renderToStaticMarkup(createElement(PAGES[page] as () => ReactElement));

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "legal-text-"));
});
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});
afterEach(() => {
  vi.restoreAllMocks();
});

function inSite(files: Record<string, string>) {
  setFiles(files);
  vi.spyOn(process, "cwd").mockReturnValue(root);
}

describe("readLegalText: הקבצים", () => {
  it("אין תיקייה בכלל ← אין נוסח", () => {
    expect(readLegalText("terms", join(root, "nope"))).toEqual({
      own: null,
      additions: null,
    });
  });

  it("כשיש החלפה מלאה, מתעלמים מהתוספות", () => {
    setFiles({ "terms.md": "## שלי\nא", "terms.additions.md": "## תוספת\nב" });
    const r = readLegalText("terms", legalDir());
    expect(r.own?.sections[0].title).toBe("שלי");
    expect(r.additions).toBeNull();
  });

  it("קובץ החלפה ריק ← התוספות כן נקראות", () => {
    setFiles({ "terms.md": "  \n", "terms.additions.md": "## תוספת\nב" });
    const r = readLegalText("terms", legalDir());
    expect(r.own).toBeNull();
    expect(r.additions?.sections[0].id).toBe("add-1");
  });

  it("טקסט לפני הכותרת הראשונה בקובץ תוספות ← שגיאה ברורה, לא נבלע בשקט", () => {
    setFiles({ "privacy.additions.md": "טקסט בלי סעיף\n## תוספת\nב" });
    expect(() => readLegalText("privacy", legalDir())).toThrow(
      /privacy\.additions\.md/,
    );
  });
});

describe("הדפים עם נוסח מ-content/legal/", () => {
  it("בלי קבצים: הדף זהה לדף בלי התיקייה בכלל", () => {
    inSite({});
    const empty = render("terms");
    vi.spyOn(process, "cwd").mockReturnValue(join(root, "nope"));
    expect(render("terms")).toBe(empty);
    expect(empty).toContain('id="cancellation"');
  });

  it("החלפה מלאה: הטקסט שלי במקום הסעיפים של התבנית, הכותרת והתאריך נשארים", () => {
    inSite({
      "terms.md": [
        "# תקנון",
        "פתיח שלי לתקנון.",
        "",
        "## תנאים כלליים",
        "השימוש **באחריות** המשתמש.",
        "- סעיף אחד",
        "- סעיף שני",
        "",
        "## ביטול",
        "לפי החוק.",
      ].join("\n"),
    });
    const html = render("terms");
    expect(html).toContain("<h1");
    expect(html).toContain("תקנון ותנאי שימוש");
    expect(html).toContain("עודכן לאחרונה");
    expect(html).toContain("פתיח שלי לתקנון.");
    expect(html).toContain("<strong>באחריות</strong>");
    expect(html).toMatch(/<li><span>סעיף אחד<\/span><\/li>/);
    expect(html).toContain('id="own-1"');
    expect(html).toContain('href="#own-2"');
    // סעיפי התבנית והפתיח שלה לא מופיעים
    expect(html).not.toContain('id="cancellation"');
    expect(html).not.toContain("השימוש באתר");
    expect(html).not.toContain("כתוב בלשון רבים");
    // פרטי העסק מה-config בסוף
    expect(html).toContain('id="own-business"');
    expect(html.indexOf('id="own-2"')).toBeLessThan(
      html.indexOf('id="own-business"'),
    );
  });

  it("אין HTML גולמי: תגיות מוצגות כטקסט", () => {
    inSite({
      "privacy.md": '## א\n<script>alert(1)</script> <b onclick="x">ב</b>',
    });
    const html = render("privacy");
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<b onclick");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("תוספות: אחרי כל סעיפי התבנית, ובתוכן העניינים", () => {
    inSite({ "data-deletion.additions.md": "## מחיקה מגיבויים\nתוך 90 יום." });
    const html = render("data-deletion");
    expect(html).toContain('id="how"');
    expect(html).toContain('id="mailing"');
    expect(html).toContain('href="#add-1"');
    expect(html).toContain("תוך 90 יום.");
    expect(html.indexOf('id="mailing"')).toBeLessThan(
      html.indexOf('id="add-1"'),
    );
    // הפתיח של התבנית נשאר
    expect(html).toContain("כאן מוסבר איך");
  });

  it("קובץ של דף אחד לא משפיע על דף אחר", () => {
    inSite({ "accessibility.md": "## הצהרה שלי\nטקסט" });
    expect(render("accessibility")).toContain("הצהרה שלי");
    expect(render("terms")).not.toContain("הצהרה שלי");
    expect(render("terms")).toContain('id="cancellation"');
  });
});
