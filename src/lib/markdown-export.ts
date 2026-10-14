import "server-only";
import { siteUrl } from "@/lib/site";
import type { ArticleDetail } from "@/lib/articles";
import type { Locale } from "@/i18n/config";

const q = (v: string) => JSON.stringify(v); // valid YAML string (JSON ⊂ YAML)

/** Markdown note for an article, with YAML frontmatter for Obsidian. */
export function articleToMarkdown(a: ArticleDetail, lang: Locale): string {
  const url = `${siteUrl}/${lang}/articles/${a.slug}`;
  return [
    "---",
    `title: ${q(a.title)}`,
    `date: ${a.publishedAt.toISOString().slice(0, 10)}`,
    `theme: ${q(a.theme.name)}`,
    `tags: [${[...new Set(["ai-news", ...a.tags.map((t) => t.toLowerCase().replace(/[^\p{L}\p{N}_/-]+/gu, "-").replace(/^-+|-+$/g, ""))])].filter(Boolean).map(q).join(", ")}]`,
    `language: ${lang}`,
    `source: ${q(url)}`,
    "---",
    "",
    `# ${a.title}`,
    "",
    `> ${a.summary}`,
    "",
    a.body.trim(),
    "",
    lang === "fr" ? "## Sources" : "## Sources",
    "",
    ...a.sources.map((s) => `- [${s.publisher ?? new URL(s.url).hostname}](${s.url})`),
    "",
    `[${lang === "fr" ? "Article sur AI News" : "Article on AI News"}](${url})`,
    "",
  ].join("\n");
}

export function listToMarkdown(
  list: { name: string },
  items: { slug: string; title: string; summary: string; publishedAt: Date; theme: string }[],
  lang: Locale,
): string {
  return [
    "---",
    `title: ${q(list.name)}`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
    `tags: ["ai-news", "reading-list"]`,
    `language: ${lang}`,
    "---",
    "",
    `# ${list.name}`,
    "",
    ...items.flatMap((i) => [
      `## [${i.title}](${siteUrl}/${lang}/articles/${i.slug})`,
      `*${i.theme} · ${i.publishedAt.toISOString().slice(0, 10)}*`,
      "",
      i.summary,
      "",
    ]),
  ].join("\n");
}

export const markdownResponse = (body: string, filename: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]+/g, "_")}"`,
    },
  });
