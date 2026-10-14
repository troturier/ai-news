import { IconArrowLeft } from "@tabler/icons-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ArticleCard } from "@/components/article-card";
import { HideReadToggle } from "@/components/hide-read-toggle";
import { ThemeIcon } from "@/components/icon";
import { ListToolbar } from "@/components/list-toolbar";
import { RemoveFromList } from "@/components/remove-from-list";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PAGE_SIZE } from "@/lib/articles";
import { cardLabels } from "@/lib/card-labels";
import { loadCardUser } from "@/lib/card-user";
import { getSession } from "@/lib/session";
import { getUserList, listItemsPage, listUserLists, type ListSort } from "@/lib/user-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

const SORTS: ListSort[] = ["added", "oldest", "published"];

export default async function ListPage({ params, searchParams }: PageProps<"/[lang]/lists/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !z.uuid().safeParse(id).success) notFound();
  const session = await getSession();
  if (!session) redirect(`/${lang}/sign-in`);
  const list = await getUserList(session.user.id, id, lang);
  if (!list) notFound();

  const sp = await searchParams;
  const sort: ListSort = SORTS.includes(sp.sort as ListSort) ? (sp.sort as ListSort) : "added";
  const page = Math.max(1, Number(sp.page) || 1);
  const hideRead = (await cookies()).get("hide_read")?.value === "1";

  const [t, { items, total }, summary] = await Promise.all([
    getDictionary(lang),
    listItemsPage({ listId: list.id, lang, page, sort, excludeReadBy: hideRead ? session.user.id : undefined }),
    listUserLists(session.user.id, lang).then((all) => all.find((l) => l.id === id)),
  ]);
  const cardUser = await loadCardUser(session.user.id, items.map((i) => i.id), lang);
  const L = t.listPage;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (over: Record<string, string | number>) => {
    const q = new URLSearchParams({ ...(sort !== "added" ? { sort } : {}), ...(page > 1 ? { page: String(page) } : {}) });
    for (const [k, v] of Object.entries(over)) {
      if (v === "") q.delete(k);
      else q.set(k, String(v));
    }
    const s = q.toString();
    return `/${lang}/lists/${list.id}${s ? `?${s}` : ""}`;
  };
  const chip = "hover-tint inline-flex items-center rounded-full border px-3 py-1 text-sm";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/${lang}/lists`} className="inline-flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100">
        <IconArrowLeft size={16} aria-hidden /> {L.back}
      </Link>

      <header
        className="mb-6 mt-4 rounded-lg border border-l-4 p-4"
        style={{ borderColor: `${list.color}66`, borderLeftColor: list.color, background: `${list.color}14` }}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md" style={{ color: list.color, background: `${list.color}26` }}>
            <ThemeIcon name={list.icon} size={28} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-bold leading-tight">{list.name}</h1>
            <p className="text-sm opacity-80">
              {summary?.count ?? 0} {L.count}
              {(summary?.count ?? 0) > 0 && <> · {summary?.unread ? `${summary.unread} ${L.unreadCount}` : t.lists.allRead}</>}
              {list.isDefault && ` · ${t.profile.defaultList}`}
            </p>
          </div>
        </div>
        <ListToolbar
          lang={lang}
          list={{ id: list.id, name: list.name, color: list.color, icon: list.icon, isDefault: list.isDefault }}
          exportHref={`/${lang}/lists/${list.id}/export.md`}
          t={{ ...t.profile, edit: L.edit, delete: L.delete, export: L.export, error: L.error }}
        />
      </header>

      {(summary?.count ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <HideReadToggle hidden={hideRead} hideLabel={t.home.hideRead} showLabel={t.home.showRead} />
          <nav aria-label={L.sort} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="opacity-70">{L.sort} :</span>
            {([["added", L.sortAdded], ["oldest", L.sortOldest], ["published", L.sortPublished]] as const).map(([key, label]) => (
              <Link
                key={key}
                href={href({ sort: key === "added" ? "" : key, page: "" })}
                aria-current={sort === key ? "true" : undefined}
                className={`${chip} ${sort === key ? "segment-active border-transparent font-semibold" : "border-black/15 dark:border-white/20"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-black/20 p-6 text-center dark:border-white/25">
          <p className="font-medium">{hideRead && (summary?.count ?? 0) > 0 ? L.allReadHere : L.empty}</p>
          {(summary?.count ?? 0) === 0 && <p className="mt-1 text-sm opacity-70">{L.emptyHint}</p>}
          <Link href={`/${lang}`} className="hover-tint mt-4 inline-flex items-center rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20">
            {L.browse}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((i, n) => (
            <div key={i.id}>
              <ArticleCard
                lang={lang}
                priority={n < 3}
                labels={cardLabels(t)}
                user={{ read: cardUser.readIds.has(i.id), listIds: cardUser.memberships.get(i.id) ?? [], lists: cardUser.lists }}
                article={{
                  id: i.id, slug: i.slug, imageUrl: i.imageUrl, title: i.title, summary: i.summary, publishedAt: i.publishedAt,
                  minutes: Math.max(1, Math.round(i.chars.length / 1300)),
                  theme: { slug: i.themeSlug, name: i.themeNames[lang], color: i.color, icon: i.icon },
                }}
              />
              <div className="mt-1.5 flex justify-end">
                <RemoveFromList listId={list.id} articleId={i.id} label={L.remove} />
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex justify-between text-sm">
          {page > 1 ? <Link href={href({ page: page - 1 })} className="underline">← {t.home.newer}</Link> : <span />}
          {page < pages && <Link href={href({ page: page + 1 })} className="underline">{t.home.older} →</Link>}
        </div>
      )}
    </div>
  );
}
