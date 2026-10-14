import { safeFetch } from "./safe-fetch";

export type FoundImage = { url: string; source: "og" | "github" };

const attrs = (tag: string) => {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? "";
  return out;
};

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&#38;/g, "&");

/** Looks for og:image / twitter:image in the HTML (top of the page only). */
export function extractImageUrl(html: string, baseUrl: string): string | null {
  const head = html.slice(0, 400_000);
  const found: Record<string, string> = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.property ?? a.name ?? "").toLowerCase();
    if (a.content && /^(og:image(:secure_url)?|twitter:image(:src)?)$/.test(key)) found[key] ??= decode(a.content.trim());
  }
  const raw = found["og:image:secure_url"] ?? found["og:image"] ?? found["twitter:image"] ?? found["twitter:image:src"];
  if (!raw) return null;
  try {
    const u = new URL(raw, baseUrl);
    if (u.protocol === "http:") u.protocol = "https:"; // avoids mixed content
    if (u.protocol !== "https:" || u.toString().length > 500) return null;
    if (/\.(svg|ico|gif)(\?|$)/i.test(u.pathname)) return null; // generic logos, animations
    return u.toString();
  } catch {
    return null;
  }
}

/** Does the image really exist and is it actually an image (start of the file only)? */
async function looksLikeImage(url: string): Promise<boolean> {
  try {
    const res = await safeFetch(url, { headers: { Range: "bytes=0-2047", Accept: "image/*" }, maxBytes: 4096, timeoutMs: 6000 });
    return res.status >= 200 && res.status < 300 && String(res.headers["content-type"] ?? "").toLowerCase().startsWith("image/");
  } catch {
    return false;
  }
}

/**
 * Illustration of an article: owner avatar for a GitHub project, otherwise the sharing image of the
 * source page. `null` if nothing reliable: the UI will show the theme icon.
 */
export async function findImage(opts: { url: string; githubRepo?: string | null }): Promise<FoundImage | null> {
  let repo = opts.githubRepo ?? null;
  if (!repo) {
    const m = new URL(opts.url).pathname.match(/^\/([\w.-]+)\/([\w.-]+)/);
    if (m && new URL(opts.url).hostname.replace(/^www\./, "") === "github.com") repo = `${m[1]}/${m[2]}`;
  }
  if (repo && /^[\w.-]+\/[\w.-]+$/.test(repo) && !repo.split("/").some((p) => /^\.+$/.test(p))) {
    return { url: `https://github.com/${repo.split("/")[0]}.png?size=400`, source: "github" };
  }
  try {
    const res = await safeFetch(opts.url);
    if (res.status < 200 || res.status >= 300) return null;
    const img = extractImageUrl(res.body.toString("utf8"), res.url);
    if (img && (await looksLikeImage(img))) return { url: img, source: "og" };
  } catch {
    // source unreachable, blocked or refused: no illustration
  }
  return null;
}
