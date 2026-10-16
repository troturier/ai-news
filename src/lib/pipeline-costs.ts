// Pure helpers (no database): read the usage recorded in `pipeline_runs.stats` and aggregate it
// per step kind (discovery / writing) and per theme for the admin spending view.

import { runSearchUsd } from "./pipeline-schedule";

type StepUsage = {
  calls?: number; inputTokens?: number; outputTokens?: number; cacheReadTokens?: number;
  webSearches?: number; webFetches?: number; tokenCostUsd?: number; webSearchCostUsd?: number;
};

/** Shape of `pipeline_runs.stats` (written by `pipeline/run.ts`); every field may be missing on old runs. */
export type RunStats = {
  themes?: number; discovered?: number; duplicates?: number; rejectedPopularity?: number;
  skippedByWriter?: number; published?: number; errors?: string[];
  usage?: {
    calls?: number; inputTokens?: number; outputTokens?: number; webSearches?: number; webFetches?: number;
    webSearchCostUsd?: number; byStep?: Record<string, StepUsage>;
  };
};

export type CostLine = {
  calls: number; inputTokens: number; outputTokens: number; webSearches: number; webFetches: number;
  tokenUsd: number; searchUsd: number;
};

export const emptyLine = (): CostLine => ({
  calls: 0, inputTokens: 0, outputTokens: 0, webSearches: 0, webFetches: 0, tokenUsd: 0, searchUsd: 0,
});

export const lineTotal = (l: CostLine) => l.tokenUsd + l.searchUsd;

function addTo(target: CostLine, l: CostLine) {
  for (const k of Object.keys(target) as (keyof CostLine)[]) target[k] += l[k];
}

export type Kind = "discovery" | "write";
export const KINDS: Kind[] = ["discovery", "write"];

export type RunCost = {
  /** Whole run (tokens from `cost_usd`, searches recorded or derived from the count). */
  total: CostLine;
  /** False for runs recorded before the per-step breakdown (2026-10-16): only `total` is known. */
  detailed: boolean;
  byKind: Record<Kind, CostLine>;
  /** Theme slug -> cost per kind. */
  byTheme: Record<string, Record<Kind, CostLine>>;
};

/** Step label `discovery:<themeSlug>` / `write:<themeSlug>` -> kind and theme ("" when the label has none). */
function parseLabel(label: string): { kind: Kind; theme: string } {
  const [kind, theme = ""] = label.split(":");
  return { kind: kind === "write" ? "write" : "discovery", theme };
}

export function runCost(costUsd: string | null, stats: RunStats | null): RunCost {
  const u = stats?.usage;
  const total: CostLine = {
    calls: u?.calls ?? 0, inputTokens: u?.inputTokens ?? 0, outputTokens: u?.outputTokens ?? 0,
    webSearches: u?.webSearches ?? 0, webFetches: u?.webFetches ?? 0,
    tokenUsd: Number(costUsd ?? 0), searchUsd: runSearchUsd(u),
  };
  const byKind = { discovery: emptyLine(), write: emptyLine() };
  const byTheme: RunCost["byTheme"] = {};
  const steps = u?.byStep;
  if (steps) {
    for (const [label, s] of Object.entries(steps)) {
      const { kind, theme } = parseLabel(label);
      const line: CostLine = {
        calls: s.calls ?? 0, inputTokens: s.inputTokens ?? 0, outputTokens: s.outputTokens ?? 0,
        webSearches: s.webSearches ?? 0, webFetches: s.webFetches ?? 0,
        tokenUsd: s.tokenCostUsd ?? 0, searchUsd: s.webSearchCostUsd ?? 0,
      };
      addTo(byKind[kind], line);
      byTheme[theme] ??= { discovery: emptyLine(), write: emptyLine() };
      addTo(byTheme[theme][kind], line);
    }
  }
  return { total, detailed: !!steps, byKind, byTheme };
}

export type CostSummary = {
  total: CostLine;
  byKind: Record<Kind, CostLine>;
  /** Cost of the runs without per-step breakdown. */
  undetailed: CostLine;
  undetailedRuns: number;
  byTheme: Record<string, Record<Kind, CostLine>>;
};

export function summarize(runs: RunCost[]): CostSummary {
  const out: CostSummary = {
    total: emptyLine(), byKind: { discovery: emptyLine(), write: emptyLine() },
    undetailed: emptyLine(), undetailedRuns: 0, byTheme: {},
  };
  for (const r of runs) {
    addTo(out.total, r.total);
    if (!r.detailed) {
      addTo(out.undetailed, r.total);
      out.undetailedRuns++;
      continue;
    }
    for (const k of KINDS) addTo(out.byKind[k], r.byKind[k]);
    for (const [theme, kinds] of Object.entries(r.byTheme)) {
      out.byTheme[theme] ??= { discovery: emptyLine(), write: emptyLine() };
      for (const k of KINDS) addTo(out.byTheme[theme][k], kinds[k]);
    }
  }
  return out;
}

/** Admin labels (French) of `pipeline_runs.trigger` and `pipeline_runs.status`. */
export const RUN_TRIGGERS: Record<string, string> = { manual: "manuel", scheduled: "planifié", cli: "CLI" };
export const RUN_STATUSES: Record<string, string> = { ok: "terminée", error: "erreur", running: "en cours" };

/** "1,23 $" with the given number of decimals. */
export const fmtUsd = (n: number, digits = 2) => `${n.toFixed(digits).replace(".", ",")} $`;

/** "12 345" / "1,2 M" for token counts. */
export const fmtTokens = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} M` : new Intl.NumberFormat("fr-FR").format(n);
