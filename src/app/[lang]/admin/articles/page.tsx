import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleTranslations, articles, themes } from "@/db/schema";
import { ActionButton } from "@/components/action-button";
import { requireAdmin } from "@/lib/admin";
import { removeArticleImage, setArticleStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminArticles({ params }: PageProps<"/[lang]/admin/articles">) {
  const { lang } = await params;
  await requireAdmin();
  const rows = await db
    .select({
      id: articles.id, slug: articles.slug, status: articles.status, imageUrl: articles.imageUrl, score: articles.popularityScore,
      publishedAt: articles.publishedAt, model: articles.model, title: articleTranslations.title,
      theme: themes.names,
    })
    .from(articles)
    .innerJoin(articleTranslations, and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, "fr")))
    .innerJoin(themes, eq(themes.id, articles.themeId))
    .orderBy(desc(articles.publishedAt))
    .limit(100);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Articles</h1>
      <ul className="divide-y divide-black/10 dark:divide-white/15">
        {rows.map((a) => {
          const hidden = a.status === "hidden";
          return (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/${lang}/articles/${a.slug}`} className="font-medium hover:underline">{a.title}</Link>
                <p className="text-xs opacity-70">
                  {a.theme.fr} · {a.publishedAt.toLocaleDateString("fr-FR")} · score {a.score} · {a.model ?? "?"}
                  {hidden && <strong className="ml-2 text-red-600">MASQUÉ</strong>}
                </p>
              </div>
              {a.imageUrl && (
                <ActionButton action={removeArticleImage.bind(null, a.id)} label="Retirer l'image" confirmText="Retirer l'illustration de cet article ?" />
              )}
              <ActionButton
                action={setArticleStatus.bind(null, a.id, hidden ? "published" : "hidden")}
                label={hidden ? "Republier" : "Dépublier"}
                tone={hidden ? "default" : "danger"}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
