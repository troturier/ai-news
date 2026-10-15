import "server-only";
import { and, count, desc, eq, inArray, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import { articleReactions, articleReads, articleTranslations, articles, comments, themes, type ArticleSource } from "@/db/schema";
import type { Locale } from "@/i18n/config";

export const PAGE_SIZE = 12;

const published = eq(articles.status, "published");

/** Excludes the articles this user has already read. */
const unreadBy = (userId?: string) =>
  userId
    ? notExists(
        db
          .select({ one: sql`1` })
          .from(articleReads)
          .where(and(eq(articleReads.articleId, articles.id), eq(articleReads.userId, userId))),
      )
    : undefined;

// ~220 words/minute, ~6 characters per word.
const readingMinutes = (chars: number) => Math.max(1, Math.round(chars / 1300));

/** What readers did with an article: "interesting" / "not interesting" votes and visible comments. */
export type ArticleStats = { up: number; down: number; comments: number };

/** Votes and comment counts of a page of articles (two grouped queries, whatever the page size). */
export async function articleStats(ids: string[]): Promise<Map<string, ArticleStats>> {
  const out = new Map<string, ArticleStats>(ids.map((id) => [id, { up: 0, down: 0, comments: 0 }]));
  if (!ids.length) return out;
  const [votes, discussed] = await Promise.all([
    db
      .select({
        articleId: articleReactions.articleId,
        up: sql<number>`count(*) filter (where ${articleReactions.value} = 1)`.mapWith(Number),
        down: sql<number>`count(*) filter (where ${articleReactions.value} = -1)`.mapWith(Number),
      })
      .from(articleReactions)
      .where(inArray(articleReactions.articleId, ids))
      .groupBy(articleReactions.articleId),
    db
      .select({ articleId: comments.articleId, n: count() })
      .from(comments)
      .where(and(inArray(comments.articleId, ids), eq(comments.status, "visible")))
      .groupBy(comments.articleId),
  ]);
  for (const v of votes) Object.assign(out.get(v.articleId)!, { up: v.up, down: v.down });
  for (const c of discussed) out.get(c.articleId)!.comments = c.n;
  return out;
}

export type ArticleListItem = {
  id: string;
  slug: string;
  imageUrl: string | null;
  title: string;
  summary: string;
  publishedAt: Date;
  minutes: number;
  theme: { slug: string; name: string; color: string; icon: string };
  stats?: ArticleStats; // present on list pages (cards)
};

export async function listArticles(opts: {
  lang: Locale;
  themeSlug?: string;
  themeIds?: string[]; // personalized feed: followed themes
  excludeReadBy?: string; // hide articles already read by this user
  page: number;
  limit?: number;
}): Promise<{ items: ArticleListItem[]; total: number }> {
  const where = and(
    published,
    opts.themeSlug ? eq(themes.slug, opts.themeSlug) : undefined,
    opts.themeIds ? inArray(articles.themeId, opts.themeIds) : undefined,
    unreadBy(opts.excludeReadBy),
  );
  const base = db
    .select({
      id: articles.id,
      slug: articles.slug,
      imageUrl: articles.imageUrl,
      title: articleTranslations.title,
      summary: articleTranslations.summary,
      publishedAt: articles.publishedAt,
      chars: articleTranslations.body,
      themeSlug: themes.slug,
      themeNames: themes.names,
      color: themes.color,
      icon: themes.icon,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, opts.lang)),
    )
    .innerJoin(themes, eq(themes.id, articles.themeId))
    .where(where);

  const [rows, [{ total }]] = await Promise.all([
    base
      .orderBy(desc(articles.publishedAt))
      .limit(opts.limit ?? PAGE_SIZE)
      .offset((opts.page - 1) * (opts.limit ?? PAGE_SIZE)),
    db
      .select({ total: count() })
      .from(articles)
      .innerJoin(themes, eq(themes.id, articles.themeId))
      .where(where),
  ]);

  const stats = await articleStats(rows.map((r) => r.id));
  return {
    total,
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      imageUrl: r.imageUrl,
      title: r.title,
      summary: r.summary,
      publishedAt: r.publishedAt,
      minutes: readingMinutes(r.chars.length),
      theme: { slug: r.themeSlug, name: r.themeNames[opts.lang], color: r.color, icon: r.icon },
      stats: stats.get(r.id),
    })),
  };
}

export type ArticleDetail = ArticleListItem & {
  imageSource: string | null;
  body: string;
  tags: string[];
  sources: ArticleSource[];
};

export async function getArticle(slug: string, lang: Locale): Promise<ArticleDetail | null> {
  const [r] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      imageUrl: articles.imageUrl,
      imageSource: articles.imageSource,
      title: articleTranslations.title,
      summary: articleTranslations.summary,
      body: articleTranslations.body,
      publishedAt: articles.publishedAt,
      tags: articles.tags,
      sources: articles.sources,
      themeSlug: themes.slug,
      themeNames: themes.names,
      color: themes.color,
      icon: themes.icon,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, lang)),
    )
    .innerJoin(themes, eq(themes.id, articles.themeId))
    .where(and(published, eq(articles.slug, slug)))
    .limit(1);
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    imageUrl: r.imageUrl,
    imageSource: r.imageSource,
    title: r.title,
    summary: r.summary,
    body: r.body,
    publishedAt: r.publishedAt,
    tags: r.tags,
    sources: r.sources,
    minutes: readingMinutes(r.body.length),
    theme: { slug: r.themeSlug, name: r.themeNames[lang], color: r.color, icon: r.icon },
  };
}

/** Full-text search (Postgres) in the requested language, sorted by relevance then by date. */
export async function searchArticles(opts: {
  lang: Locale;
  q: string;
  excludeReadBy?: string;
  page: number;
}): Promise<{ items: ArticleListItem[]; total: number }> {
  const cfg = opts.lang === "fr" ? sql`'french'::regconfig` : sql`'english'::regconfig`;
  const query = sql`websearch_to_tsquery(${cfg}, ${opts.q})`;
  const match = sql`"article_translations"."search" @@ ${query}`;
  const where = and(published, match, unreadBy(opts.excludeReadBy));

  const base = db
    .select({
      id: articles.id,
      slug: articles.slug,
      imageUrl: articles.imageUrl,
      title: articleTranslations.title,
      summary: articleTranslations.summary,
      publishedAt: articles.publishedAt,
      chars: articleTranslations.body,
      themeSlug: themes.slug,
      themeNames: themes.names,
      color: themes.color,
      icon: themes.icon,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, opts.lang)),
    )
    .innerJoin(themes, eq(themes.id, articles.themeId))
    .where(where);

  const [rows, [{ total }]] = await Promise.all([
    base
      .orderBy(sql`ts_rank_cd("article_translations"."search", ${query}) desc`, desc(articles.publishedAt))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(articles)
      .innerJoin(
        articleTranslations,
        and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, opts.lang)),
      )
      .where(where),
  ]);

  const stats = await articleStats(rows.map((r) => r.id));
  return {
    total,
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      imageUrl: r.imageUrl,
      title: r.title,
      summary: r.summary,
      publishedAt: r.publishedAt,
      minutes: readingMinutes(r.chars.length),
      theme: { slug: r.themeSlug, name: r.themeNames[opts.lang], color: r.color, icon: r.icon },
      stats: stats.get(r.id),
    })),
  };
}

/**
 * Related articles: same theme (+1) and shared tags (+2 per tag, case-insensitive comparison).
 * At least one of the two is required; sorted by score then by date.
 */
export async function relatedArticles(opts: {
  articleId: string;
  themeSlug: string;
  tags: string[];
  lang: Locale;
  limit?: number;
}): Promise<ArticleListItem[]> {
  const tags = opts.tags.map((t) => t.toLowerCase());
  // A JS array passed as-is would be expanded into a "($1, $2)" list: we build array[...] explicitly.
  const tagArray = sql`array[${sql.join(tags.map((t) => sql`${t}`), sql`, `)}]::text[]`;
  const shared = sql`cardinality(array(
    select lower(x) from unnest(${articles.tags}) x
    intersect select y from unnest(${tagArray}) y))`;
  const score = sql<number>`(case when ${themes.slug} = ${opts.themeSlug} then 1 else 0 end) + 2 * ${shared}`;

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      imageUrl: articles.imageUrl,
      title: articleTranslations.title,
      summary: articleTranslations.summary,
      publishedAt: articles.publishedAt,
      chars: articleTranslations.body,
      themeSlug: themes.slug,
      themeNames: themes.names,
      color: themes.color,
      icon: themes.icon,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, opts.lang)),
    )
    .innerJoin(themes, eq(themes.id, articles.themeId))
    .where(and(published, sql`${articles.id} <> ${opts.articleId}`, sql`${score} > 0`))
    .orderBy(desc(score), desc(articles.publishedAt))
    .limit(opts.limit ?? 3);

  const stats = await articleStats(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    imageUrl: r.imageUrl,
    title: r.title,
    summary: r.summary,
    publishedAt: r.publishedAt,
    minutes: readingMinutes(r.chars.length),
    theme: { slug: r.themeSlug, name: r.themeNames[opts.lang], color: r.color, icon: r.icon },
    stats: stats.get(r.id),
  }));
}
