import { IconBookmarks, IconChevronRight } from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ThemeIcon } from "@/components/icon";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { AccountSection } from "@/components/account-section";
import { ThemePicker } from "@/components/theme-picker";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSession } from "@/lib/session";
import { listSubscribedThemeIds, listThemes } from "@/lib/themes";
import { listUserLists } from "@/lib/user-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function Profile({ params }: PageProps<"/[lang]/profile">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await getSession();
  if (!session) redirect(`/${lang}/sign-in`);
  if (!session.user.onboardedAt) redirect(`/${lang}/onboarding`);

  const [t, themes, subscribed, lists] = await Promise.all([
    getDictionary(lang),
    listThemes(),
    listSubscribedThemeIds(session.user.id),
    listUserLists(session.user.id, lang),
  ]);
  const p = t.profile;
  const [dbUser] = await db.select({ digestEnabled: userTable.digestEnabled }).from(userTable).where(eq(userTable.id, session.user.id));

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-3xl font-bold">{p.title}</h1>
        <p className="mt-1 text-sm opacity-70">
          {p.signedInAs} {session.user.name} ({session.user.email}) · {p.role} : {session.user.role}
        </p>
      </header>

      <section aria-labelledby="themes-title">
        <h2 id="themes-title" className="text-xl font-semibold">{p.themes}</h2>
        <p className="mb-4 mt-1 text-sm opacity-70">{p.themesHelp}</p>
        <ThemePicker
          themes={themes.map((x) => ({
            id: x.id,
            name: x.names[lang],
            description: x.descriptions[lang],
            icon: <ThemeIcon name={x.icon} size={24} />,
            color: x.color,
          }))}
          initial={subscribed}
          saveLabel={p.saveThemes}
          savedLabel={p.themesSaved}
          pickOneLabel={t.onboarding.pickOne}
        />
      </section>

      <section aria-labelledby="lists-title" className="rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 id="lists-title" className="flex items-center gap-2.5 text-xl font-semibold">
          <IconBookmarks size={22} aria-hidden /> {p.lists} ({lists.length})
        </h2>
        <p className="mb-3 mt-1 text-sm opacity-70">{t.profileLists.text}</p>
        <Link href={`/${lang}/lists`} className="hover-tint inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20">
          {t.profileLists.manage} <IconChevronRight size={16} aria-hidden />
        </Link>
      </section>

      <section aria-labelledby="account-title">
        <h2 id="account-title" className="mb-4 text-xl font-semibold">{t.account.title}</h2>
        <AccountSection
          lang={lang}
          name={session.user.name}
          email={session.user.email}
          locale={session.user.locale === "en" ? "en" : "fr"}
          digest={dbUser.digestEnabled}
          t={t.account}
        />
      </section>
    </div>
  );
}
