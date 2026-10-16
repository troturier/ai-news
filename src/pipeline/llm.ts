import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { WEB_SEARCH_USD } from "../lib/pipeline-schedule";

// Defaults chosen to minimize cost (comparison of 2026-10-14, one sample per model):
// discovery with Sonnet 5.5 (3 candidates, ~$0.08/theme), writing with Haiku 5.5 (~$0.01/article).
// Overridable globally (PIPELINE_MODEL) or per step.
export const MODELS = {
  discovery:
    process.env.PIPELINE_DISCOVERY_MODEL || process.env.PIPELINE_MODEL || "claude-sonnet-5-5",
  write: process.env.PIPELINE_WRITE_MODEL || process.env.PIPELINE_MODEL || "claude-haiku-5-5",
};

type Price = { in: number; out: number; cacheRead: number };

// $ per million tokens (input / output / cache read). Sonnet and Haiku: platform.claude.com/docs/en/about-claude/pricing,
// checked 2026-10-16; Opus: claude-api skill, 2026-10-06. Cache writes are not priced (the pipeline does not cache).
const PRICES: Record<string, Price & { longPrompt?: { above: number } & Price }> = {
  "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.1 },
  // Haiku 5.5: the whole request is billed at the long-prompt rate once its prompt exceeds 100K tokens.
  "claude-haiku-5-5": {
    in: 0.1, out: 0.5, cacheRead: 0.01,
    longPrompt: { above: 100_000, in: 0.5, out: 2.5, cacheRead: 0.05 },
  },
};

/** Price of one request: the long-prompt rate applies when input + cache read + cache write exceed the threshold. */
function priceFor(model: string, promptTokens: number): Price | null {
  const p = PRICES[model];
  if (!p) return null;
  return p.longPrompt && promptTokens > p.longPrompt.above ? p.longPrompt : p;
}

type StepUsage = {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  webSearches: number;
  webFetches: number;
  tokenCostUsd: number;
};

const emptyStep = (): StepUsage => ({
  calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
  webSearches: 0, webFetches: 0, tokenCostUsd: 0,
});

const round4 = (n: number) => Number(n.toFixed(4));

export class UsageTracker {
  inputTokens = 0;
  outputTokens = 0;
  cacheReadTokens = 0;
  cacheWriteTokens = 0;
  webSearches = 0;
  webFetches = 0;
  calls = 0;
  searchErrors: string[] = [];
  /** Tokens only (stored in `pipeline_runs.cost_usd`); web searches are in `webSearchCostUsd`. */
  tokenCostUsd = 0;
  unpricedModels = new Set<string>();
  /** Usage per step label, e.g. `discovery:<themeSlug>` or `write:<themeSlug>`. */
  byStep = new Map<string, StepUsage>();

  get webSearchCostUsd() {
    return this.webSearches * WEB_SEARCH_USD;
  }

  add(u: Anthropic.Beta.BetaUsage, model: string, label: string) {
    const input = u.input_tokens ?? 0;
    const output = u.output_tokens ?? 0;
    const cacheRead = u.cache_read_input_tokens ?? 0;
    const cacheWrite = u.cache_creation_input_tokens ?? 0;
    const searches = u.server_tool_use?.web_search_requests ?? 0;
    const fetches = u.server_tool_use?.web_fetch_requests ?? 0;
    const p = priceFor(model, input + cacheRead + cacheWrite);
    if (!p) this.unpricedModels.add(model);
    const cost = p ? (input * p.in + output * p.out + cacheRead * p.cacheRead) / 1e6 : 0;

    const step = this.byStep.get(label) ?? emptyStep();
    this.byStep.set(label, step);
    for (const t of [this, step]) {
      t.calls++;
      t.inputTokens += input;
      t.outputTokens += output;
      t.cacheReadTokens += cacheRead;
      t.cacheWriteTokens += cacheWrite;
      t.webSearches += searches;
      t.webFetches += fetches;
      t.tokenCostUsd += cost;
    }
  }

  toJSON() {
    return {
      models: MODELS,
      calls: this.calls,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      cacheReadTokens: this.cacheReadTokens,
      cacheWriteTokens: this.cacheWriteTokens,
      webSearches: this.webSearches,
      webFetches: this.webFetches,
      searchErrors: this.searchErrors,
      tokenCostUsd: round4(this.tokenCostUsd),
      webSearchCostUsd: round4(this.webSearchCostUsd),
      totalCostUsd: round4(this.tokenCostUsd + this.webSearchCostUsd),
      unpricedModels: [...this.unpricedModels],
      byStep: Object.fromEntries(
        [...this.byStep].map(([label, s]) => [
          label,
          { ...s, tokenCostUsd: round4(s.tokenCostUsd), webSearchCostUsd: round4(s.webSearches * WEB_SEARCH_USD) },
        ]),
      ),
    };
  }
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

type Tools = Anthropic.Beta.BetaToolUnion[];

/**
 * Structured call: JSON output validated by zod, automatic resume on
 * `pause_turn` (server tools), server fallback on refusal.
 */
export async function structured<S extends z.ZodType>(
  schema: S,
  opts: {
    system: string;
    prompt: string;
    tools?: Tools;
    model: string;
    effort?: "low" | "medium" | "high";
    maxTokens?: number;
    tracker: UsageTracker;
    /** Step label for the usage breakdown, e.g. `discovery:<themeSlug>`. */
    label: string;
  },
): Promise<z.infer<S>> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: opts.prompt },
  ];

  for (let turn = 0; turn < 5; turn++) {
    // Server fallback on refusal: not available for Haiku 5.5.
    const withFallback = opts.model !== "claude-haiku-5-5";
    const res = await getClient().beta.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 16000,
      ...(withFallback
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      system: opts.system,
      tools: opts.tools,
      messages,
      output_config: {
        effort: opts.effort ?? "medium",
        format: zodOutputFormat(schema),
      },
    });
    opts.tracker.add(res.usage, opts.model, opts.label);
    for (const b of res.content) {
      if (b.type === "web_search_tool_result" || b.type === "web_fetch_tool_result") {
        const c = b.content as { type?: string; error_code?: string };
        if (c && !Array.isArray(c) && c.error_code) opts.tracker.searchErrors.push(`${b.type}: ${c.error_code}`);
      }
    }

    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    if (res.stop_reason === "refusal") {
      throw new Error(`Model refusal (${res.stop_details?.category ?? "?"})`);
    }
    if (res.stop_reason === "max_tokens") {
      throw new Error("Response truncated (max_tokens)");
    }

    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (process.env.PIPELINE_DEBUG) console.error(`[debug] ${res.stop_reason}\n${text}`);
    return schema.parse(JSON.parse(text));
  }
  throw new Error("Trop de reprises pause_turn");
}
