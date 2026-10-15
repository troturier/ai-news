import "server-only";
import type { Locale } from "@/i18n/config";
import { listArticles } from "@/lib/articles";
import { siteUrl } from "@/lib/site";

const xml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** RSS 2.0 feed of the latest articles (all themes, or a single one), in the requested language. */
export async function buildFeed(opts: { lang: Locale; theme?: { slug: string; name: string } }) {
  const { lang, theme } = opts;
  const { items } = await listArticles({ lang, themeSlug: theme?.slug, page: 1, limit: 30 });
  const path = theme ? `/${lang}/themes/${theme.slug}/feed.xml` : `/${lang}/feed.xml`;
  const home = theme ? `${siteUrl}/${lang}/themes/${theme.slug}` : `${siteUrl}/${lang}`;
  const title = theme ? `AI News — ${theme.name}` : "AI News";
  const description = lang === "fr" ? "Le journal de l'IA pour vous assister dans votre veille" : "The AI journal that keeps you up to date";

  const body = items
    .map((a) => {
      const url = `${siteUrl}/${lang}/articles/${a.slug}`;
      return `    <item>
      <title>${xml(a.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${a.publishedAt.toUTCString()}</pubDate>
      <category>${xml(a.theme.name)}</category>
      <description>${xml(a.summary)}</description>
    </item>`;
    })
    .join("\n");

  const xmlText = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(title)}</title>
    <link>${xml(home)}</link>
    <description>${xml(description)}</description>
    <language>${lang}</language>
    <atom:link href="${xml(siteUrl + path)}" rel="self" type="application/rss+xml" />
${items[0] ? `    <lastBuildDate>${items[0].publishedAt.toUTCString()}</lastBuildDate>\n` : ""}${body}
  </channel>
</rss>
`;
  return new Response(xmlText, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
