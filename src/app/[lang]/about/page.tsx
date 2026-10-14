import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaticPage } from "@/components/static-page";
import { about } from "@/content/about";
import { hasLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: about[lang].title, description: about[lang].intro, alternates: { languages: { fr: "/fr/about", en: "/en/about" } } };
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <StaticPage {...about[lang]} />;
}
