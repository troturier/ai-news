import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, themes } from "@/db/schema";

export const listThemes = () =>
  db.select().from(themes).where(eq(themes.active, true)).orderBy(asc(themes.position));

export async function listSubscribedThemeIds(userId: string) {
  const rows = await db
    .select({ id: subscriptions.themeId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
  return rows.map((r) => r.id);
}
