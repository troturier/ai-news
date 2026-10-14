import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { readingListItems, readingLists } from "@/db/schema";
import { ThemeIcon } from "@/components/icon";
import type { ListChoice } from "@/components/list-menu";
import type { Locale } from "@/i18n/config";
import { listUserLists, readArticleIds } from "@/lib/user-data";

export type CardUser = {
  lists: ListChoice[];
  readIds: Set<string>;
  memberships: Map<string, string[]>; // article -> lists that contain it
};

/** User-specific data for a page of cards (read states, list membership). */
export async function loadCardUser(userId: string, articleIds: string[], lang: Locale): Promise<CardUser> {
  const [lists, readIds, rows] = await Promise.all([
    listUserLists(userId, lang),
    readArticleIds(userId, articleIds),
    articleIds.length
      ? db
          .select({ listId: readingListItems.listId, articleId: readingListItems.articleId })
          .from(readingListItems)
          .innerJoin(readingLists, eq(readingLists.id, readingListItems.listId))
          .where(and(eq(readingLists.userId, userId), inArray(readingListItems.articleId, articleIds)))
      : [],
  ]);
  const memberships = new Map<string, string[]>();
  for (const r of rows) memberships.set(r.articleId, [...(memberships.get(r.articleId) ?? []), r.listId]);
  return {
    lists: lists.map((l) => ({ id: l.id, name: l.name, color: l.color, icon: <ThemeIcon name={l.icon} size={16} /> })),
    readIds,
    memberships,
  };
}
