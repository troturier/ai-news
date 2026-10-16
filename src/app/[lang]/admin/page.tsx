import { count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, comments, pipelineRuns, reports, user } from "@/db/schema";
import { PipelineLive } from "@/components/pipeline-live";
import { PipelineScheduleForm } from "@/components/pipeline-schedule-form";
import { requireAdmin } from "@/lib/admin";
import { costBasis, getSettings } from "@/pipeline/launcher";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(d);

// Separate function: React's purity rule rejects Date.now() in a component's render.
const thirtyDaysAgo = () => new Date(Date.now() - 30 * 86_400_000);

type RunStats = {
  discovered?: number; published?: number; duplicates?: number; rejectedPopularity?: number;
  errors?: string[]; usage?: { webSearches?: number };
};

export default async function AdminHome() {
  await requireAdmin();
  const since = thirtyDaysAgo();
  const [[users], [pub], [hid], [com], [open], [cost], runs, settings, basis] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(articles).where(eq(articles.status, "published")),
    db.select({ n: count() }).from(articles).where(eq(articles.status, "hidden")),
    db.select({ n: count() }).from(comments).where(eq(comments.status, "visible")),
    db.select({ n: count() }).from(reports).where(isNull(reports.resolvedAt)),
    db.select({ total: sql<string>`coalesce(sum(${pipelineRuns.costUsd}), 0)`, searches: sql<string>`coalesce(sum((${pipelineRuns.stats}->'usage'->>'webSearches')::int), 0)` })
      .from(pipelineRuns).where(gte(pipelineRuns.startedAt, since)),
    db.select().from(pipelineRuns).orderBy(desc(pipelineRuns.startedAt)).limit(12),
    getSettings(),
    costBasis(),
  ]);
  const triggers: Record<string, string> = { manual: "manuel", scheduled: "planifié", cli: "CLI" };

  const cards: [string, string | number][] = [
    ["Utilisateurs", users.n], ["Articles publiés", pub.n], ["Articles masqués", hid.n],
    ["Commentaires visibles", com.n], ["Signalements ouverts", open.n],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([label, value]) => (
          <li key={label} className="rounded-lg border border-black/10 p-3 dark:border-white/15">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs opacity-70">{label}</p>
          </li>
        ))}
      </ul>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recherche d&apos;articles</h2>
        <PipelineLive defaultMax={settings.maxPerTheme} settingsVersion={settings.updatedAt.toISOString()} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Planification</h2>
        <PipelineScheduleForm
          initial={{
            intervalDays: settings.intervalDays, hour: settings.hour,
            maxPerTheme: settings.maxPerTheme, monthlyBudgetUsd: settings.monthlyBudgetUsd,
          }}
          basis={basis}
        />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Historique des exécutions</h2>
        <p className="mb-3 text-sm opacity-70">
          30 derniers jours : {Number(cost.total).toFixed(2)} $ de tokens, {cost.searches} recherches web.
          Les recherches web sont facturées à part et ne sont pas incluses dans ce coût (voir la console Anthropic).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase opacity-70 dark:border-white/15">
              <tr><th className="py-2 pr-3">Début</th><th className="pr-3">Statut</th><th className="pr-3">Origine</th><th className="pr-3">Découverts</th><th className="pr-3">Publiés</th><th className="pr-3">Écartés</th><th className="pr-3">Erreurs</th><th>Coût tokens</th></tr>
            </thead>
            <tbody>
              {runs.length === 0 && <tr><td colSpan={8} className="py-3 opacity-70">Aucune exécution.</td></tr>}
              {runs.map((r) => {
                const s = (r.stats ?? {}) as RunStats;
                return (
                  <tr key={r.id} className="border-b border-black/5 dark:border-white/10">
                    <td className="py-2 pr-3">{fmtDate(r.startedAt)}</td>
                    <td className="pr-3">{r.status}</td>
                    <td className="pr-3">{triggers[r.trigger] ?? r.trigger}</td>
                    <td className="pr-3">{s.discovered ?? "–"}</td>
                    <td className="pr-3">{s.published ?? "–"}</td>
                    <td className="pr-3">{(s.duplicates ?? 0) + (s.rejectedPopularity ?? 0)}</td>
                    <td className="pr-3" title={s.errors?.join("\n")}>{s.errors?.length ?? 0}</td>
                    <td>{r.costUsd ? `${Number(r.costUsd).toFixed(3)} $` : "–"}</td>
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
