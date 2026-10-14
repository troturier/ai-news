/** Canonical URL: host without www, without tracking parameters, without fragment or trailing "/". */
export function canonicalUrl(raw: string): string {
  const u = new URL(raw);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`Protocol refused: ${u.protocol}`);
  }
  u.hash = "";
  u.hostname = u.hostname.replace(/^www\./, "").toLowerCase();
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|ref$|source$)/i.test(key)) u.searchParams.delete(key);
  }
  u.searchParams.sort();
  const s = u.toString();
  return s.endsWith("/") && u.pathname !== "/" ? s.slice(0, -1) : s;
}

export const hostOf = (raw: string) => {
  try {
    return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  );

/** Jaccard similarity between two titles (0 to 1). */
export function titleSimilarity(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
