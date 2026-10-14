import { hasLocale } from "@/i18n/config";
import { getArticle } from "@/lib/articles";
import { articleToMarkdown, markdownResponse } from "@/lib/markdown-export";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/articles/[slug]/export.md">) {
  const { lang, slug } = await ctx.params;
  if (!hasLocale(lang)) return new Response("Not found", { status: 404 });
  const a = await getArticle(slug, lang);
  if (!a) return new Response("Not found", { status: 404 });
  return markdownResponse(articleToMarkdown(a, lang), `${slug}.${lang}.md`);
}
