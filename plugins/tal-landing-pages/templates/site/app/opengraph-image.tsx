import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/site.config";
import { FALLBACK_TITLE, absoluteUrl, ogTexts } from "@/lib/seo";
import { bidiUnits, visualText } from "@/lib/bidi";
import { isFilled } from "@/lib/todo";

/*
 * תמונת השיתוף (וואטסאפ, פייסבוק, לינקדאין). נוצרת בזמן הבנייה מתוך site.config.
 *
 * חוקים של satori (המנוע שמצייר אותה):
 * - כל div עם 2 ילדים או יותר חייב display: flex.
 * - הוא לא מכיר כיווניות: מצייר כל תו משמאל לימין. לכן כל טקסט עובר דרך <Bidi>
 *   (ראו lib/bidi.ts ו-TEMPLATE.md). לא לשים טקסט עברי ישירות בתוך div.
 * - פונטים רק ttf/otf/woff (לא woff2). Rubik מגיע מ-@fontsource/rubik.
 */

const { title, subtitle, name } = ogTexts(site);

export const alt = title || FALLBACK_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = join(process.cwd(), "node_modules/@fontsource/rubik/files");
const font = (file: string) => readFile(join(FONT_DIR, file));

// עברית ולטינית הם קבצים נפרדים. שמות שונים, כדי ש-satori ישתמש בשניהם (לפי התו)
const [heb700, heb400, lat700, lat400] = await Promise.all([
  font("rubik-hebrew-700-normal.woff"),
  font("rubik-hebrew-400-normal.woff"),
  font("rubik-latin-700-normal.woff"),
  font("rubik-latin-400-normal.woff"),
]);

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v: string, fallback: string) => (HEX.test(v) ? v : fallback);
const brand = {
  primary: color(site.brand.primary, "#0F766E"),
  secondary: color(site.brand.secondary, "#334155"),
  accent: color(site.brand.accent, "#B45309"),
  background: color(site.brand.background, "#FAFAF9"),
  text: color(site.brand.text, "#1E293B"),
};

/** גודל הכותרת לפי האורך, כדי שתיכנס בשלוש שורות לכל היותר */
function titleSize(text: string): number {
  const n = text.length;
  if (n <= 20) return 88;
  if (n <= 40) return 72;
  if (n <= 70) return 60;
  return 50;
}

/** קיצור עם "…" לטקסט ארוך מדי */
function clip(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max
    ? text
    : chars
        .slice(0, max - 1)
        .join("")
        .trimEnd() + "…";
}

/**
 * טקסט מימין לשמאל ב-satori: כל יחידה (מילה עברית, רצף אנגלית, סימן)
 * היא פריט flex, ו-row-reverse + wrap מסדר אותן מימין לשמאל ושובר שורות כמו בעברית.
 * בתוך יחידה עברית האותיות כבר הפוכות (visualText), כי satori מצייר משמאל לימין.
 */
function Bidi({
  text,
  fontSize,
  fontWeight,
  color: fill,
  lineHeight = 1.2,
}: {
  text: string;
  fontSize: number;
  fontWeight: 400 | 700;
  color: string;
  lineHeight?: number;
}) {
  const space = Math.round(fontSize * 0.27);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        width: "100%",
        fontSize,
        fontWeight,
        color: fill,
        lineHeight,
      }}
    >
      {bidiUnits(text).map((u, i) => (
        <div
          key={i}
          style={{ display: "flex", marginLeft: u.spaceAfter ? space : 0 }}
        >
          {visualText(u)}
        </div>
      ))}
    </div>
  );
}

export default async function Image() {
  const host = isFilled(site.page.url)
    ? new URL(absoluteUrl(site, "/")).host
    : "";
  const mainTitle = clip(title, 110);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row-reverse",
        background: brand.background,
        fontFamily: "RubikLatin, RubikHebrew",
      }}
    >
      {/* פס מותג בצד ימין */}
      <div style={{ display: "flex", width: 28, background: brand.primary }} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px 64px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 96,
              height: 10,
              borderRadius: 5,
              background: brand.accent,
              marginBottom: 40,
            }}
          />
          {mainTitle ? (
            <Bidi
              text={mainTitle}
              fontSize={titleSize(mainTitle)}
              fontWeight={700}
              color={brand.text}
              lineHeight={1.15}
            />
          ) : null}
          {subtitle ? (
            <div style={{ display: "flex", marginTop: 28, width: "100%" }}>
              <Bidi
                text={clip(subtitle, 120)}
                fontSize={40}
                fontWeight={400}
                color={brand.secondary}
                lineHeight={1.3}
              />
            </div>
          ) : null}
        </div>

        {/* שורה תחתונה: שם העסק מימין, כתובת האתר משמאל */}
        <div
          style={{
            display: "flex",
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", width: 760 }}>
            {name ? (
              <Bidi
                text={clip(name, 50)}
                fontSize={34}
                fontWeight={700}
                color={brand.primary}
              />
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 400,
              color: brand.secondary,
            }}
          >
            {host}
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "RubikHebrew", data: heb700, weight: 700, style: "normal" },
        { name: "RubikHebrew", data: heb400, weight: 400, style: "normal" },
        { name: "RubikLatin", data: lat700, weight: 700, style: "normal" },
        { name: "RubikLatin", data: lat400, weight: 400, style: "normal" },
      ],
    },
  );
}
