import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaticPage } from "@/components/static-page";
import { legalPage } from "@/content/legal";
import { hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/legal">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: legalPage[lang].title, description: legalPage[lang].intro, alternates: { languages: { fr: "/fr/legal", en: "/en/legal" } } };
}

export default async function LegalPage({ params }: PageProps<"/[lang]/legal">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <StaticPage {...legalPage[lang]} />;
}
