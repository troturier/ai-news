import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineRuns } from "@/db/schema";
import { getSession } from "@/lib/session";
import { nextScheduledAt } from "@/pipeline/launcher";

export const dynamic = "force-dynamic";

/** Live state of the latest pipeline run (polled by the admin page). Admins only. */
export async function GET() {
  const session = await getSession();
  if (session?.user.role !== "admin") return new NextResponse(null, { status: 404 });

  const [run] = await db
    .select({
      id: pipelineRuns.id, status: pipelineRuns.status, trigger: pipelineRuns.trigger,
      startedAt: pipelineRuns.startedAt, finishedAt: pipelineRuns.finishedAt,
      progress: pipelineRuns.progress, costUsd: pipelineRuns.costUsd, error: pipelineRuns.error,
      heartbeatAt: pipelineRuns.heartbeatAt,
    })
    .from(pipelineRuns)
    .orderBy(desc(pipelineRuns.startedAt))
    .limit(1);
  const next = await nextScheduledAt();
  return NextResponse.json(
    { run: run ?? null, nextScheduledAt: next?.toISOString() ?? null, now: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
