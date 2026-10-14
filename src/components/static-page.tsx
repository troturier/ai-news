import { Markdown } from "@/components/markdown";
import { ThemeIcon } from "@/components/icon";

/** Shared layout of the static pages (About, Legal): one icon per `##` section of the Markdown body. */
export function StaticPage({ title, intro, body, icons }: { title: string; intro: string; body: string; icons: string[] }) {
  const sections = body.split(/^## /m).map((s) => s.trim()).filter(Boolean);
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold leading-tight">{title}</h1>
      <p className="mb-8 mt-2 text-lg opacity-75">{intro}</p>
      {sections.map((section, i) => {
        const [heading, ...rest] = section.split("\n");
        return (
          <section key={heading} className="mb-8">
            <h2 className="mb-3 flex items-center gap-2.5 text-2xl font-bold">
              {icons[i] && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-black/5 dark:bg-white/10">
                  <ThemeIcon name={icons[i]} size={20} />
                </span>
              )}
              {heading}
            </h2>
            <Markdown>{rest.join("\n")}</Markdown>
          </section>
        );
      })}
    </article>
  );
}
