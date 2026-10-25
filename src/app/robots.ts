import type { MetadataRoute } from "next";
import { siteOrigin } from "../lib/site";
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/knowledge",
      disallow: ["/$", "/study", "/library", "/progress", "/settings", "/lessons"],
    },
    ...(origin ? { sitemap: origin + "/sitemap.xml" } : {}),
  };
}
