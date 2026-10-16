import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { pipelineRuns, pipelineSettings, themes } from "../db/schema";
import { basisFromRuns, nextDueAt } from "../lib/pipeline-schedule";
import { runPipeline } from "./run";

/** A "running" run whose heartbeat is older than this is dead (crash, restart of the container). */
export const STALE_MS = 3 * 60_000;
const LOCK_KEY = 727_001;

export async function getSettings() {
  await db.insert(pipelineSettings).values({ id: 1 }).onConflictDoNothing();
  const [row] = await db.select().from(pipelineSettings).where(eq(pipelineSettings.id, 1));
  return row;
}

async function markStaleRunsDead() {
  await db
    .update(pipelineRuns)
    .set({ status: "error", finishedAt: new Date(), error: "Exécution interrompue (plus de signe de vie)" })
    .where(and(eq(pipelineRuns.status, "running"), lt(pipelineRuns.heartbeatAt, new Date(Date.now() - STALE_MS))));
}

export type StartResult = { started: true; runId: string } | { started: false; reason: "already-running" };

/**
 * Starts a run in the background of this process and returns at once.
 * One run at a time: the check and the insert are serialized by an advisory lock.
 */
export async function startRun(opts: { trigger: "manual" | "scheduled"; maxPerTheme: number }): Promise<StartResult> {
  await markStaleRunsDead();
  const runId = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${LOCK_KEY})`);
    const running = await tx.select({ id: pipelineRuns.id }).from(pipelineRuns).where(eq(pipelineRuns.status, "running")).limit(1);
    if (running.length) return null;
    const [row] = await tx.insert(pipelineRuns).values({ trigger: opts.trigger }).returning({ id: pipelineRuns.id });
    return row.id;
  });
  if (!runId) return { started: false, reason: "already-running" };

  // Not awaited: runPipeline records its own outcome (status, error) in the row.
  void runPipeline({ runId, trigger: opts.trigger, maxPerTheme: opts.maxPerTheme, dryRun: false }).catch((e) =>
    console.error("[pipeline] run failed:", e),
  );
  return { started: true, runId };
}

/** Starts a scheduled run when the next due date, computed from the last run or settings change, has passed. */
export async function schedulerTick(now = new Date()) {
  const settings = await getSettings();
  if (settings.intervalDays <= 0) return;
  const [last] = await db.select({ startedAt: pipelineRuns.startedAt }).from(pipelineRuns).orderBy(desc(pipelineRuns.startedAt)).limit(1);
  const baseline = last && last.startedAt > settings.updatedAt ? last.startedAt : settings.updatedAt;
  if (now < nextDueAt(baseline, settings.intervalDays, settings.hour)) return;
  const res = await startRun({ trigger: "scheduled", maxPerTheme: settings.maxPerTheme });
  if (res.started) console.log(`[pipeline] scheduled run started (${res.runId})`);
}

/** Next scheduled start, or null when the scheduler is off. */
export async function nextScheduledAt() {
  const settings = await getSettings();
  if (settings.intervalDays <= 0) return null;
  const [last] = await db.select({ startedAt: pipelineRuns.startedAt }).from(pipelineRuns).orderBy(desc(pipelineRuns.startedAt)).limit(1);
  const baseline = last && last.startedAt > settings.updatedAt ? last.startedAt : settings.updatedAt;
  return nextDueAt(baseline, settings.intervalDays, settings.hour);
}

/** Cost basis for the estimate: the 6 latest finished runs that processed at least one theme. */
export async function costBasis() {
  const [rows, active] = await Promise.all([
    db
      .select({ stats: pipelineRuns.stats, costUsd: pipelineRuns.costUsd })
      .from(pipelineRuns)
      .where(inArray(pipelineRuns.status, ["ok", "error"]))
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(6),
    db.select({ n: sql<number>`count(*)::int` }).from(themes).where(eq(themes.active, true)),
  ]);
  const runs = rows.flatMap((r) => {
    const s = (r.stats ?? {}) as { themes?: number; published?: number; usage?: { webSearches?: number } };
    return s.themes ? [{ themes: s.themes, published: s.published ?? 0, tokenUsd: Number(r.costUsd ?? 0), webSearches: s.usage?.webSearches ?? 0 }] : [];
  });
  return basisFromRuns(runs, active[0].n);
}
