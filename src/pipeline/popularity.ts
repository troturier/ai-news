import { hostOf } from "./url";

export type Candidate = {
  title: string;
  url: string;
  publisher: string;
  publishedAt: string;
  whyItMatters: string;
  githubRepo: string | null;
  corroboratingUrls: string[];
};

export type PopularityVerdict = {
  accepted: boolean;
  score: number;
  reasons: string[];
  signals: Record<string, unknown>;
};

const MIN_STARS = Number(process.env.PIPELINE_MIN_STARS || 1000);
const MAX_INACTIVE_DAYS = 90;
const MIN_SCORE = Number(process.env.PIPELINE_MIN_SCORE || 15);

// Domain weight: official/primary source > major outlet > other site.
const PRIMARY_HOSTS = [
  "anthropic.com", "openai.com", "google", "deepmind.google", "ai.meta.com", "meta.com",
  "microsoft.com", "nvidia.com", "apple.com", "amazon.com", "aws.amazon.com", "mistral.ai",
  "huggingface.co", "github.com", "github.blog", "arxiv.org", "nature.com", "science.org",
  "europa.eu", "eur-lex.europa.eu", "cnil.fr", "legifrance.gouv.fr", "whitehouse.gov",
  "nist.gov", "gov.uk", "x.ai", "deepseek.com", "qwen.ai", "stability.ai", "cohere.com",
];
const MAJOR_OUTLETS = [
  "reuters.com", "apnews.com", "bloomberg.com", "ft.com", "wsj.com", "nytimes.com",
  "theguardian.com", "bbc.com", "bbc.co.uk", "theverge.com", "techcrunch.com",
  "arstechnica.com", "wired.com", "technologyreview.com", "cnbc.com", "axios.com",
  "venturebeat.com", "zdnet.com", "lemonde.fr", "lesechos.fr", "numerama.com", "01net.com",
  "politico.eu", "euractiv.com", "news.ycombinator.com",
];
const hostMatches = (host: string, list: string[]) =>
  list.some((d) => host === d || host.endsWith(`.${d}`) || (d === "google" && host.endsWith(".google")));
export const hostWeight = (host: string) =>
  hostMatches(host, PRIMARY_HOSTS) ? 20 : hostMatches(host, MAJOR_OUTLETS) ? 10 : 5;

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ai-news-pipeline", ...headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${res.status} on ${new URL(url).hostname}`);
  return res.json();
}

async function githubSignals(repo: string) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const r = await getJson(`https://api.github.com/repos/${repo}`, headers);
    return {
      stars: r.stargazers_count as number,
      archived: r.archived as boolean,
      pushedAt: r.pushed_at as string,
    };
  } catch {
    return null;
  }
}

async function hnPoints(url: string): Promise<number> {
  try {
    const r = await getJson(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(url)}&restrictSearchableAttributes=url&tags=story`,
    );
    return Math.max(0, ...(r.hits as { points?: number }[]).map((h) => h.points ?? 0));
  } catch {
    return 0;
  }
}

/**
 * Deterministic filter: we do not trust the model's judgement of
 * popularity, we check it against GitHub and Hacker News.
 */
export async function assessPopularity(c: Candidate): Promise<PopularityVerdict> {
  const reasons: string[] = [];
  const signals: Record<string, unknown> = {};
  let score = 0;

  if (c.githubRepo) {
    const gh = await githubSignals(c.githubRepo);
    signals.github = gh;
    if (!gh) {
      return { accepted: false, score: 0, reasons: ["GitHub repository not found"], signals };
    }
    const inactiveDays = (Date.now() - Date.parse(gh.pushedAt)) / 86_400_000;
    if (gh.archived) reasons.push("repository archived");
    if (gh.stars < MIN_STARS) reasons.push(`${gh.stars} stars (< ${MIN_STARS})`);
    if (inactiveDays > MAX_INACTIVE_DAYS) reasons.push(`inactive for ${Math.round(inactiveDays)} d`);
    if (reasons.length) return { accepted: false, score: 0, reasons, signals };
    score += Math.round(Math.log10(gh.stars) * 10);
    reasons.push(`${gh.stars} stars, active`);
  }

  const points = await hnPoints(c.url);
  signals.hnPoints = points;
  if (points >= 50) {
    score += points >= 200 ? 35 : 20;
    reasons.push(`HN ${points} pts`);
  }

  // Distinct domains: the main source and the corroborating ones, weighted.
  const hosts = new Set(
    [c.url, ...c.corroboratingUrls].map(hostOf).filter((h): h is string => !!h),
  );
  const weights = [...hosts].map((h) => ({ host: h, w: hostWeight(h) }));
  signals.hosts = weights;
  const fromHosts = Math.min(
    weights.reduce((sum, x) => sum + x.w, 0),
    40,
  );
  if (fromHosts) {
    score += fromHosts;
    reasons.push(`sources: ${weights.map((x) => `${x.host} (${x.w})`).join(", ")}`);
  }

  const accepted = score >= MIN_SCORE;
  if (!accepted) reasons.push(`score ${score} < ${MIN_SCORE}`);
  return { accepted, score, reasons, signals };
}
