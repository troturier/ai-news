import { hasLocale } from "@/i18n/config";
import { buildFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/feed.xml">) {
  const { lang } = await ctx.params;
  if (!hasLocale(lang)) return new Response("Not found", { status: 404 });
  return buildFeed({ lang });
}
