import { eq } from "drizzle-orm";
import { db } from "../db";
import { pipelineRuns } from "../db/schema";

export type ProgressEvent = { at: string; level: "info" | "warn" | "error"; msg: string };

export type Progress = {
  /** Short label of what is going on right now. */
  phase: string;
  themeIndex: number;
  themeTotal: number;
  theme: string | null;
  counters: { discovered: number; duplicates: number; rejected: number; published: number; errors: number };
  costUsd: number;
  webSearches: number;
  events: ProgressEvent[];
};

const MAX_EVENTS = 80;

/** Writes the live progress of a run to `pipeline_runs.progress` (read by the admin page). */
export class ProgressReporter {
  private state: Progress = {
    phase: "Démarrage",
    themeIndex: 0,
    themeTotal: 0,
    theme: null,
    counters: { discovered: 0, duplicates: 0, rejected: 0, published: 0, errors: 0 },
    costUsd: 0,
    webSearches: 0,
    events: [],
  };
  // Writes are chained so that the last state always wins, whatever the call order.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private runId: string) {}

  update(patch: Partial<Omit<Progress, "counters" | "events">> & { counters?: Partial<Progress["counters"]> }) {
    const { counters, ...rest } = patch;
    Object.assign(this.state, rest);
    if (counters) Object.assign(this.state.counters, counters);
    return this.flush();
  }

  log(msg: string, level: ProgressEvent["level"] = "info") {
    this.state.events.push({ at: new Date().toISOString(), level, msg });
    if (this.state.events.length > MAX_EVENTS) this.state.events.splice(0, this.state.events.length - MAX_EVENTS);
    return this.flush();
  }

  private flush() {
    const snapshot = structuredClone(this.state);
    this.queue = this.queue
      .then(() =>
        db
          .update(pipelineRuns)
          .set({ progress: snapshot, heartbeatAt: new Date() })
          .where(eq(pipelineRuns.id, this.runId)),
      )
      .catch(() => {}); // progress is informative: never fail a run because of it
    return this.queue;
  }

  /** Waits for pending writes (before the final status update). */
  settled() {
    return this.queue;
  }
}
