import { loadEnvFile, argv, exit } from "node:process";

try {
  loadEnvFile(".env");
} catch {}

const arg = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : undefined;
};

async function main() {
  // Late import: the database reads DATABASE_URL at import time.
  const { runPipeline } = await import("./run");
  const { stats, usage } = await runPipeline({
    themeSlugs: arg("theme")?.split(","),
    maxPerTheme: Number(arg("max") ?? 2),
    dryRun: argv.includes("--dry"),
  });
  console.log(JSON.stringify({ ...stats, usage }, null, 2));
  exit(stats.errors.length && !stats.published && !argv.includes("--dry") ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  exit(1);
});
