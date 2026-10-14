import { IconBookmarks, IconHome, IconLogin, IconShieldCog, IconUser, IconUserPlus } from "@tabler/icons-react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getSession } from "@/lib/session";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";

const link = "hover-tint flex items-center gap-1.5 rounded-md px-1 py-1.5 sm:px-2";
// On mobile only the icon is shown (the label is still read by screen readers and shown as a tooltip).
const Label = ({ children }: { children: React.ReactNode }) => <span className="hidden sm:inline">{children}</span>;

/** Visual separation between display preferences (language, theme) and account links. */
const Divider = () => <span className="h-6 w-px bg-black/15 dark:bg-white/20" aria-hidden />;

export async function NavUser({ lang, t }: { lang: Locale; t: Dictionary["nav"] }) {
  const session = await getSession();
  if (session) {
    return (
      <>
        <Divider />
        <NavLink href={`/${lang}`} exact className={link} label={t.home}>
          <IconHome size={16} aria-hidden />
          <Label>{t.home}</Label>
        </NavLink>
        <NavLink href={`/${lang}/lists`} className={link} label={t.listsLong}>
          <IconBookmarks size={16} aria-hidden />
          <Label>{t.lists}</Label>
        </NavLink>
        <NavLink href={`/${lang}/profile`} className={link} label={t.profile}>
          <IconUser size={16} aria-hidden />
          <Label>{t.profile}</Label>
        </NavLink>
        {session.user.role === "admin" && (
          <NavLink href={`/${lang}/admin`} className={link} label="Admin">
            <IconShieldCog size={16} aria-hidden />
            <Label>Admin</Label>
          </NavLink>
        )}
        <Divider />
        <SignOutButton label={t.signOut} redirectTo={`/${lang}`} />
      </>
    );
  }
  return (
    <>
      <Divider />
      <NavLink href={`/${lang}`} exact className={link} label={t.home}>
        <IconHome size={16} aria-hidden />
        <Label>{t.home}</Label>
      </NavLink>
      <NavLink href={`/${lang}/sign-in`} className={link} label={t.signIn}>
        <IconLogin size={16} aria-hidden />
        <Label>{t.signIn}</Label>
      </NavLink>
      <Link href={`/${lang}/sign-up`} className="hover-tint flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-background">
        <IconUserPlus size={16} aria-hidden />
        {t.signUp}
      </Link>
    </>
  );
}
