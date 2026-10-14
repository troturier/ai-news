"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Flag, type FlagLang } from "@/components/flags";

// Language names in their own language (never translated).
const OPTIONS: { lang: FlagLang; name: string }[] = [
  { lang: "fr", name: "Français" },
  { lang: "en", name: "English" },
];

/**
 * Language switch: both options are visible, the current language's one is highlighted
 * (not clickable), the other leads to the same page in its language. Flag only on mobile, flag + code beyond.
 */
export function LangSwitchView({
  current,
  hrefs,
  label,
}: {
  current: FlagLang;
  hrefs: Record<FlagLang, string>;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-stretch overflow-hidden rounded-md border border-black/15 dark:border-white/20">
      {OPTIONS.map((o, i) => {
        const base = `flex items-center gap-1.5 px-1.5 py-1.5 text-xs font-semibold uppercase sm:px-2.5 ${
          i > 0 ? "border-l border-black/15 dark:border-white/20" : ""
        }`;
        const content = (
          <>
            <Flag lang={o.lang} />
            <span className="hidden sm:inline">{o.lang}</span>
          </>
        );
        return o.lang === current ? (
          <span key={o.lang} lang={o.lang} aria-current="true" aria-label={o.name} title={o.name} className={`${base} segment-active`}>
            {content}
          </span>
        ) : (
          <Link key={o.lang} href={hrefs[o.lang]} hrefLang={o.lang} lang={o.lang} aria-label={o.name} title={o.name} className={`${base} hover-tint`}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

/** Same page in the other language: replaces the first URL segment and keeps the query string. */
export function LangSwitch({ current, label }: { current: FlagLang; label: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const rest = pathname.split("/").slice(2).join("/");
  const hrefFor = (l: FlagLang) => `/${l}${rest ? `/${rest}` : ""}${search ? `?${search}` : ""}`;
  return <LangSwitchView current={current} hrefs={{ fr: hrefFor("fr"), en: hrefFor("en") }} label={label} />;
}
