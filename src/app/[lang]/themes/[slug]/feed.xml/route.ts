import { hasLocale } from "@/i18n/config";
import { buildFeed } from "@/lib/feed";
import { listThemes } from "@/lib/themes";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/themes/[slug]/feed.xml">) {
  const { lang, slug } = await ctx.params;
  if (!hasLocale(lang)) return new Response("Not found", { status: 404 });
  const theme = (await listThemes()).find((t) => t.slug === slug);
  if (!theme) return new Response("Not found", { status: 404 });
  return buildFeed({ lang, theme: { slug, name: theme.names[lang] } });
}
