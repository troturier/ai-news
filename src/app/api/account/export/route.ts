import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  articleReactions, articleReads, articles, comments, readingListItems, readingLists,
  reports, subscriptions, themes, user,
} from "@/db/schema";
import { getSession } from "@/lib/session";

/** GDPR export: all data attached to the account, as JSON. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = session.user.id;

  const [profile, subs, reads, reactions, lists, own, reps] = await Promise.all([
    db.select({ name: user.name, email: user.email, locale: user.locale, role: user.role, createdAt: user.createdAt })
      .from(user).where(eq(user.id, id)),
    db.select({ theme: themes.slug, since: subscriptions.createdAt }).from(subscriptions)
      .innerJoin(themes, eq(themes.id, subscriptions.themeId)).where(eq(subscriptions.userId, id)),
    db.select({ article: articles.slug, readAt: articleReads.readAt }).from(articleReads)
      .innerJoin(articles, eq(articles.id, articleReads.articleId)).where(eq(articleReads.userId, id)),
    db.select({ article: articles.slug, value: articleReactions.value, at: articleReactions.createdAt }).from(articleReactions)
      .innerJoin(articles, eq(articles.id, articleReactions.articleId)).where(eq(articleReactions.userId, id)),
    db.select({
      list: readingLists.name, color: readingLists.color, icon: readingLists.icon, isDefault: readingLists.isDefault,
      article: articles.slug, addedAt: readingListItems.addedAt,
    }).from(readingLists)
      .leftJoin(readingListItems, eq(readingListItems.listId, readingLists.id))
      .leftJoin(articles, eq(articles.id, readingListItems.articleId))
      .where(eq(readingLists.userId, id)),
    db.select({ article: articles.slug, body: comments.body, status: comments.status, at: comments.createdAt }).from(comments)
      .innerJoin(articles, eq(articles.id, comments.articleId)).where(eq(comments.userId, id)),
    db.select({ type: reports.targetType, reason: reports.reason, at: reports.createdAt }).from(reports)
      .where(eq(reports.userId, id)),
  ]);

  return new NextResponse(
    JSON.stringify({ exportedAt: new Date().toISOString(), profile: profile[0], subscriptions: subs, reads, reactions, readingLists: lists, comments: own, reports: reps }, null, 2),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ai-news-mes-donnees.json"',
        "Cache-Control": "no-store",
      },
    },
  );
}
