import { notFound } from "next/navigation";
import { ArticleList } from "@/components/article-list";
import { hasLocale } from "@/i18n/config";
import { cardLabels } from "@/lib/card-labels";
import { getDictionary } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function Home({ params, searchParams }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { page, feed } = await searchParams;
  const t = await getDictionary(lang);
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">{t.home.latest}</h1>
      <p className="mb-6 opacity-70">{t.site.tagline}</p>
      <ArticleList lang={lang} t={t.home} labels={cardLabels(t)} page={Math.max(1, Number(page) || 1)} feed={feed === "all" ? "all" : "mine"} />
    </>
  );
}
