import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { articleTranslations, articles, comments, reports, user } from "@/db/schema";
import { ActionButton } from "@/components/action-button";
import { requireAdmin } from "@/lib/admin";
import { resolveReport, setArticleStatus, setCommentStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminReports({ params }: PageProps<"/[lang]/admin/reports">) {
  const { lang } = await params;
  await requireAdmin();

  const list = await db
    .select({ id: reports.id, type: reports.targetType, targetId: reports.targetId, reason: reports.reason, at: reports.createdAt, resolvedAt: reports.resolvedAt, by: user.name })
    .from(reports).innerJoin(user, eq(user.id, reports.userId))
    .orderBy(desc(reports.createdAt)).limit(100);

  const articleIds = list.filter((r) => r.type === "article").map((r) => r.targetId);
  const commentIds = list.filter((r) => r.type === "comment").map((r) => r.targetId);
  const [arts, coms] = await Promise.all([
    articleIds.length
      ? db.select({ id: articles.id, slug: articles.slug, status: articles.status, title: articleTranslations.title })
          .from(articles)
          .innerJoin(articleTranslations, and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, "fr")))
          .where(inArray(articles.id, articleIds))
      : [],
    commentIds.length
      ? db.select({ id: comments.id, body: comments.body, status: comments.status, author: user.name, slug: articles.slug })
          .from(comments).innerJoin(user, eq(user.id, comments.userId)).innerJoin(articles, eq(articles.id, comments.articleId))
          .where(inArray(comments.id, commentIds))
      : [],
  ]);
  const artById = new Map(arts.map((a) => [a.id, a]));
  const comById = new Map(coms.map((c) => [c.id, c]));

  const open = list.filter((r) => !r.resolvedAt);
  const done = list.filter((r) => r.resolvedAt);

  const row = (r: (typeof list)[number]) => {
    const art = r.type === "article" ? artById.get(r.targetId) : undefined;
    const com = r.type === "comment" ? comById.get(r.targetId) : undefined;
    return (
      <li key={r.id} className="space-y-2 py-4">
        <p className="text-xs opacity-70">
          {r.type === "article" ? "Article" : "Commentaire"} · signalé par {r.by} · {r.at.toLocaleDateString("fr-FR")}
        </p>
        <p className="text-sm"><strong>Motif :</strong> {r.reason}</p>
        {art && (
          <p className="text-sm">
            <Link href={`/${lang}/articles/${art.slug}`} className="underline">{art.title}</Link>
            {art.status === "hidden" && <strong className="ml-2 text-red-600">MASQUÉ</strong>}
          </p>
        )}
        {com && (
          <blockquote className="border-l-2 border-black/20 pl-3 text-sm dark:border-white/25">
            <span className="text-xs opacity-70">{com.author} sur </span>
            <Link href={`/${lang}/articles/${com.slug}`} className="text-xs underline">l&apos;article</Link>
            {com.status === "hidden" && <strong className="ml-2 text-xs text-red-600">MASQUÉ</strong>}
            <p className="whitespace-pre-wrap">{com.body}</p>
          </blockquote>
        )}
        {!art && !com && <p className="text-sm opacity-70">Contenu supprimé.</p>}
        {!r.resolvedAt && (
          <div className="flex flex-wrap gap-2">
            {art && art.status === "published" && (
              <ActionButton action={setArticleStatus.bind(null, art.id, "hidden")} label="Dépublier l'article" tone="danger" />
            )}
            {com && com.status === "visible" && (
              <ActionButton action={setCommentStatus.bind(null, com.id, "hidden")} label="Masquer le commentaire" tone="danger" />
            )}
            <ActionButton action={resolveReport.bind(null, r.id)} label="Classer" />
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Signalements</h1>
      <h2 className="mb-1 mt-4 text-lg font-semibold">À traiter ({open.length})</h2>
      {open.length === 0 && <p className="text-sm opacity-70">Rien à traiter.</p>}
      <ul className="divide-y divide-black/10 dark:divide-white/15">{open.map(row)}</ul>
      {done.length > 0 && (
        <>
          <h2 className="mb-1 mt-8 text-lg font-semibold opacity-70">Classés ({done.length})</h2>
          <ul className="divide-y divide-black/10 opacity-70 dark:divide-white/15">{done.map(row)}</ul>
        </>
      )}
    </div>
  );
}
