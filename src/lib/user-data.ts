import "server-only";
import { and, asc, count, desc, eq, inArray, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articleReactions,
  articleReads,
  articleTranslations,
  articles,
  comments,
  readingListItems,
  readingLists,
  themes,
  user,
} from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { PAGE_SIZE } from "@/lib/articles";
import { localizeList } from "@/lib/list-name";

export async function getUserArticleState(userId: string, articleId: string) {
  const [read, reaction, memberships] = await Promise.all([
    db.select({ at: articleReads.readAt }).from(articleReads)
      .where(and(eq(articleReads.userId, userId), eq(articleReads.articleId, articleId))).limit(1),
    db.select({ value: articleReactions.value }).from(articleReactions)
      .where(and(eq(articleReactions.userId, userId), eq(articleReactions.articleId, articleId))).limit(1),
    db.select({ listId: readingListItems.listId }).from(readingListItems)
      .innerJoin(readingLists, eq(readingLists.id, readingListItems.listId))
      .where(and(eq(readingLists.userId, userId), eq(readingListItems.articleId, articleId))),
  ]);
  return {
    read: read.length > 0,
    reaction: (reaction[0]?.value ?? 0) as -1 | 0 | 1,
    listIds: memberships.map((m) => m.listId),
  };
}

export async function readArticleIds(userId: string, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await db.select({ id: articleReads.articleId }).from(articleReads)
    .where(and(eq(articleReads.userId, userId), inArray(articleReads.articleId, ids)));
  return new Set(rows.map((r) => r.id));
}

/** The user's lists, with the number of published articles and the number of not-yet-read articles. */
export async function listUserLists(userId: string, lang: Locale) {
  const lists = await db.select().from(readingLists)
    .where(eq(readingLists.userId, userId))
    .orderBy(desc(readingLists.isDefault), asc(readingLists.position), asc(readingLists.createdAt));
  if (!lists.length) return [];
  const ids = lists.map((l) => l.id);
  const unreadFilter = notExists(
    db.select({ one: sql`1` }).from(articleReads)
      .where(and(eq(articleReads.articleId, articles.id), eq(articleReads.userId, userId))),
  );
  const [counts, unreads] = await Promise.all([
    db.select({ listId: readingListItems.listId, n: count() }).from(readingListItems)
      .innerJoin(articles, eq(articles.id, readingListItems.articleId))
      .where(and(inArray(readingListItems.listId, ids), eq(articles.status, "published")))
      .groupBy(readingListItems.listId),
    db.select({ listId: readingListItems.listId, n: count() }).from(readingListItems)
      .innerJoin(articles, eq(articles.id, readingListItems.articleId))
      .where(and(inArray(readingListItems.listId, ids), eq(articles.status, "published"), unreadFilter))
      .groupBy(readingListItems.listId),
  ]);
  const total = new Map(counts.map((c) => [c.listId, c.n]));
  const unread = new Map(unreads.map((c) => [c.listId, c.n]));
  return lists.map((l) => ({ ...localizeList(l, lang), count: total.get(l.id) ?? 0, unread: unread.get(l.id) ?? 0 }));
}

export async function getUserList(userId: string, listId: string, lang: Locale) {
  const [l] = await db.select().from(readingLists)
    .where(and(eq(readingLists.id, listId), eq(readingLists.userId, userId))).limit(1);
  return l ? localizeList(l, lang) : null;
}

const itemColumns = {
  id: articles.id,
  slug: articles.slug,
  imageUrl: articles.imageUrl,
  title: articleTranslations.title,
  summary: articleTranslations.summary,
  publishedAt: articles.publishedAt,
  addedAt: readingListItems.addedAt,
  themeSlug: themes.slug,
  themeNames: themes.names,
  color: themes.color,
  icon: themes.icon,
  chars: articleTranslations.body,
};

const itemsQuery = (listId: string, lang: Locale, extra?: ReturnType<typeof notExists>) =>
  db
    .select(itemColumns)
    .from(readingListItems)
    .innerJoin(articles, eq(articles.id, readingListItems.articleId))
    .innerJoin(articleTranslations, and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, lang)))
    .innerJoin(themes, eq(themes.id, articles.themeId))
    .where(and(eq(readingListItems.listId, listId), eq(articles.status, "published"), extra));

/** All published articles of a list (Markdown export). */
export async function listItems(listId: string, lang: Locale) {
  return itemsQuery(listId, lang).orderBy(desc(readingListItems.addedAt));
}

export type ListSort = "added" | "oldest" | "published";

/** A page of articles from a list: sort of choice, "hide already-read articles" option. */
export async function listItemsPage(opts: {
  listId: string;
  lang: Locale;
  page: number;
  sort: ListSort;
  excludeReadBy?: string;
}) {
  const unread = opts.excludeReadBy
    ? notExists(
        db.select({ one: sql`1` }).from(articleReads)
          .where(and(eq(articleReads.articleId, articles.id), eq(articleReads.userId, opts.excludeReadBy))),
      )
    : undefined;
  const order =
    opts.sort === "oldest" ? asc(readingListItems.addedAt)
    : opts.sort === "published" ? desc(articles.publishedAt)
    : desc(readingListItems.addedAt);
  const [items, [{ total }]] = await Promise.all([
    itemsQuery(opts.listId, opts.lang, unread).orderBy(order).limit(PAGE_SIZE).offset((opts.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(readingListItems)
      .innerJoin(articles, eq(articles.id, readingListItems.articleId))
      .where(and(eq(readingListItems.listId, opts.listId), eq(articles.status, "published"), unread)),
  ]);
  return { items, total };
}

export async function listComments(articleId: string) {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      author: user.name,
    })
    .from(comments)
    .innerJoin(user, eq(user.id, comments.userId))
    .where(and(eq(comments.articleId, articleId), eq(comments.status, "visible")))
    .orderBy(asc(comments.createdAt));
}

export async function reactionTotals(articleId: string) {
  const rows = await db.select({ value: articleReactions.value, n: count() }).from(articleReactions)
    .where(eq(articleReactions.articleId, articleId)).groupBy(articleReactions.value);
  return {
    up: rows.find((r) => r.value === 1)?.n ?? 0,
    down: rows.find((r) => r.value === -1)?.n ?? 0,
  };
}
