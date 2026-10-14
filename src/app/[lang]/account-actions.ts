"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { verifyUnsubscribeToken } from "@/lib/digest-token";
import { getSession } from "@/lib/session";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  return session.user;
}

export async function updateAccount(raw: unknown) {
  const u = await requireUser();
  const input = z.object({
    name: z.string().trim().min(1).max(80),
    locale: z.enum(["fr", "en"]),
    digestEnabled: z.boolean(),
  }).parse(raw);
  await db.update(user).set({ ...input, updatedAt: new Date() }).where(eq(user.id, u.id));
  revalidatePath("/", "layout");
}

/**
 * Permanent deletion: cascading foreign keys remove the user's sessions, linked accounts,
 * subscriptions, lists, reads, reactions, comments and reports.
 */
export async function deleteAccount(confirmEmail: string) {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  // A stolen session cookie must not be enough to delete the account: require a sign-in from the last 10 minutes.
  if (Date.now() - new Date(session.session.createdAt).getTime() > 10 * 60_000) throw new Error("reauth_required");
  const u = session.user;
  if (confirmEmail.trim().toLowerCase() !== u.email.toLowerCase()) throw new Error("email_mismatch");
  if (u.role === "admin") {
    const [{ n }] = await db.select({ n: count() }).from(user).where(and(eq(user.role, "admin")));
    if (n <= 1) throw new Error("last_admin");
  }
  await db.delete(user).where(eq(user.id, u.id));
}

/** Digest unsubscribe from the e-mail link: the signed token replaces the session. */
export async function unsubscribeDigest(userId: string, token: string) {
  if (!verifyUnsubscribeToken(userId, token)) throw new Error("invalid_token");
  await db.update(user).set({ digestEnabled: false }).where(eq(user.id, userId));
}
