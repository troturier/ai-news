/** Subheadings of a Markdown article (levels 1 and 2), with a unique anchor identifier per heading. */
export type Heading = { text: string; id: string };

const plain = (s: string) =>
  s
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links and images: keep the text
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export function extractHeadings(markdown: string): Heading[] {
  const seen = new Map<string, number>();
  const out: Heading[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^#{1,2}\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = plain(m[1]);
    if (!text) continue;
    const base = `part-${slugify(text) || "section"}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({ text, id: n === 1 ? base : `${base}-${n}` });
  }
  return out;
}
