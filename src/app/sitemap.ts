import type { MetadataRoute } from "next";
import { articles } from "../features/knowledge/articles";
import { siteOrigin } from "../lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return origin
    ? ["/knowledge", ...articles.filter((a) => a.published).map((a) => `/knowledge/${a.slug}`)].map((path) => ({
        url: origin + path,
      }))
    : [];
}
