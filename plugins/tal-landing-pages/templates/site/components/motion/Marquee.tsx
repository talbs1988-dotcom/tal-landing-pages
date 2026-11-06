import type { ReactNode } from "react";

/**
 * פס שזז לאט ובלי סוף (לוגואים, צילומי המלצות). CSS בלבד, אז עוצר לבד עם "עצירת אנימציות"
 * ועם הגדרת "פחות תנועה" במכשיר, ונעצר כשהעכבר עליו.
 * התוכן מוכפל פעם אחת בשביל הלולאה, והעותק השני מוסתר מקוראי מסך.
 * reverse = כיוון הפוך (לשתי שורות שזזות זו מול זו).
 */
export function Marquee({ children, seconds = 40, reverse = false, className = "" }: { children: ReactNode; seconds?: number; reverse?: boolean; className?: string }) {
  return (
    <div className={`marquee group relative overflow-hidden ${className}`} style={{ ["--marquee-s" as string]: `${seconds}s` }}>
      <div className={`marquee-track flex w-max gap-6 ${reverse ? "marquee-reverse" : ""}`}>
        <div className="flex shrink-0 gap-6">{children}</div>
        <div className="flex shrink-0 gap-6" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
