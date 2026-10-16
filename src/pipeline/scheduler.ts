import { schedulerTick } from "./launcher";

const TICK_MS = 60_000;
const g = globalThis as unknown as { pipelineScheduler?: NodeJS.Timeout };

/**
 * In-process scheduler (called once from `instrumentation.ts`). Off outside production so that a local
 * `next dev` never spends API credits; `PIPELINE_SCHEDULER=on|off` overrides.
 */
export function startScheduler() {
  const flag = process.env.PIPELINE_SCHEDULER;
  const enabled = flag ? flag === "on" : process.env.NODE_ENV === "production";
  if (!enabled || g.pipelineScheduler) return;

  let busy = false;
  g.pipelineScheduler = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await schedulerTick();
    } catch (e) {
      console.error("[pipeline] scheduler tick failed:", e);
    } finally {
      busy = false;
    }
  }, TICK_MS);
  console.log("[pipeline] scheduler started");
}
