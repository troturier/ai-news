import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, themes } from "@/db/schema";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";

// Read from the database: never frozen at build time.
export const dynamic = "force-dynamic";

const alternates = (path: string) => ({
  languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])),
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [arts, ths] = await Promise.all([
    db.select({ slug: articles.slug, at: articles.publishedAt }).from(articles).where(eq(articles.status, "published")),
    db.select({ slug: themes.slug }).from(themes).where(eq(themes.active, true)),
  ]);
  return [
    ...locales.map((l) => ({ url: `${siteUrl}/${l}`, changeFrequency: "daily" as const, alternates: alternates("") })),
    ...["about", "legal"].flatMap((p) =>
      locales.map((l) => ({ url: `${siteUrl}/${l}/${p}`, changeFrequency: "monthly" as const, alternates: alternates(`/${p}`) })),
    ),
    ...ths.flatMap((t) =>
      locales.map((l) => ({ url: `${siteUrl}/${l}/themes/${t.slug}`, changeFrequency: "weekly" as const, alternates: alternates(`/themes/${t.slug}`) })),
    ),
    ...arts.flatMap((a) =>
      locales.map((l) => ({ url: `${siteUrl}/${l}/articles/${a.slug}`, lastModified: a.at, alternates: alternates(`/articles/${a.slug}`) })),
    ),
  ];
}
