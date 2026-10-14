/** SVG flags (flag emojis do not render on Windows: letters are shown instead). */
export type FlagLang = "fr" | "en";

export function Flag({ lang, className = "h-3.5 w-5" }: { lang: FlagLang; className?: string }) {
  const common = `${className} shrink-0 rounded-[2px] ring-1 ring-black/15 dark:ring-white/25`;
  if (lang === "fr") {
    return (
      <svg viewBox="0 0 3 2" className={common} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="1" height="2" fill="#0055A4" />
        <rect x="1" width="1" height="2" fill="#FFFFFF" />
        <rect x="2" width="1" height="2" fill="#EF4135" />
      </svg>
    );
  }
  // United Kingdom (Union Jack) for English.
  return (
    <svg viewBox="0 0 60 30" className={common} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <clipPath id="flag-gb-s">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="flag-gb-t">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#flag-gb-s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#flag-gb-t)" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
