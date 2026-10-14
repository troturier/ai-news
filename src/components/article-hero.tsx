import { ArticleThumb } from "@/components/article-thumb";
import { ThemeIcon } from "@/components/icon";

/**
 * Illustration at the top of an article, across the full column width. Source's share image:
 * cropped into a banner. GitHub avatar (logo): shown whole on a tinted background. No image: the banner
 * reuses the theme icon. Same light shadow as on the cards.
 */
export function ArticleHero({
  src,
  source,
  color,
  icon,
  credit,
  creditHref,
}: {
  src: string | null;
  source: string | null;
  color: string;
  icon: string;
  credit?: string;
  creditHref?: string;
}) {
  const frame = "overflow-hidden rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.28)] ring-1 ring-black/5 dark:ring-white/10";
  const tint = (children: React.ReactNode) => (
    <div className="flex h-36 w-full items-center justify-center" style={{ color, background: `${color}26` }} aria-hidden>
      {children}
    </div>
  );
  const themeIcon = tint(<ThemeIcon name={icon} size={56} />);

  return (
    <figure className="mb-5 mt-4">
      <div className={frame}>
        {src && source === "github" ? (
          tint(
            <ArticleThumb
              priority
              src={src}
              fallback={<ThemeIcon name={icon} size={56} />}
              className="h-24 w-24 rounded-lg bg-white object-contain"
            />,
          )
        ) : (
          <ArticleThumb
            priority
            src={src}
            fallback={themeIcon}
            className="aspect-[2/1] max-h-80 w-full bg-black/5 object-cover"
          />
        )}
      </div>
      {credit && creditHref && (
        <figcaption className="mt-1.5 text-right text-xs opacity-60">
          {credit}{" "}
          <a href={creditHref} target="_blank" rel="noopener noreferrer nofollow" className="underline">
            {new URL(creditHref).hostname.replace(/^www\./, "")}
          </a>
        </figcaption>
      )}
    </figure>
  );
}
