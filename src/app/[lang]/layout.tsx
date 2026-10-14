import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { getDictionary } from "@/i18n/dictionaries";
import { hasLocale, locales } from "@/i18n/config";
import { Suspense } from "react";
import { NavUser } from "@/components/nav-user";
import { LangSwitch, LangSwitchView } from "@/components/lang-switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteUrl } from "@/lib/site";
import { IconBrandGithub, IconFileDescription, IconInfoCircle, IconRss } from "@tabler/icons-react";
import { REPO_URL } from "@/lib/legal";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: "AI News", template: "%s · AI News" },
    description: "AI watch / Veille IA",
    alternates: { types: { "application/rss+xml": `/${lang}/feed.xml` } },
  };
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Applies the chosen theme before the first render (avoids a flash). The Script component
            is injected into the server HTML; a raw <script> would trigger a React error on
            every client-side navigation (language change). */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`}
        </Script>
        <header className="border-b border-black/10 dark:border-white/15">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Link href={`/${lang}`} className="whitespace-nowrap font-semibold">
              {t.site.name}
            </Link>
            <form action={`/${lang}/search`} role="search" className="order-last w-full sm:order-none sm:ml-auto sm:w-auto">
              <input
                type="search"
                name="q"
                maxLength={100}
                aria-label={t.search.label}
                placeholder={t.search.placeholder}
                className="w-full rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm sm:w-44 dark:border-white/20"
              />
            </form>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-0.5 text-sm sm:ml-0 sm:gap-3">
              {/* Two distinct switches (language, theme), separated from the account links by a divider. */}
              <Suspense fallback={<LangSwitchView current={lang} hrefs={{ fr: "/fr", en: "/en" }} label={t.nav.language} />}>
                <LangSwitch current={lang} label={t.nav.language} />
              </Suspense>
              <ThemeToggle label={t.nav.theme} lightLabel={t.theme.light} darkLabel={t.theme.dark} />
              <Suspense fallback={null}>
                <NavUser lang={lang} t={t.nav} />
              </Suspense>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-black/10 dark:border-white/15">
          <nav aria-label={t.nav.footerNav} className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-sm opacity-80">
            <Link href={`/${lang}/about`} className="flex items-center gap-1.5 hover:underline">
              <IconInfoCircle size={16} aria-hidden /> {t.nav.about}
            </Link>
            <Link href={`/${lang}/legal`} className="flex items-center gap-1.5 hover:underline">
              <IconFileDescription size={16} aria-hidden /> {t.nav.legal}
            </Link>
            <a href={`/${lang}/feed.xml`} className="flex items-center gap-1.5 hover:underline">
              <IconRss size={16} aria-hidden /> {t.nav.rss}
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:underline">
              <IconBrandGithub size={16} aria-hidden /> {t.nav.code}
            </a>
            <span className="sm:ml-auto">© {new Date().getFullYear()} {t.site.name}</span>
          </nav>
        </footer>
      </body>
    </html>
  );
}
