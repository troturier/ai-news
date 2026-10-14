import { notFound } from "next/navigation";
import { ForgotPasswordForm } from "@/components/recovery-forms";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function ForgotPassword({ params }: PageProps<"/[lang]/forgot-password">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { recovery: r, auth: a } = await getDictionary(lang);
  return (
    <section className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">{r.forgotTitle}</h1>
      <p className="mb-6 text-sm opacity-70">{r.forgotHelp}</p>
      <ForgotPasswordForm lang={lang} t={{ ...r, email: a.email, captchaRequired: a.captchaRequired, genericError: a.genericError }} />
    </section>
  );
}
