"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { articles, comments, pipelineSettings, reports } from "@/db/schema";
import { FREQUENCIES } from "@/lib/pipeline-schedule";
import { startRun } from "@/pipeline/launcher";
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

/** Starts a generation run now; the live progress is read from `/api/admin/pipeline`. */
export async function startPipelineRun(maxPerTheme: number) {
  await requireAdmin();
  const max = z.number().int().min(1).max(5).parse(maxPerTheme);
  const res = await startRun({ trigger: "manual", maxPerTheme: max });
  revalidatePath("/", "layout");
  return res;
}

const settingsInput = z.object({
  intervalDays: z.number().refine((d) => FREQUENCIES.some((f) => f.days === d)),
  hour: z.number().int().min(0).max(23),
  maxPerTheme: z.number().int().min(1).max(5),
  monthlyBudgetUsd: z.number().int().min(1).max(100_000),
});

/** Saving resets the baseline of the schedule (`updatedAt`): the next run is counted from now. */
export async function savePipelineSettings(input: z.input<typeof settingsInput>) {
  await requireAdmin();
  const v = settingsInput.parse(input);
  await db
    .insert(pipelineSettings)
    .values({ id: 1, ...v })
    .onConflictDoUpdate({ target: pipelineSettings.id, set: { ...v, updatedAt: new Date() } });
  revalidatePath("/", "layout");
}
