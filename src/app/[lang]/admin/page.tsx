import Link from "next/link";
import type { ReactNode } from "react";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  IconAlertTriangle, IconArticle, IconCategory, IconChevronRight, IconEyeOff, IconFlag, IconHistory, IconMessages, IconPencil,
  IconPlayerPlay, IconReceipt, IconReportMoney, IconSearch, IconTags, IconUsers, IconWallet, IconWorldSearch,
  type Icon,
} from "@tabler/icons-react";
import { db } from "@/db";
import { articles, comments, pipelineRuns, reports, themes, user } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import {
  KINDS, RUN_STATUSES, RUN_TRIGGERS, emptyLine, fmtTokens, fmtUsd, lineTotal, runCost, summarize,
  type CostLine, type Kind, type RunStats,
} from "@/lib/pipeline-costs";
import { startOfParisMonth } from "@/lib/pipeline-schedule";
import { getSettings } from "@/pipeline/launcher";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(d);

const PERIODS = [
  { key: "mois", label: "Ce mois-ci" },
  { key: "30j", label: "30 jours" },
  { key: "90j", label: "90 jours" },
  { key: "tout", label: "Depuis le début" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const KIND_LABELS: Record<Kind, { label: string; icon: Icon; model: string }> = {
  discovery: { label: "Découverte", icon: IconSearch, model: "recherche web des sujets" },
  write: { label: "Rédaction", icon: IconPencil, model: "lecture des sources et rédaction FR/EN" },
};

// Separate function: React's purity rule rejects Date.now() in a component's render.
function periodStart(key: PeriodKey): Date | null {
  const now = new Date();
  if (key === "mois") return startOfParisMonth(now);
  if (key === "30j") return new Date(now.getTime() - 30 * 86_400_000);
  if (key === "90j") return new Date(now.getTime() - 90 * 86_400_000);
  return null;
}

const card = "rounded-lg border border-black/10 p-3 dark:border-white/15";
const th = "py-2 pr-3 font-medium";

/** Single-hue magnitude bar (the value is always written next to it). */
function Bar({ ratio }: { ratio: number }) {
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" aria-hidden>
      <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }} />
    </div>
  );
}

function SectionTitle({ icon: I, children }: { icon: Icon; children: ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 font-semibold">
      <I size={18} aria-hidden /> {children}
    </h3>
  );
}

function Tile({ icon: I, label, value, sub, children }: { icon: Icon; label: string; value: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <li className={`${card} space-y-1`}>
      <p className="flex items-center gap-1.5 text-xs opacity-70"><I size={16} aria-hidden /> {label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
      {children}
    </li>
  );
}

const sumLines = (...lines: CostLine[]) =>
  lines.reduce((acc, l) => {
    for (const k of Object.keys(acc) as (keyof CostLine)[]) acc[k] += l[k];
    return acc;
  }, emptyLine());

export default async function AdminHome({ params, searchParams }: PageProps<"/[lang]/admin">) {
  await requireAdmin();
  const { lang } = await params;
  const raw = (await searchParams).periode;
  const period: PeriodKey = PERIODS.some((p) => p.key === raw) ? (raw as PeriodKey) : "mois";
  const since = periodStart(period);
  const monthStart = periodStart("mois")!;

  const [[users], [pub], [hid], [com], [open], runs, monthRuns, themeRows, settings] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(articles).where(eq(articles.status, "published")),
    db.select({ n: count() }).from(articles).where(eq(articles.status, "hidden")),
    db.select({ n: count() }).from(comments).where(eq(comments.status, "visible")),
    db.select({ n: count() }).from(reports).where(isNull(reports.resolvedAt)),
    db.select().from(pipelineRuns).where(since ? gte(pipelineRuns.startedAt, since) : undefined).orderBy(desc(pipelineRuns.startedAt)),
    db.select({ costUsd: pipelineRuns.costUsd, stats: pipelineRuns.stats }).from(pipelineRuns).where(gte(pipelineRuns.startedAt, monthStart)),
    db.select({ slug: themes.slug, names: themes.names }).from(themes),
    getSettings(),
  ]);

  // Articles published by each run, per theme (the run stats only keep the run total).
  const runIds = runs.map((r) => r.id);
  const publishedRows = runIds.length
    ? await db
        .select({ runId: articles.runId, slug: themes.slug, n: count() })
        .from(articles)
        .innerJoin(themes, eq(themes.id, articles.themeId))
        .where(and(isNotNull(articles.runId), inArray(articles.runId, runIds)))
        .groupBy(articles.runId, themes.slug)
    : [];
  const publishedByRun = new Map<string, Record<string, number>>();
  for (const p of publishedRows) {
    const m = publishedByRun.get(p.runId!) ?? {};
    m[p.slug] = p.n;
    publishedByRun.set(p.runId!, m);
  }
  const themeName = (slug: string) => themeRows.find((t) => t.slug === slug)?.names.fr ?? (slug || "Sans thème");

  const costs = runs.map((r) => ({ run: r, stats: (r.stats ?? {}) as RunStats, cost: runCost(r.costUsd, r.stats as RunStats | null) }));
  // Per-theme costs only exist for detailed runs: count their articles only, so the cost per article stays consistent.
  const detailedIds = new Set(costs.filter((c) => c.cost.detailed).map((c) => c.run.id));
  const publishedByTheme: Record<string, number> = {};
  for (const p of publishedRows) {
    if (detailedIds.has(p.runId!)) publishedByTheme[p.slug] = (publishedByTheme[p.slug] ?? 0) + p.n;
  }
  const sum = summarize(costs.map((c) => c.cost));
  const total = lineTotal(sum.total);
  const published = costs.reduce((n, c) => n + (c.stats.published ?? 0), 0);
  const failed = runs.filter((r) => r.status === "error").length;
  const monthTotal = lineTotal(summarize(monthRuns.map((r) => runCost(r.costUsd, r.stats as RunStats | null))).total);
  const budgetRatio = settings.monthlyBudgetUsd ? monthTotal / settings.monthlyBudgetUsd : 0;

  const kindRows = KINDS.map((k) => ({ key: k, ...KIND_LABELS[k], line: sum.byKind[k] }));
  const themeCosts = Object.entries(sum.byTheme)
    .map(([slug, kinds]) => ({ slug, kinds, total: lineTotal(sumLines(kinds.discovery, kinds.write)) }))
    .sort((a, b) => b.total - a.total);
  const maxThemeTotal = Math.max(0, ...themeCosts.map((t) => t.total));

  const cards: [string, number, Icon][] = [
    ["Utilisateurs", users.n, IconUsers], ["Articles publiés", pub.n, IconArticle], ["Articles masqués", hid.n, IconEyeOff],
    ["Commentaires visibles", com.n, IconMessages], ["Signalements ouverts", open.n, IconFlag],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([label, value, I]) => (
          <li key={label} className={card}>
            <p className="flex items-center gap-2 text-2xl font-semibold"><I size={22} aria-hidden className="opacity-60" /> {value}</p>
            <p className="text-xs opacity-70">{label}</p>
          </li>
        ))}
      </ul>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><IconReportMoney size={20} aria-hidden /> Dépenses</h2>
          <nav aria-label="Période" className="flex flex-wrap gap-1 text-sm">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                href={`/${lang}/admin${p.key === "mois" ? "" : `?periode=${p.key}`}`}
                aria-current={p.key === period ? "page" : undefined}
                className={`rounded-md px-2.5 py-1 ${p.key === period ? "bg-black/10 font-medium dark:bg-white/15" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Tile icon={IconReceipt} label="Total sur la période" value={fmtUsd(total)}
            sub={<>tokens {fmtUsd(sum.total.tokenUsd)} + recherches {fmtUsd(sum.total.searchUsd)}</>} />
          <Tile icon={IconWallet} label="Ce mois-ci" value={fmtUsd(monthTotal)}
            sub={<span className={budgetRatio > 1 ? "font-semibold text-red-600" : ""}>
              {Math.round(budgetRatio * 100)} % du budget de {settings.monthlyBudgetUsd} ${budgetRatio > 1 ? " — dépassé" : ""}
            </span>}>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" role="img"
              aria-label={`${Math.round(budgetRatio * 100)} % du budget mensuel`}>
              <div className={`h-full rounded-full ${budgetRatio > 1 ? "bg-red-600" : "bg-current opacity-70"}`}
                style={{ width: `${Math.min(100, budgetRatio * 100)}%` }} />
            </div>
          </Tile>
          <Tile icon={IconArticle} label="Par article publié" value={published ? fmtUsd(total / published) : "–"}
            sub={<>{published} article(s) publié(s)</>} />
          <Tile icon={IconPlayerPlay} label="Exécutions" value={String(runs.length)}
            sub={failed ? <span className="text-red-600">{failed} en erreur</span> : "aucune en erreur"} />
          <Tile icon={IconWorldSearch} label="Recherches web" value={String(sum.total.webSearches)}
            sub={<>{fmtUsd(sum.total.searchUsd)} · {sum.total.webFetches} lecture(s) de page</>} />
        </ul>

        {runs.length === 0 ? (
          <p className="text-sm opacity-70">Aucune exécution sur cette période.</p>
        ) : (
          <>
            <div>
              <SectionTitle icon={IconCategory}>Par étape</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="border-b border-black/10 text-xs uppercase opacity-70 dark:border-white/15">
                    <tr>
                      <th className={th}>Étape</th><th className={th}>Appels</th><th className={th}>Tokens entrée</th>
                      <th className={th}>Tokens sortie</th><th className={th}>Recherches</th><th className={th}>Lectures</th>
                      <th className={th}>Tokens</th><th className={th}>Recherches</th><th className={th}>Total</th><th className={th}>Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kindRows.map(({ key, label, icon: I, model, line }) => (
                      <tr key={key} className="border-b border-black/5 dark:border-white/10">
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-1.5 font-medium"><I size={16} aria-hidden /> {label}</span>
                          <span className="block whitespace-normal text-xs opacity-60">{model}</span>
                        </td>
                        <td className="pr-3">{line.calls}</td>
                        <td className="pr-3">{fmtTokens(line.inputTokens)}</td>
                        <td className="pr-3">{fmtTokens(line.outputTokens)}</td>
                        <td className="pr-3">{line.webSearches}</td>
                        <td className="pr-3">{line.webFetches}</td>
                        <td className="pr-3">{fmtUsd(line.tokenUsd, 3)}</td>
                        <td className="pr-3">{fmtUsd(line.searchUsd, 3)}</td>
                        <td className="pr-3 font-medium">{fmtUsd(lineTotal(line), 3)}</td>
                        <td className="pr-3">
                          <span className="flex items-center gap-2">
                            <Bar ratio={total ? lineTotal(line) / total : 0} />
                            {total ? Math.round((lineTotal(line) / total) * 100) : 0} %
                          </span>
                        </td>
                      </tr>
                    ))}
                    {sum.undetailedRuns > 0 && (
                      <tr className="border-b border-black/5 opacity-70 dark:border-white/10">
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-1.5"><IconAlertTriangle size={16} aria-hidden /> Non détaillé</span>
                          <span className="block whitespace-normal text-xs">{sum.undetailedRuns} exécution(s) antérieure(s) au suivi par étape</span>
                        </td>
                        <td className="pr-3">{sum.undetailed.calls}</td>
                        <td className="pr-3">{fmtTokens(sum.undetailed.inputTokens)}</td>
                        <td className="pr-3">{fmtTokens(sum.undetailed.outputTokens)}</td>
                        <td className="pr-3">{sum.undetailed.webSearches}</td>
                        <td className="pr-3">{sum.undetailed.webFetches}</td>
                        <td className="pr-3">{fmtUsd(sum.undetailed.tokenUsd, 3)}</td>
                        <td className="pr-3">{fmtUsd(sum.undetailed.searchUsd, 3)}</td>
                        <td className="pr-3 font-medium">{fmtUsd(lineTotal(sum.undetailed), 3)}</td>
                        <td className="pr-3">
                          <span className="flex items-center gap-2">
                            <Bar ratio={total ? lineTotal(sum.undetailed) / total : 0} />
                            {total ? Math.round((lineTotal(sum.undetailed) / total) * 100) : 0} %
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <SectionTitle icon={IconTags}>Par thème</SectionTitle>
              {themeCosts.length === 0 ? (
                <p className="text-sm opacity-70">Pas de détail par thème pour ces exécutions (antérieures au suivi par étape).</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap text-left text-sm">
                    <thead className="border-b border-black/10 text-xs uppercase opacity-70 dark:border-white/15">
                      <tr>
                        <th className={th}>Thème</th><th className={th}>Découverte</th><th className={th}>Rédaction</th>
                        <th className={th}>Recherches</th><th className={th}>Publiés</th><th className={th}>Coût / article</th><th className={th}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {themeCosts.map(({ slug, kinds, total: t }) => {
                        const n = publishedByTheme[slug] ?? 0;
                        return (
                          <tr key={slug} className="border-b border-black/5 dark:border-white/10">
                            <td className="py-2 pr-3 font-medium">{themeName(slug)}</td>
                            <td className="pr-3">{fmtUsd(lineTotal(kinds.discovery), 3)}</td>
                            <td className="pr-3">{fmtUsd(lineTotal(kinds.write), 3)}</td>
                            <td className="pr-3">{kinds.discovery.webSearches + kinds.write.webSearches}</td>
                            <td className="pr-3">{n}</td>
                            <td className="pr-3">{n ? fmtUsd(t / n, 3) : "–"}</td>
                            <td className="pr-3">
                              <span className="flex items-center gap-2 font-medium">
                                <Bar ratio={maxThemeTotal ? t / maxThemeTotal : 0} /> {fmtUsd(t, 3)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <SectionTitle icon={IconHistory}>Par exécution</SectionTitle>
              <ul className="divide-y divide-black/5 border-y border-black/10 text-sm dark:divide-white/10 dark:border-white/15">
                {costs.map(({ run: r, stats: s, cost }) => {
                  const perTheme = publishedByRun.get(r.id) ?? {};
                  const slugs = [...new Set([...Object.keys(cost.byTheme), ...Object.keys(perTheme)])].sort((a, b) =>
                    themeName(a).localeCompare(themeName(b), "fr"),
                  );
                  return (
                    <li key={r.id}>
                      <details className="group">
                        <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 py-2 marker:content-none hover:bg-black/5 dark:hover:bg-white/5">
                          <IconChevronRight size={16} aria-hidden className="transition-transform group-open:rotate-90" />
                          <span className="w-32">{fmtDate(r.startedAt)}</span>
                          <span className="w-20 opacity-70">{RUN_TRIGGERS[r.trigger] ?? r.trigger}</span>
                          <span className={`w-20 ${r.status === "error" ? "text-red-600" : "opacity-70"}`}>{RUN_STATUSES[r.status] ?? r.status}</span>
                          <span className="w-24">{s.published ?? 0} publié(s)</span>
                          {cost.detailed && (
                            <span className="opacity-70">
                              découverte {fmtUsd(lineTotal(cost.byKind.discovery), 3)} · rédaction {fmtUsd(lineTotal(cost.byKind.write), 3)}
                            </span>
                          )}
                          <span className="ml-auto pr-2 font-medium">{fmtUsd(lineTotal(cost.total), 3)}</span>
                        </summary>
                        <div className="space-y-2 pb-4 pl-8">
                          <p className="text-xs opacity-70">
                            {cost.total.calls} appel(s) · {fmtTokens(cost.total.inputTokens)} tokens en entrée · {fmtTokens(cost.total.outputTokens)} en sortie ·{" "}
                            {cost.total.webSearches} recherche(s) web · {cost.total.webFetches} lecture(s) de page · tokens {fmtUsd(cost.total.tokenUsd, 3)} + recherches{" "}
                            {fmtUsd(cost.total.searchUsd, 3)}
                          </p>
                          {!cost.detailed ? (
                            <p className="text-xs opacity-70">Détail par étape et par thème non disponible (exécution antérieure au suivi par étape).</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full whitespace-nowrap text-left text-xs">
                                <thead className="border-b border-black/10 uppercase opacity-70 dark:border-white/15">
                                  <tr>
                                    <th className={th}>Thème</th><th className={th}>Découverte</th><th className={th}>Recherches</th>
                                    <th className={th}>Rédaction</th><th className={th}>Appels</th><th className={th}>Tokens entrée</th>
                                    <th className={th}>Publiés</th><th className={th}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {slugs.map((slug) => {
                                    const k = cost.byTheme[slug] ?? { discovery: emptyLine(), write: emptyLine() };
                                    const all = sumLines(k.discovery, k.write);
                                    return (
                                      <tr key={slug} className="border-b border-black/5 dark:border-white/10">
                                        <td className="py-1.5 pr-3">{themeName(slug)}</td>
                                        <td className="pr-3">{fmtUsd(lineTotal(k.discovery), 3)}</td>
                                        <td className="pr-3">{k.discovery.webSearches}</td>
                                        <td className="pr-3" title={`${k.write.calls} appel(s), ${k.write.webFetches} lecture(s) de page`}>
                                          {k.write.calls ? fmtUsd(lineTotal(k.write), 3) : "–"}
                                        </td>
                                        <td className="pr-3">{all.calls}</td>
                                        <td className="pr-3">{fmtTokens(all.inputTokens)}</td>
                                        <td className="pr-3">{perTheme[slug] ?? 0}</td>
                                        <td className="pr-3 font-medium">{fmtUsd(lineTotal(all), 3)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {!!s.errors?.length && (
                            <ul className="space-y-0.5 text-xs text-red-600">
                              {s.errors.map((e, i) => <li key={i} className="flex gap-1"><IconAlertTriangle size={14} aria-hidden className="mt-px shrink-0" /> {e}</li>)}
                            </ul>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
        <p className="text-xs opacity-60">
          Coûts estimés à partir des tarifs publics relevés le 16/10/2026 (tokens selon le modèle et la longueur du prompt,
          recherche web à 10 $ les 1 000) ; la console Anthropic fait foi.
        </p>
      </section>
    </div>
  );
}
