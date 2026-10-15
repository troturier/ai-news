import type { Metadata } from "next";
import { IconBooks, IconDownload, IconLink, IconListDetails, IconMessages } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleMeta, formatDate, ThemeBadgeLink } from "@/components/article-card";
import { ArticleHero } from "@/components/article-hero";
import { ArticleNav, MobileNav, type NavItem } from "@/components/article-nav";
import { Markdown } from "@/components/markdown";
import { ArticleActions } from "@/components/article-actions";
import { CommentActions, CommentForm } from "@/components/comments";
import { ThemeIcon } from "@/components/icon";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ArticleCard } from "@/components/article-card";
import { getArticle, relatedArticles } from "@/lib/articles";
import { cardLabels } from "@/lib/card-labels";
import { extractHeadings } from "@/lib/headings";
import { hostOf } from "@/pipeline/url";
import { SectionIcon } from "@/lib/section-icons";
import { getSession } from "@/lib/session";
import { getUserArticleState, listComments, listUserLists, reactionTotals } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/articles/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const a = await getArticle(slug, lang);
  if (!a) return {};
  return {
    title: a.title,
    description: a.summary,
    alternates: {
      canonical: `/${lang}/articles/${slug}`,
      languages: { fr: `/fr/articles/${slug}`, en: `/en/articles/${slug}` },
    },
    openGraph: { type: "article", title: a.title, description: a.summary, publishedTime: a.publishedAt.toISOString() },
  };
}

export default async function ArticlePage({ params }: PageProps<"/[lang]/articles/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [a, t] = await Promise.all([getArticle(slug, lang), getDictionary(lang)]);
  if (!a) notFound();

  const session = await getSession();
  const [state, userLists, cmts, totals, related] = await Promise.all([
    session ? getUserArticleState(session.user.id, a.id) : null,
    session ? listUserLists(session.user.id, lang) : [],
    listComments(a.id),
    reactionTotals(a.id),
    relatedArticles({ articleId: a.id, themeSlug: a.theme.slug, tags: a.tags, lang }),
  ]);
  const ct = { ...t.comments, reportPrompt: t.actions.reportPrompt, reported: t.actions.reported };

  // Table of contents: article parts (subheadings), then the end-of-page sections.
  const headings = extractHeadings(a.body);
  const navItems: NavItem[] = [
    ...(headings.length
      ? [
          { id: "article-body", label: t.article.parts, icon: <IconListDetails size={16} aria-hidden /> },
          ...headings.map((h) => ({ id: h.id, label: h.text, icon: <SectionIcon text={h.text} size={16} />, level: 1 as const })),
        ]
      : []),
    { id: "sources", label: t.article.sources, icon: <IconLink size={16} aria-hidden /> },
    { id: "comments", label: ct.title, icon: <IconMessages size={16} aria-hidden />, count: cmts.length },
    ...(related.length ? [{ id: "related", label: t.article.related, icon: <IconBooks size={16} aria-hidden /> }] : []),
  ];

  const sectionTitle = "flex items-center gap-2.5 text-2xl font-bold";
  const button =
    "hover-tint inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20";

  return (
    <div className="mx-auto grid max-w-2xl gap-10 lg:max-w-none lg:grid-cols-[42rem_14rem] lg:justify-center">
      <article className="min-w-0">
        <Link href={`/${lang}`} className="text-sm opacity-70 hover:opacity-100">
          ← {t.article.back}
        </Link>

        <ArticleHero
          src={a.imageUrl}
          source={a.imageSource}
          color={a.theme.color}
          icon={a.theme.icon}
          credit={a.imageUrl ? t.article.imageCredit : undefined}
          creditHref={a.imageUrl ? a.sources[0]?.url : undefined}
        />

        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm opacity-90">
          <ThemeBadgeLink theme={a.theme} lang={lang} />
          <ArticleMeta date={a.publishedAt} lang={lang} minutes={a.minutes} minRead={t.home.minRead} />
        </div>
        <h1 className="text-3xl font-bold leading-tight">{a.title}</h1>
        <p className="mb-6 mt-3 text-lg opacity-80">{a.summary}</p>

        {/* Mobile: collapsible table of contents (the side panel only exists from lg up). */}
        <MobileNav items={navItems} title={t.article.nav} label={t.article.navMobile} />

        <div id="article-body" className="scroll-mt-6">
          <Markdown headings={headings} allowedHosts={a.sources.flatMap((s) => hostOf(s.url) ?? [])}>{a.body}</Markdown>
        </div>

        {session && state ? (
          <ArticleActions
            articleId={a.id}
            initial={state}
            totals={totals}
            lists={userLists.map((l) => ({ id: l.id, name: l.name, color: l.color, icon: <ThemeIcon name={l.icon} size={16} /> }))}
            t={t.actions}
            readT={t.card}
            exportHref={`/${lang}/articles/${a.slug}/export.md`}
            exportLabel={t.article.exportMdButton}
            manageLists={{ href: `/${lang}/lists`, label: t.card.manageLists }}
          />
        ) : (
          <div className="my-6 space-y-3">
            <p className="rounded-md border border-black/10 p-3 text-sm dark:border-white/15">
              {t.interact.signInPrompt}{" "}
              <Link href={`/${lang}/sign-in`} className="underline">{t.interact.signIn}</Link>
            </p>
            <a href={`/${lang}/articles/${a.slug}/export.md`} download className={button}>
              <IconDownload size={16} aria-hidden /> {t.article.exportMdButton}
            </a>
          </div>
        )}

        <section id="sources" aria-labelledby="sources-title" className="mt-10 scroll-mt-6 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
          <h2 id="sources-title" className="mb-2 flex items-center gap-2.5 text-xl font-bold">
            <IconLink size={22} aria-hidden /> {t.article.sources}
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            {a.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                  {s.publisher ?? new URL(s.url).hostname}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 opacity-70">{t.article.aiNotice}</p>
        </section>

        <section id="comments" aria-labelledby="comments-title" className="mt-10 scroll-mt-6">
          <h2 id="comments-title" className={`mb-3 ${sectionTitle}`}>
            <IconMessages size={24} aria-hidden /> {ct.title} ({cmts.length})
          </h2>
          {cmts.length === 0 && <p className="text-sm opacity-70">{ct.empty}</p>}
          <ul className="space-y-4">
            {cmts.map((c) => (
              <li key={c.id} className="rounded-md border border-black/10 p-3 dark:border-white/15">
                <div className="mb-1 flex items-center justify-between text-xs opacity-70">
                  <span>{c.author} · {formatDate(c.createdAt, lang)}</span>
                  {session && (
                    <CommentActions commentId={c.id} canDelete={c.userId === session.user.id || session.user.role === "admin"} t={ct} />
                  )}
                </div>
                {/* Plain text: React escapes the content, no Markdown or HTML in comments. */}
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              </li>
            ))}
          </ul>
          {session ? (
            <CommentForm articleId={a.id} t={ct} />
          ) : (
            <p className="mt-4 text-sm">
              <Link href={`/${lang}/sign-in`} className="underline">{ct.signInToComment}</Link>
            </p>
          )}
        </section>

        {related.length > 0 && (
          <section id="related" aria-labelledby="related-title" className="mt-10 scroll-mt-6">
            <h2 id="related-title" className={`mb-3 ${sectionTitle}`}>
              <IconBooks size={24} aria-hidden /> {t.article.related}
            </h2>
            <div className="grid gap-3">
              {related.map((r) => (
                <ArticleCard key={r.id} article={r} lang={lang} labels={cardLabels(t)} />
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Large screen: fixed side panel that follows the reading. */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
          <ArticleNav items={navItems} title={t.article.nav} />
        </div>
      </aside>
    </div>
  );
}
