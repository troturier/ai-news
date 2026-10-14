"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { articles, comments, reports } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

const id = z.uuid();

export async function setArticleStatus(articleId: string, status: "published" | "hidden") {
  await requireAdmin();
  const input = z.object({ id, status: z.enum(["published", "hidden"]) }).parse({ id: articleId, status });
  await db.update(articles).set({ status: input.status }).where(eq(articles.id, input.id));
  revalidatePath("/", "layout");
}

export async function setCommentStatus(commentId: string, status: "visible" | "hidden") {
  await requireAdmin();
  const input = z.object({ id, status: z.enum(["visible", "hidden"]) }).parse({ id: commentId, status });
  await db.update(comments).set({ status: input.status }).where(eq(comments.id, input.id));
  revalidatePath("/", "layout");
}

export async function resolveReport(reportId: string) {
  await requireAdmin();
  id.parse(reportId);
  await db.update(reports).set({ resolvedAt: new Date() }).where(eq(reports.id, reportId));
  revalidatePath("/", "layout");
}

/** Removes an article's illustration (unsuitable image): the card will show the theme icon. */
export async function removeArticleImage(articleId: string) {
  await requireAdmin();
  id.parse(articleId);
  await db.update(articles).set({ imageUrl: null, imageSource: null }).where(eq(articles.id, articleId));
  revalidatePath("/", "layout");
}
