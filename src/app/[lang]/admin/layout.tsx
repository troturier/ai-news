import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

// The admin area is French only (a single administrator).
export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  await requireAdmin();
  const tab = "rounded-md px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10";
  return (
    <div>
      <nav aria-label="Administration" className="mb-6 flex gap-2 border-b border-black/10 pb-3 dark:border-white/15">
        <Link href={`/${lang}/admin`} className={tab}>Tableau de bord</Link>
        <Link href={`/${lang}/admin/articles`} className={tab}>Articles</Link>
        <Link href={`/${lang}/admin/reports`} className={tab}>Signalements</Link>
      </nav>
      {children}
    </div>
  );
}
