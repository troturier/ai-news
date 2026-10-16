import type { Metadata } from "next";
import { IconArticle, IconFlag, IconLayoutDashboard, IconWorldSearch } from "@tabler/icons-react";
import { NavLink } from "@/components/nav-link";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

// The admin area is French only (a single administrator).
export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  await requireAdmin();
  const tab = "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10";
  return (
    <div>
      <nav aria-label="Administration" className="mb-6 flex flex-wrap gap-2 border-b border-black/10 pb-3 dark:border-white/15">
        <NavLink href={`/${lang}/admin`} exact className={tab} label="Tableau de bord">
          <IconLayoutDashboard size={16} aria-hidden /> Tableau de bord
        </NavLink>
        <NavLink href={`/${lang}/admin/pipeline`} className={tab} label="Recherche d'articles">
          <IconWorldSearch size={16} aria-hidden /> Recherche d&apos;articles
        </NavLink>
        <NavLink href={`/${lang}/admin/articles`} className={tab} label="Articles">
          <IconArticle size={16} aria-hidden /> Articles
        </NavLink>
        <NavLink href={`/${lang}/admin/reports`} className={tab} label="Signalements">
          <IconFlag size={16} aria-hidden /> Signalements
        </NavLink>
      </nav>
      {children}
    </div>
  );
}
