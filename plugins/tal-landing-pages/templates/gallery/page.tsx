import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { RECIPES } from "./_sections";

/*
 * גלריית הסקשנים: דף תצוגה זמני בשלב העיצוב, כמו brand-preview. נמחק לפני סיום השלב.
 * ?only=HeroAurora,PainCards ← רק המתכונים האלה. ?demo=1 ← בצבעי הדוגמה ולא בצבעי העסק.
 */
export const metadata: Metadata = { title: "גלריית סקשנים", robots: { index: false, follow: false } };

const DEMO_BRAND = {
  "--brand-primary": "#7A4E18",
  "--brand-secondary": "#0E1828",
  "--brand-accent": "#C9A063",
  "--brand-background": "#FBF6EC",
  "--brand-text": "#1F2430",
} as CSSProperties;

export default async function GalleryPreview({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const only = sp.only?.split(",").filter(Boolean);
  const list = only ? RECIPES.filter((r) => only.includes(r.id)) : RECIPES;
  return (
    <div style={sp.demo ? DEMO_BRAND : undefined} className="bg-background text-foreground">
      {list.map(({ id, desc, Comp, demo }) => (
        <div key={id} id={id}>
          {!sp.bare && (
            <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-black/10 bg-white/90 px-4 py-2 text-sm text-neutral-800 backdrop-blur" dir="rtl">
              <code className="rounded bg-neutral-900 px-2 py-0.5 text-xs text-white" dir="ltr">{id}</code>
              <span>{desc}</span>
            </div>
          )}
          <Comp text={demo as never} />
        </div>
      ))}
    </div>
  );
}
