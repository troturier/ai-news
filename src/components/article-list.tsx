import Link from "next/link";
import { cookies } from "next/headers";
import { ArticleCard, type CardLabels } from "@/components/article-card";
import { HideReadToggle } from "@/components/hide-read-toggle";
import { ThemeIcon } from "@/components/icon";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { PAGE_SIZE, listArticles } from "@/lib/articles";
import { getSession } from "@/lib/session";
import { listSubscribedThemeIds, listThemes } from "@/lib/themes";
import { loadCardUser } from "@/lib/card-user";

export async function ArticleList({
  lang,
  t,
  labels,
  themeSlug,
  feed,
  page,
}: {
  lang: Locale;
  t: Dictionary["home"];
  labels: CardLabels;
  themeSlug?: string;
  /** Home only: "mine" = followed themes, "all" = everything. Defaults to "mine" if the user follows themes. */
  feed?: "mine" | "all";
  page: number;
}) {
  const session = await getSession();
  const subscribed = session && !themeSlug ? await listSubscribedThemeIds(session.user.id) : [];
  const mine = !themeSlug && subscribed.length > 0 && feed !== "all";
  const hideRead = !!session && (await cookies()).get("hide_read")?.value === "1";
  const [themes, { items, total }] = await Promise.all([
    listThemes(),
    listArticles({ lang, themeSlug, themeIds: mine ? subscribed : undefined, excludeReadBy: hideRead ? session!.user.id : undefined, page }),
  ]);
  const cardUser = session ? await loadCardUser(session.user.id, items.map((a) => a.id), lang) : null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = themeSlug ? `/${lang}/themes/${themeSlug}` : `/${lang}`;
  const sep = !themeSlug && feed === "all" ? "&" : "?";
  const feedQ = !themeSlug && feed === "all" ? "?feed=all" : "";
  const chip = "hover-tint inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm";

  return (
    <>
      <nav aria-label="Thèmes" className="mb-6 flex flex-wrap gap-2">
        {(!themeSlug && subscribed.length > 0) && (
          <Link
            href={`/${lang}`}
            aria-current={mine ? "page" : undefined}
            className={`${chip} ${mine ? "bg-foreground text-background" : "border-black/15 dark:border-white/20"}`}
          >
            {t.myThemes}
          </Link>
        )}
        <Link
          href={subscribed.length > 0 ? `/${lang}?feed=all` : `/${lang}`}
          aria-current={!themeSlug && !mine ? "page" : undefined}
          className={`${chip} ${!themeSlug && !mine ? "bg-foreground text-background" : "border-black/15 dark:border-white/20"}`}
        >
          {t.allThemes}
        </Link>
        {themes.map((th) => {
          const on = th.slug === themeSlug;
          return (
            <Link
              key={th.id}
              href={`/${lang}/themes/${th.slug}`}
              aria-current={on ? "page" : undefined}
              className={chip}
              style={{
                borderColor: th.color,
                color: on ? "#fff" : th.color,
                background: on ? th.color : undefined,
              }}
            >
              <ThemeIcon name={th.icon} size={14} />
              {th.names[lang]}
            </Link>
          );
        })}
      </nav>

      {session && (
        <div className="mb-4">
          <HideReadToggle hidden={hideRead} hideLabel={t.hideRead} showLabel={t.showRead} />
        </div>
      )}

      {items.length === 0 ? (
        <p className="opacity-70">{hideRead ? t.allRead : t.empty}</p>
      ) : (
        <div className="grid gap-4">
          {items.map((a, i) => (
            <ArticleCard
              key={a.slug}
              priority={i < 3}
              article={a}
              lang={lang}
              labels={labels}
              user={cardUser ? { read: cardUser.readIds.has(a.id), listIds: cardUser.memberships.get(a.id) ?? [], lists: cardUser.lists } : undefined}
            />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex justify-between text-sm">
          {page > 1 ? (
            <Link href={`${base}${feedQ}${sep}page=${page - 1}`} className="underline">
              ← {t.newer}
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link href={`${base}${feedQ}${sep}page=${page + 1}`} className="underline">
              {t.older} →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
