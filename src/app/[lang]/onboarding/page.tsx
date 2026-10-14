import { notFound, redirect } from "next/navigation";
import { ThemeIcon } from "@/components/icon";
import { ThemePicker } from "@/components/theme-picker";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSession } from "@/lib/session";
import { listThemes } from "@/lib/themes";

export default async function Onboarding({ params }: PageProps<"/[lang]/onboarding">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await getSession();
  if (!session) redirect(`/${lang}/sign-in`);
  // Already done: editing happens in the profile.
  if (session.user.onboardedAt) redirect(`/${lang}`);

  const { onboarding: t } = await getDictionary(lang);
  const themes = await listThemes();

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mb-6 mt-1 opacity-70">{t.subtitle}</p>
      <ThemePicker
        themes={themes.map((x) => ({
          id: x.id,
          name: x.names[lang],
          description: x.descriptions[lang],
          icon: <ThemeIcon name={x.icon} size={24} />,
          color: x.color,
        }))}
        initial={[]}
        saveLabel={t.save}
        pickOneLabel={t.pickOne}
        digest={{ label: t.digest, hint: t.digestHint }}
        redirectTo={`/${lang}`}
      />
    </section>
  );
}
