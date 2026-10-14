"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Menu link: highlighted (same style as the switches' active option) on its page. */
export function NavLink({
  href,
  exact = false,
  className,
  label,
  children,
}: {
  href: string;
  exact?: boolean; // true: only the exact URL is active (home), otherwise sub-pages too
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`${className} ${active ? "segment-active font-medium" : ""}`}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
    >
      {children}
    </Link>
  );
}
