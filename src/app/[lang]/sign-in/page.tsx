import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function Page({ params }: PageProps<"/[lang]/sign-in">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { auth: a, nav, recovery } = await getDictionary(lang);
  return (
    <section className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">{a.signInTitle}</h1>
      <AuthForm
        mode="sign-in"
        lang={lang}
        t={{ ...a, forgotLink: recovery.forgotLink, submit: a.submitSignIn, switchPrompt: a.noAccount, switchLabel: nav.signUp }}
      />
    </section>
  );
}
