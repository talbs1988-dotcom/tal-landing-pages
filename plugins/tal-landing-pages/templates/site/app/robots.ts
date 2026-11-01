import type { MetadataRoute } from "next";
import { site } from "@/site.config";
import { buildRobots } from "@/lib/seo";

// /robots.txt: הכול פתוח חוץ מ-/thank-you ו-/api/
export default function robots(): MetadataRoute.Robots {
  return buildRobots(site);
}
