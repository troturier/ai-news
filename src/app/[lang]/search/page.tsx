import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArticleCard } from "@/components/article-card";
import { HideReadToggle } from "@/components/hide-read-toggle";
import { cardLabels } from "@/lib/card-labels";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PAGE_SIZE, searchArticles } from "@/lib/articles";
import { getSession } from "@/lib/session";
import { loadCardUser } from "@/lib/card-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function SearchPage({ params, searchParams }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const t = await getDictionary(lang);

  const session = await getSession();
  const hideRead = !!session && (await cookies()).get("hide_read")?.value === "1";
  const result = q.length >= 2 ? await searchArticles({ lang, q, excludeReadBy: hideRead ? session!.user.id : undefined, page }) : null;
  const cardUser = session && result ? await loadCardUser(session.user.id, result.items.map((i) => i.id), lang) : null;
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  const href = (p: number) => `/${lang}/search?q=${encodeURIComponent(q)}&page=${p}`;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-3xl font-bold">{t.search.title}</h1>
      <form action={`/${lang}/search`} role="search" className="mb-6 flex gap-2">
        <input
          type="search" name="q" defaultValue={q} maxLength={100} autoFocus={!q}
          aria-label={t.search.label} placeholder={t.search.placeholder}
          className="flex-1 rounded-md border border-black/20 bg-transparent px-3 py-2 dark:border-white/25"
        />
        <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-background">{t.search.title}</button>
      </form>

      {q && !result && <p className="opacity-70">{t.search.tooShort}</p>}
      {result && (
        <>
          <p className="mb-4 text-sm opacity-70">{result.total} {t.search.resultsFor} « {q} »</p>
          {session && (
            <div className="mb-4">
              <HideReadToggle hidden={hideRead} hideLabel={t.home.hideRead} showLabel={t.home.showRead} />
            </div>
          )}
          {result.items.length === 0 ? (
            <p>{t.search.none}</p>
          ) : (
            <div className="grid gap-4">
              {result.items.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  lang={lang}
                  labels={cardLabels(t)}
                  user={cardUser ? { read: cardUser.readIds.has(a.id), listIds: cardUser.memberships.get(a.id) ?? [], lists: cardUser.lists } : undefined}
                />
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="mt-8 flex justify-between text-sm">
              {page > 1 ? <Link href={href(page - 1)} className="underline">← {t.home.newer}</Link> : <span />}
              {page < pages && <Link href={href(page + 1)} className="underline">{t.home.older} →</Link>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
