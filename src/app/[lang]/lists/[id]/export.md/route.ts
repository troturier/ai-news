import { z } from "zod";
import { hasLocale } from "@/i18n/config";
import { listToMarkdown, markdownResponse } from "@/lib/markdown-export";
import { getSession } from "@/lib/session";
import { getUserList, listItems } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/[lang]/lists/[id]/export.md">) {
  const { lang, id } = await ctx.params;
  if (!hasLocale(lang) || !z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const list = await getUserList(session.user.id, id, lang);
  if (!list) return new Response("Not found", { status: 404 });
  const items = await listItems(list.id, lang);
  return markdownResponse(
    listToMarkdown(list, items.map((i) => ({ slug: i.slug, title: i.title, summary: i.summary, publishedAt: i.publishedAt, theme: i.themeNames[lang] })), lang),
    `${list.name}.${lang}.md`,
  );
}
