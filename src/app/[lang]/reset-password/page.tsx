import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/components/recovery-forms";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export const metadata: Metadata = { robots: { index: false } };

export default async function ResetPassword({ params, searchParams }: PageProps<"/[lang]/reset-password">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { token } = await searchParams;
  const { recovery: r, auth: a, nav } = await getDictionary(lang);
  return (
    <section className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">{r.resetTitle}</h1>
      <ResetPasswordForm
        lang={lang}
        token={typeof token === "string" ? token : null}
        t={{ ...r, passwordHint: a.passwordHint, signIn: nav.signIn }}
      />
    </section>
  );
}
