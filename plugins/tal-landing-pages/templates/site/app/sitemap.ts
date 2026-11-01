import type { MetadataRoute } from "next";
import { site } from "@/site.config";
import { buildSitemap } from "@/lib/seo";

// /sitemap.xml: הדפים הציבוריים. דף התודה לא נכלל
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(site);
}
