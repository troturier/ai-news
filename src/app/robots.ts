import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or technical pages, or pages of no interest to a search engine.
      disallow: ["/api/", "/*/admin", "/*/profile", "/*/lists", "/*/search", "/*/onboarding", "/*/reset-password", "/*/unsubscribe"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
