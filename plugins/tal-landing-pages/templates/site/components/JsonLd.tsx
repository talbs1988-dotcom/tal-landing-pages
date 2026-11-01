import { site } from "@/site.config";
import { buildJsonLd, serializeJsonLd } from "@/lib/seo";

/**
 * נתונים מובנים לגוגל (Organization או LocalBusiness), מתוך site.config.
 * כל עוד אין שם עסק, לא מוצג כלום. ה-JSON עובר בריחה כדי שלא ייסגר בו ה-script.
 */
export function JsonLd() {
  const data = buildJsonLd(site);
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
