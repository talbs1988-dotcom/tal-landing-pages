import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Rubik } from "next/font/google";
import { site } from "@/site.config";
import { siteUrl } from "@/lib/siteUrl";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import { MetaPixel } from "@/components/MetaPixel";
import "./globals.css";

// הפונט נארז בזמן הבנייה ומוגש מהאתר עצמו. הדפדפן לא פונה לגוגל.
const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  display: "swap",
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(site.page.url),
  title: site.page.title,
  description: site.page.description,
};

const HEX = /^#[0-9a-f]{6}$/i;

/** צבעי המותג מה-config, כמשתני CSS. ערך שאינו hex תקין נשאר עם ברירת המחדל של globals.css */
function brandVars(): CSSProperties {
  const map: Record<string, string> = {
    "--brand-primary": site.brand.primary,
    "--brand-secondary": site.brand.secondary,
    "--brand-accent": site.brand.accent,
    "--brand-background": site.brand.background,
    "--brand-text": site.brand.text,
  };
  return Object.fromEntries(
    Object.entries(map).filter(([, v]) => HEX.test(v)),
  ) as CSSProperties;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable} style={brandVars()}>
      <body className="flex min-h-dvh flex-col antialiased">
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <CookieBanner />
        <MetaPixel />
      </body>
    </html>
  );
}
