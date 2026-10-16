// Pure helpers (no database, no server-only): shared by the scheduler and the admin form,
// which recomputes the cost estimate live while the frequency is edited.

export const FREQUENCIES: { days: number; label: string }[] = [
  { days: 0, label: "Désactivée (lancement manuel uniquement)" },
  { days: 1, label: "Tous les jours" },
  { days: 2, label: "Tous les 2 jours" },
  { days: 3, label: "Tous les 3 jours" },
  { days: 7, label: "Toutes les semaines" },
  { days: 14, label: "Toutes les 2 semaines" },
];

export const TIME_ZONE = "Europe/Paris";

/** Anthropic web search: 10 $ per 1 000 searches (platform.claude.com pricing, checked 2026-10-16); web fetch is free. */
export const WEB_SEARCH_USD = 0.01;
/** Writing one article with the default model (Haiku 5.5), see the comment in `pipeline/llm.ts`. */
export const WRITE_USD_PER_ARTICLE = 0.01;
/** Without any run history: tokens of one discovery (Sonnet 5.5, ~0.08 $) plus ~3 web searches. */
export const DEFAULT_DISCOVERY_USD_PER_THEME = 0.08 + 3 * WEB_SEARCH_USD;

const DAYS_PER_MONTH = 30.44;

export type CostBasis = {
  /** Discovery cost (tokens + web searches) for one theme. */
  discoveryUsdPerTheme: number;
  activeThemes: number;
  source: "history" | "default";
  /** Number of past runs the average comes from (0 with the default). */
  sampledRuns: number;
};

export function runsPerMonth(intervalDays: number) {
  return intervalDays > 0 ? DAYS_PER_MONTH / intervalDays : 0;
}

/** Upper-ish estimate: assumes `maxPerTheme` articles are written for every theme. */
export function costPerRunUsd(basis: CostBasis, maxPerTheme: number) {
  return basis.activeThemes * (basis.discoveryUsdPerTheme + maxPerTheme * WRITE_USD_PER_ARTICLE);
}

export function monthlyCostUsd(basis: CostBasis, intervalDays: number, maxPerTheme: number) {
  return runsPerMonth(intervalDays) * costPerRunUsd(basis, maxPerTheme);
}

/** Search cost of a run: the recorded one when present, otherwise derived from the search count (older runs). */
export function runSearchUsd(usage: { webSearches?: number; webSearchCostUsd?: number } | undefined) {
  return usage?.webSearchCostUsd ?? (usage?.webSearches ?? 0) * WEB_SEARCH_USD;
}

/** Cost basis from past runs: (tokens + searches − writing) / themes processed. */
export function basisFromRuns(
  runs: { themes: number; published: number; tokenUsd: number; searchUsd: number }[],
  activeThemes: number,
): CostBasis {
  const themes = runs.reduce((n, r) => n + r.themes, 0);
  if (!themes) {
    return { discoveryUsdPerTheme: DEFAULT_DISCOVERY_USD_PER_THEME, activeThemes, source: "default", sampledRuns: 0 };
  }
  const total = runs.reduce((n, r) => n + r.tokenUsd + r.searchUsd, 0);
  const writing = runs.reduce((n, r) => n + r.published * WRITE_USD_PER_ARTICLE, 0);
  return {
    discoveryUsdPerTheme: Math.max(0, (total - writing) / themes),
    activeThemes,
    source: "history",
    sampledRuns: runs.length,
  };
}

/** Offset (ms) of Europe/Paris from UTC at the given instant. */
function parisOffsetMs(at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE, hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
    }).formatToParts(at).map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at.getTime() / 1000) * 1000;
}

/** The instant at which the wall clock in Paris reads y-m-d h:00 (month 0-based, day may overflow). */
function parisWallClock(y: number, m: number, d: number, h: number) {
  const guess = Date.UTC(y, m, d, h);
  return new Date(guess - parisOffsetMs(new Date(guess - parisOffsetMs(new Date(guess)))));
}

/** First instant of the calendar month (Paris) containing `at`. */
export function startOfParisMonth(at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "numeric" })
      .formatToParts(at).map((x) => [x.type, Number(x.value)]),
  );
  return parisWallClock(p.year, p.month - 1, 1, 0);
}

/** Next scheduled start: `intervalDays` calendar days (Paris) after the baseline's day, at `hour`. */
export function nextDueAt(baseline: Date, intervalDays: number, hour: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(baseline).map((x) => [x.type, Number(x.value)]),
  );
  return parisWallClock(p.year, p.month - 1, p.day + intervalDays, hour);
}
