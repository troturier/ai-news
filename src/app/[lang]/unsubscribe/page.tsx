import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { verifyUnsubscribeToken } from "@/lib/digest-token";
import { UnsubscribeButton } from "@/components/unsubscribe-button";

export const metadata: Metadata = { robots: { index: false } };

// Confirmation page: a plain GET (link preview by an antivirus) unsubscribes nobody.
export default async function Unsubscribe({ params, searchParams }: PageProps<"/[lang]/unsubscribe">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const sp = await searchParams;
  const u = typeof sp.u === "string" ? sp.u : "";
  const t = typeof sp.t === "string" ? sp.t : "";
  const { digest: d } = await getDictionary(lang);
  const valid = !!u && verifyUnsubscribeToken(u, t);

  return (
    <section className="mx-auto max-w-md text-center">
      <h1 className="mb-3 text-2xl font-bold">{d.unsubTitle}</h1>
      {valid ? (
        <UnsubscribeButton userId={u} token={t} t={d} />
      ) : (
        <p role="alert" className="text-red-600">{d.invalidLink}</p>
      )}
    </section>
  );
}
