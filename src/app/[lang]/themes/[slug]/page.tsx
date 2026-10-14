import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleList } from "@/components/article-list";
import { hasLocale } from "@/i18n/config";
import { cardLabels } from "@/lib/card-labels";
import { getDictionary } from "@/i18n/dictionaries";
import { listThemes } from "@/lib/themes";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/themes/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const theme = (await listThemes()).find((t) => t.slug === slug);
  if (!theme) return {};
  return {
    title: theme.names[lang],
    description: theme.descriptions[lang],
    alternates: { types: { "application/rss+xml": `/${lang}/themes/${slug}/feed.xml` } },
  };
}

export default async function ThemePage({ params, searchParams }: PageProps<"/[lang]/themes/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const theme = (await listThemes()).find((t) => t.slug === slug);
  if (!theme) notFound();
  const { page } = await searchParams;
  const t = await getDictionary(lang);
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">{theme.names[lang]}</h1>
      <p className="mb-6 opacity-70">{theme.descriptions[lang]}</p>
      <ArticleList lang={lang} t={t.home} labels={cardLabels(t)} themeSlug={slug} page={Math.max(1, Number(page) || 1)} />
    </>
  );
}
