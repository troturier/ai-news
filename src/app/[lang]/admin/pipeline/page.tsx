import { desc } from "drizzle-orm";
import { IconCalendarTime, IconHistory, IconPlayerPlay } from "@tabler/icons-react";
import { db } from "@/db";
import { pipelineRuns } from "@/db/schema";
import { PipelineLive } from "@/components/pipeline-live";
import { PipelineScheduleForm } from "@/components/pipeline-schedule-form";
import { requireAdmin } from "@/lib/admin";
import { RUN_STATUSES, RUN_TRIGGERS, fmtUsd, lineTotal, runCost, type RunStats } from "@/lib/pipeline-costs";
import { costBasis, getSettings } from "@/pipeline/launcher";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(d);
const fmtDuration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
};

export default async function AdminPipeline() {
  await requireAdmin();
  const [runs, settings, basis] = await Promise.all([
    db.select().from(pipelineRuns).orderBy(desc(pipelineRuns.startedAt)).limit(20),
    getSettings(),
    costBasis(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Recherche d&apos;articles</h1>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <IconPlayerPlay size={20} aria-hidden /> Lancement
        </h2>
        <PipelineLive defaultMax={settings.maxPerTheme} settingsVersion={settings.updatedAt.toISOString()} />
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <IconCalendarTime size={20} aria-hidden /> Planification
        </h2>
        <PipelineScheduleForm
          initial={{
            intervalDays: settings.intervalDays, hour: settings.hour,
            maxPerTheme: settings.maxPerTheme, monthlyBudgetUsd: settings.monthlyBudgetUsd,
          }}
          basis={basis}
        />
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <IconHistory size={20} aria-hidden /> Historique des exécutions
        </h2>
        <p className="mb-3 text-sm opacity-70">
          Les 20 dernières exécutions. Le détail des dépenses est sur le tableau de bord.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase opacity-70 dark:border-white/15">
              <tr>
                <th className="py-2 pr-3">Début</th><th className="pr-3">Statut</th><th className="pr-3">Origine</th>
                <th className="pr-3">Durée</th><th className="pr-3">Découverts</th><th className="pr-3">Doublons</th>
                <th className="pr-3">Écartés</th><th className="pr-3">Publiés</th><th className="pr-3">Erreurs</th><th>Coût total</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && <tr><td colSpan={10} className="py-3 opacity-70">Aucune exécution.</td></tr>}
              {runs.map((r) => {
                const s = (r.stats ?? {}) as RunStats;
                const cost = runCost(r.costUsd, s);
                return (
                  <tr key={r.id} className="border-b border-black/5 dark:border-white/10">
                    <td className="py-2 pr-3">{fmtDate(r.startedAt)}</td>
                    <td className={`pr-3 ${r.status === "error" ? "text-red-600" : ""}`} title={r.error ?? undefined}>
                      {RUN_STATUSES[r.status] ?? r.status}
                    </td>
                    <td className="pr-3">{RUN_TRIGGERS[r.trigger] ?? r.trigger}</td>
                    <td className="pr-3">{r.finishedAt ? fmtDuration(r.finishedAt.getTime() - r.startedAt.getTime()) : "–"}</td>
                    <td className="pr-3">{s.discovered ?? "–"}</td>
                    <td className="pr-3">{s.duplicates ?? "–"}</td>
                    <td className="pr-3" title="Popularité insuffisante + écartés par le rédacteur">
                      {s.rejectedPopularity === undefined ? "–" : s.rejectedPopularity + (s.skippedByWriter ?? 0)}
                    </td>
                    <td className="pr-3">{s.published ?? "–"}</td>
                    <td className="pr-3" title={s.errors?.join("\n")}>{s.errors?.length ?? 0}</td>
                    <td title={`Tokens ${fmtUsd(cost.total.tokenUsd, 3)} + recherches web ${fmtUsd(cost.total.searchUsd, 3)} (${cost.total.webSearches})`}>
                      {r.costUsd ? fmtUsd(lineTotal(cost.total), 3) : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
