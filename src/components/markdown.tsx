import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Heading } from "@/lib/headings";
import { SectionIcon } from "@/lib/section-icons";

const hostOf = (raw: string) => {
  try {
    return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

function isAllowedLink(href: string | undefined, allowed: string[]) {
  if (!href || !/^https?:\/\//i.test(href)) return false;
  const h = hostOf(href);
  return !!h && allowed.some((a) => h === a || h.endsWith(`.${a}`));
}

/**
 * The content comes from a model working on web pages: raw HTML is never
 * rendered (react-markdown ignores it by default, rehype-raw is not enabled)
 * and outgoing links are isolated.
 *
 * `headings` (extracted from the same text by `extractHeadings`) gives each subheading an anchor id and an icon,
 * in document order: the page's table of contents points to these anchors.
 */
export function Markdown({
  children,
  headings = [],
  allowedHosts,
}: {
  children: string;
  headings?: Heading[];
  /** Generated content: a link is only rendered if its host is one of these (or a sub-domain); otherwise plain text. */
  allowedHosts?: string[];
}) {
  let n = 0;
  // Body headings start at h2: the page carries the h1.
  const Title = ({ children }: { children?: React.ReactNode }) => {
    const h = headings[n++];
    return (
      <h2 id={h?.id} className="flex scroll-mt-6 items-center gap-2.5">
        {h && <SectionIcon text={h.text} />}
        <span>{children}</span>
      </h2>
    );
  };

  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) =>
            allowedHosts && !isAllowedLink(href, allowedHosts) ? (
              <span>{children}</span>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                {children}
              </a>
            ),
          // Images embedded by the model would be tracking pixels or hotlinks: never rendered.
          img: () => null,
          h1: Title,
          h2: Title,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
