import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

// Defaults chosen to minimize cost (comparison of 2026-10-14, one sample per model):
// discovery with Sonnet 5.5 (3 candidates, ~$0.08/theme), writing with Haiku 5.5 (~$0.01/article).
// Overridable globally (PIPELINE_MODEL) or per step.
export const MODELS = {
  discovery:
    process.env.PIPELINE_DISCOVERY_MODEL || process.env.PIPELINE_MODEL || "claude-sonnet-5-5",
  write: process.env.PIPELINE_WRITE_MODEL || process.env.PIPELINE_MODEL || "claude-haiku-5-5",
};

// $ per million tokens (input / output / cache read). Source: claude-api skill, 2026-10-06.
const PRICES: Record<string, { in: number; out: number; cacheRead: number }> = {
  "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2 },
  // Haiku 5.5 : price up to 100K prompt tokens; cache read assumed at 10% (unverified).
  "claude-haiku-5-5": { in: 0.1, out: 0.5, cacheRead: 0.01 },
};

export class UsageTracker {
  inputTokens = 0;
  outputTokens = 0;
  cacheReadTokens = 0;
  cacheWriteTokens = 0;
  webSearches = 0;
  webFetches = 0;
  calls = 0;
  searchErrors: string[] = [];
  tokenCostUsd = 0;
  unpricedModels = new Set<string>();

  add(u: Anthropic.Beta.BetaUsage, model: string) {
    this.calls++;
    this.inputTokens += u.input_tokens ?? 0;
    this.outputTokens += u.output_tokens ?? 0;
    this.cacheReadTokens += u.cache_read_input_tokens ?? 0;
    this.cacheWriteTokens += u.cache_creation_input_tokens ?? 0;
    this.webSearches += u.server_tool_use?.web_search_requests ?? 0;
    this.webFetches += u.server_tool_use?.web_fetch_requests ?? 0;
    const p = PRICES[model];
    if (!p) return void this.unpricedModels.add(model);
    this.tokenCostUsd +=
      ((u.input_tokens ?? 0) * p.in +
        (u.output_tokens ?? 0) * p.out +
        (u.cache_read_input_tokens ?? 0) * p.cacheRead) /
      1e6;
  }

  toJSON() {
    return {
      models: MODELS,
      calls: this.calls,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      cacheReadTokens: this.cacheReadTokens,
      webSearches: this.webSearches,
      webFetches: this.webFetches,
      searchErrors: this.searchErrors,
      tokenCostUsd: Number(this.tokenCostUsd.toFixed(4)),
      unpricedModels: [...this.unpricedModels],
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
    opts.tracker.add(res.usage, opts.model);
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
