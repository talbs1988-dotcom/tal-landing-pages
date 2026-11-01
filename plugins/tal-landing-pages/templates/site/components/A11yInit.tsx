import { a11yInitScript } from "@/lib/a11y";

/**
 * מחיל את העדפות הנגישות השמורות (גודל טקסט, ניגודיות וכו') לפני שהדף מצויר,
 * כדי שלא יהיה הבהוב. יושב ראשון ב-body. בגלל שהוא משנה את ה-class של <html>
 * לפני ש-React מתחבר, על <html> יש suppressHydrationWarning.
 */
export function A11yInit() {
  return <script dangerouslySetInnerHTML={{ __html: a11yInitScript() }} />;
}
