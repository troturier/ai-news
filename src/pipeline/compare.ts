import { loadEnvFile, argv, exit } from "node:process";
import { mkdirSync, writeFileSync } from "node:fs";

try {
  loadEnvFile(".env");
} catch {}

const arg = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 ? argv[i + 1] : undefined;
};

const MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];

async function main() {
  const out = arg("out") ?? "./compare-out";
  mkdirSync(out, { recursive: true });
  const { discover } = await import("./discover");
  const { writeArticle } = await import("./write");
  const { UsageTracker } = await import("./llm");
  const { assessPopularity } = await import("./popularity");

  const theme = {
    name: arg("name") ?? "LLMs & agents",
    description: arg("desc") ?? "Language models, agents, tooling and protocols (MCP…).",
  };
  const today = new Date().toISOString().slice(0, 10);

  // 1) Discovery by each model
  const found: Record<string, Awaited<ReturnType<typeof discover>>> = {};
  const summary: Record<string, unknown> = {};
  for (const model of MODELS) {
    const tracker = new UsageTracker();
    const t0 = Date.now();
    try {
      const cands = await discover({
        themeName: theme.name,
        themeDescription: theme.description,
        today,
        alreadyPublished: [],
        max: 4,
        model,
        tracker,
      });
      found[model] = cands;
      const scored = [];
      for (const c of cands) {
        const v = await assessPopularity(c);
        scored.push({ title: c.title, url: c.url, publisher: c.publisher, score: v.score, accepted: v.accepted });
      }
      summary[`discovery:${model}`] = { seconds: Math.round((Date.now() - t0) / 1000), candidates: scored, usage: tracker.toJSON() };
    } catch (e) {
      summary[`discovery:${model}`] = { error: (e as Error).message };
    }
  }

  // 2) Writing of the same topic by each model
  const base = found["claude-opus-5-5"]?.[0] ?? Object.values(found).flat()[0];
  if (base) {
    for (const model of MODELS) {
      const tracker = new UsageTracker();
      const t0 = Date.now();
      try {
        const art = await writeArticle({ candidate: base, themeName: theme.name, model, tracker });
        writeFileSync(`${out}/write-${model}.json`, JSON.stringify(art, null, 2));
        summary[`write:${model}`] = {
          seconds: Math.round((Date.now() - t0) / 1000),
          verdict: art.verdict,
          wordsEn: art.en.body.split(/\s+/).length,
          wordsFr: art.fr.body.split(/\s+/).length,
          usage: tracker.toJSON(),
        };
      } catch (e) {
        summary[`write:${model}`] = { error: (e as Error).message };
      }
    }
  }
  summary.writtenSubject = base?.title;
  writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  exit(0);
}
main().catch((e) => {
  console.error(e);
  exit(1);
});
