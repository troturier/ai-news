import { IconBookmarks } from "@tabler/icons-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ThemeIcon } from "@/components/icon";
import { ListsManager } from "@/components/lists-manager";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSession } from "@/lib/session";
import { listUserLists } from "@/lib/user-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function ListsPage({ params }: PageProps<"/[lang]/lists">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await getSession();
  if (!session) redirect(`/${lang}/sign-in`);

  const [t, lists] = await Promise.all([getDictionary(lang), listUserLists(session.user.id, lang)]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-3 text-3xl font-bold">
        <IconBookmarks size={32} aria-hidden /> {t.lists.title}
      </h1>
      <p className="mb-6 mt-2 opacity-70">{t.lists.intro}</p>
      <ListsManager
        lang={lang}
        t={{ ...t.profile, ...t.lists, ...t.listPage }}
        lists={lists.map((l) => ({
          id: l.id, name: l.name, color: l.color, icon: l.icon, isDefault: l.isDefault, count: l.count, unread: l.unread,
          iconNode: <ThemeIcon name={l.icon} size={24} />,
        }))}
      />
    </div>
  );
}
