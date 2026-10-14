"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { subscriptions, themes, user } from "@/db/schema";
import { getSession } from "@/lib/session";

const input = z.object({ themeIds: z.array(z.uuid()).max(100) });

/** Replaces the user's subscriptions and marks onboarding as complete. */
export async function saveThemes(raw: unknown) {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  const { themeIds } = input.parse(raw);
  const userId = session.user.id;

  // Only existing, active themes are kept.
  const valid = themeIds.length
    ? (
        await db
          .select({ id: themes.id })
          .from(themes)
          .where(and(inArray(themes.id, themeIds), eq(themes.active, true)))
      ).map((t) => t.id)
    : [];

  await db.transaction(async (tx) => {
    if (valid.length) {
      await tx
        .delete(subscriptions)
        .where(
          and(eq(subscriptions.userId, userId), notInArray(subscriptions.themeId, valid)),
        );
      await tx
        .insert(subscriptions)
        .values(valid.map((themeId) => ({ userId, themeId })))
        .onConflictDoNothing();
    } else {
      await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    }
    if (!session.user.onboardedAt) {
      await tx.update(user).set({ onboardedAt: new Date() }).where(eq(user.id, userId));
    }
  });
  revalidatePath("/", "layout");
}
