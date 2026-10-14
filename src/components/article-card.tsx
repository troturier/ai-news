import { IconCalendar, IconClock } from "@tabler/icons-react";
import Link from "next/link";
import { ArticleThumb } from "@/components/article-thumb";
import { ThemeIcon } from "@/components/icon";
import { ListMenu } from "@/components/list-menu";
import { ReadToggle } from "@/components/read-toggle";
import type { Locale } from "@/i18n/config";
import type { ArticleListItem } from "@/lib/articles";
import type { CardUser } from "@/lib/card-user";

export const formatDate = (d: Date, lang: Locale) =>
  new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "Europe/Paris" }).format(d);

/**
 * Theme badge. Opaque background (theme color mixed with the page background) and text darkened or lightened
 * depending on the mode: it stands out from the card, itself tinted with the same color.
 */
export function ThemeBadge({ theme }: { theme: ArticleListItem["theme"] }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold"
      style={{
        color: `color-mix(in srgb, ${theme.color} 65%, var(--foreground))`,
        background: `color-mix(in srgb, ${theme.color} 24%, var(--background))`,
        borderColor: theme.color,
      }}
    >
      <ThemeIcon name={theme.icon} size={14} />
      {theme.name}
    </span>
  );
}

/** Date and reading time, with their icons. */
export function ArticleMeta({ date, lang, minutes, minRead }: { date: Date; lang: Locale; minutes: number; minRead: string }) {
  return (
    <>
      <span className="inline-flex items-center gap-1">
        <IconCalendar size={14} aria-hidden />
        <time dateTime={date.toISOString()}>{formatDate(date, lang)}</time>
      </span>
      <span className="inline-flex items-center gap-1">
        <IconClock size={14} aria-hidden />
        {minutes} {minRead}
      </span>
    </>
  );
}

export type CardLabels = {
  minRead: string;
  read: string;
  unread: string;
  markRead: string;
  markUnread: string;
  lists: string;
  noLists: string;
  manageLists: string;
};

/**
 * Article card. The theme color signals membership (tinted left edge, outline and background);
 * the illustration is the source's, otherwise the theme icon. `user` is only provided for a
 * signed-in user: it enables the Read / Unread badge and the lists menu.
 */
export function ArticleCard({
  article,
  lang,
  labels,
  user,
  priority = false,
}: {
  article: ArticleListItem;
  lang: Locale;
  labels: CardLabels;
  user?: { read: boolean; listIds: string[]; lists: CardUser["lists"] };
  /** First cards on the page: image loaded immediately. */
  priority?: boolean;
}) {
  const { color } = article.theme;
  const href = `/${lang}/articles/${article.slug}`;
  const fallback = (
    <div className="flex h-full w-full items-center justify-center" style={{ color, background: `${color}26` }} aria-hidden>
      <ThemeIcon name={article.theme.icon} size={48} />
    </div>
  );

  return (
    <article
      className="flex rounded-lg border border-l-4"
      style={{ borderColor: `${color}66`, borderLeftColor: color, background: `${color}14` }}
    >
      {/* Illustration to the left of the text, framed by the same spacing (p-4) as the content. Desktop: the whole
          remaining height (close to a square). Mobile: small 80 px square at the top. Light shadow + thin outline to
          set it apart from the card background when their colors are similar. Rounded corners are carried by the image:
          no overflow-hidden on the card, which would clip the lists dropdown. */}
      <Link href={href} tabIndex={-1} aria-hidden className="relative block min-h-24 w-24 shrink-0 sm:min-h-40 sm:w-44">
        <div className="absolute left-4 top-4 h-20 w-20 overflow-hidden rounded-md shadow-[0_1px_4px_rgba(0,0,0,0.28)] ring-1 ring-black/5 sm:bottom-4 sm:right-0 sm:h-auto sm:w-auto dark:ring-white/10">
          <ArticleThumb priority={priority} src={article.imageUrl} fallback={fallback} className="h-full w-full bg-black/5 object-cover" />
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs opacity-90">
          <ThemeBadge theme={article.theme} />
          <ArticleMeta date={article.publishedAt} lang={lang} minutes={article.minutes} minRead={labels.minRead} />
        </div>
        <h2 className="text-lg font-semibold leading-snug">
          <Link href={href} className="hover:underline">
            {article.title}
          </Link>
        </h2>
        <p className="mt-2 text-sm opacity-80">{article.summary}</p>
        {user && (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
            <ReadToggle articleId={article.id} initialRead={user.read} t={labels} />
            <ListMenu
              articleId={article.id}
              lists={user.lists}
              initialListIds={user.listIds}
              label={labels.lists}
              emptyLabel={labels.noLists}
              manage={{ href: `/${lang}/lists`, label: labels.manageLists }}
              compact
            />
          </div>
        )}
      </div>
    </article>
  );
}
