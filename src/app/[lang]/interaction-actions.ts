"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import {
  articleReactions,
  articleReads,
  articles,
  comments,
  readingListItems,
  readingLists,
  reports,
} from "@/db/schema";
import { isValidIcon } from "@/lib/icons";
import { getSession } from "@/lib/session";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  return session.user;
}

/** The article must exist and be published. */
async function assertPublished(articleId: string) {
  const [a] = await db.select({ id: articles.id }).from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.status, "published"))).limit(1);
  if (!a) throw new Error("not_found");
}

const id = z.uuid();

export async function markRead(articleId: string, read: boolean) {
  const u = await requireUser();
  z.uuid().parse(articleId);
  if (read) {
    await assertPublished(articleId);
    await db.insert(articleReads).values({ userId: u.id, articleId }).onConflictDoNothing();
  } else {
    await db.delete(articleReads).where(and(eq(articleReads.userId, u.id), eq(articleReads.articleId, articleId)));
  }
  revalidatePath("/", "layout");
}

export async function setReaction(articleId: string, value: 1 | -1 | 0) {
  const u = await requireUser();
  const input = z.object({ articleId: id, value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) })
    .parse({ articleId, value });
  if (input.value === 0) {
    await db.delete(articleReactions).where(and(eq(articleReactions.userId, u.id), eq(articleReactions.articleId, articleId)));
  } else {
    await assertPublished(articleId);
    await db.insert(articleReactions).values({ userId: u.id, articleId, value: input.value })
      .onConflictDoUpdate({ target: [articleReactions.userId, articleReactions.articleId], set: { value: input.value } });
  }
  revalidatePath("/", "layout");
}

export async function toggleInList(listId: string, articleId: string, on: boolean) {
  const u = await requireUser();
  z.object({ listId: id, articleId: id }).parse({ listId, articleId });
  // The list must belong to the user.
  const [list] = await db.select({ id: readingLists.id }).from(readingLists)
    .where(and(eq(readingLists.id, listId), eq(readingLists.userId, u.id))).limit(1);
  if (!list) throw new Error("not_found");
  if (on) {
    await assertPublished(articleId);
    await db.insert(readingListItems).values({ listId, articleId }).onConflictDoNothing();
  } else {
    await db.delete(readingListItems).where(and(eq(readingListItems.listId, listId), eq(readingListItems.articleId, articleId)));
  }
  revalidatePath("/", "layout");
}

/* ------------------------------ Lists ------------------------------ */

const listInput = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().refine(isValidIcon, "icône inconnue"),
});
const MAX_LISTS = 30;

export async function createList(raw: unknown) {
  const u = await requireUser();
  const input = listInput.parse(raw);
  const [{ n }] = await db.select({ n: count() }).from(readingLists).where(eq(readingLists.userId, u.id));
  if (n >= MAX_LISTS) throw new Error("too_many_lists");
  const [row] = await db.insert(readingLists).values({ ...input, userId: u.id, position: n }).returning({ id: readingLists.id });
  revalidatePath("/", "layout");
  return row.id;
}

/** The default list can be renamed, recolored and given a new icon, but not deleted. */
export async function updateList(listId: string, raw: unknown) {
  const u = await requireUser();
  const input = listInput.parse(raw);
  z.uuid().parse(listId);
  const [current] = await db.select({ isDefault: readingLists.isDefault }).from(readingLists)
    .where(and(eq(readingLists.id, listId), eq(readingLists.userId, u.id))).limit(1);
  if (!current) throw new Error("not_found");
  // Default list: name and icon frozen, only the color changes.
  await db.update(readingLists).set(current.isDefault ? { color: input.color } : input)
    .where(and(eq(readingLists.id, listId), eq(readingLists.userId, u.id)));
  revalidatePath("/", "layout");
}

/**
 * Saves a new order for the user's lists. `orderedIds` contains exactly their custom lists
 * (the default list always stays on top, position 0). Positions are renumbered
 * 1..n, which also repairs any duplicates or gaps.
 */
export async function reorderLists(orderedIds: unknown) {
  const u = await requireUser();
  const ids = z.array(z.uuid()).max(100).parse(orderedIds);
  const mine = await db
    .select({ id: readingLists.id, isDefault: readingLists.isDefault })
    .from(readingLists)
    .where(eq(readingLists.userId, u.id));
  const movable = new Set(mine.filter((l) => !l.isDefault).map((l) => l.id));
  if (ids.length !== movable.size || new Set(ids).size !== ids.length || !ids.every((i) => movable.has(i))) {
    throw new Error("invalid_order");
  }
  await db.transaction(async (tx) => {
    await tx.update(readingLists).set({ position: 0 }).where(and(eq(readingLists.userId, u.id), eq(readingLists.isDefault, true)));
    for (const [index, listId] of ids.entries()) {
      await tx.update(readingLists).set({ position: index + 1 }).where(and(eq(readingLists.id, listId), eq(readingLists.userId, u.id)));
    }
  });
  revalidatePath("/", "layout");
}

export async function deleteList(listId: string) {
  const u = await requireUser();
  z.uuid().parse(listId);
  await db.delete(readingLists)
    .where(and(eq(readingLists.id, listId), eq(readingLists.userId, u.id), eq(readingLists.isDefault, false)));
  revalidatePath("/", "layout");
}

/* --------------------------- Comments --------------------------- */

const COMMENTS_PER_MINUTE = 3;

export async function addComment(articleId: string, body: string) {
  const u = await requireUser();
  const input = z.object({ articleId: id, body: z.string().trim().min(1).max(2000) }).parse({ articleId, body });
  await assertPublished(articleId);
  const since = new Date(Date.now() - 60_000);
  const [{ n }] = await db.select({ n: count() }).from(comments)
    .where(and(eq(comments.userId, u.id), gte(comments.createdAt, since)));
  if (n >= COMMENTS_PER_MINUTE) throw new Error("rate_limited");
  await db.insert(comments).values({ articleId: input.articleId, userId: u.id, body: input.body });
  revalidatePath("/", "layout");
}

export async function deleteComment(commentId: string) {
  const u = await requireUser();
  z.uuid().parse(commentId);
  const where = u.role === "admin"
    ? eq(comments.id, commentId)
    : and(eq(comments.id, commentId), eq(comments.userId, u.id));
  await db.delete(comments).where(where);
  revalidatePath("/", "layout");
}

export async function reportContent(targetType: "article" | "comment", targetId: string, reason: string) {
  const u = await requireUser();
  const input = z.object({
    targetType: z.enum(["article", "comment"]),
    targetId: id,
    reason: z.string().trim().min(3).max(500),
  }).parse({ targetType, targetId, reason });
  await db.insert(reports).values({ ...input, userId: u.id }).onConflictDoNothing();
}

/** "Hide read articles" preference (cookie: no sensitive data, valid for the whole site). */
export async function setHideRead(hide: boolean) {
  await requireUser();
  const jar = await cookies();
  if (hide) jar.set("hide_read", "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  else jar.delete("hide_read");
  revalidatePath("/", "layout");
}
