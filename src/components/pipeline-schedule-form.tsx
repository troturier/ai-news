"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePipelineSettings } from "@/app/[lang]/admin/actions";
import {
  FREQUENCIES, WEB_SEARCH_USD, costPerRunUsd, monthlyCostUsd, runsPerMonth, type CostBasis,
} from "@/lib/pipeline-schedule";

type Settings = { intervalDays: number; hour: number; maxPerTheme: number; monthlyBudgetUsd: number };

const usd = (n: number) => `${n.toFixed(2).replace(".", ",")} $`;
const field = "rounded-md border border-black/20 bg-transparent px-2 py-1 dark:border-white/25";

export function PipelineScheduleForm({ initial, basis }: { initial: Settings; basis: CostBasis }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const set = <K extends keyof Settings>(k: K, value: Settings[K]) => {
    setV((s) => ({ ...s, [k]: value }));
    setStatus("idle");
  };
  const perRun = costPerRunUsd(basis, v.maxPerTheme);
  const monthly = monthlyCostUsd(basis, v.intervalDays, v.maxPerTheme);
  const ratio = v.monthlyBudgetUsd ? monthly / v.monthlyBudgetUsd : 0;
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const save = () =>
    start(async () => {
      try {
        await savePipelineSettings(v);
        setStatus("saved");
        router.refresh();
      } catch {
        setStatus("error");
      }
    });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(); }}
      className="space-y-4 rounded-lg border border-black/10 p-4 dark:border-white/15"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm sm:col-span-2">
          <span className="block text-xs opacity-70">Fréquence</span>
          <select className={`${field} w-full`} value={v.intervalDays} onChange={(e) => set("intervalDays", Number(e.target.value))}>
            {FREQUENCIES.map((f) => <option key={f.days} value={f.days}>{f.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs opacity-70">Heure de départ (Paris)</span>
          <select className={`${field} w-full`} value={v.hour} disabled={v.intervalDays === 0} onChange={(e) => set("hour", Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")} h</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs opacity-70">Articles max. par thème</span>
          <input type="number" min={1} max={5} className={`${field} w-full`} value={v.maxPerTheme}
            onChange={(e) => set("maxPerTheme", Math.min(5, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
        <label className="text-sm">
          <span className="block text-xs opacity-70">Budget mensuel ($)</span>
          <input type="number" min={1} className={`${field} w-full`} value={v.monthlyBudgetUsd}
            onChange={(e) => set("monthlyBudgetUsd", Math.max(1, Math.round(Number(e.target.value) || 1)))} />
        </label>
      </div>

      <div className="space-y-1 rounded-md bg-black/5 p-3 text-sm dark:bg-white/10" aria-live="polite">
        {v.intervalDays === 0 ? (
          <p>Aucune recherche automatique : le coût dépend uniquement des lancements manuels (≈ {usd(perRun)} par recherche).</p>
        ) : (
          <>
            <p>
              <strong>≈ {usd(monthly)} / mois</strong> — {runsPerMonth(v.intervalDays).toFixed(1).replace(".", ",")} recherche(s) par mois
              × ≈ {usd(perRun)} ({basis.activeThemes} thèmes actifs).
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" role="img"
              aria-label={`${Math.round(ratio * 100)} % du budget mensuel`}>
              <div className={`h-full ${ratio > 1 ? "bg-red-600" : "bg-current"}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
            </div>
            <p className={`text-xs ${ratio > 1 ? "font-semibold text-red-600" : "opacity-70"}`}>
              {Math.round(ratio * 100)} % du budget de {v.monthlyBudgetUsd} $
              {ratio > 1 ? " — dépassement prévu" : ""}
            </p>
          </>
        )}
        <p className="text-xs opacity-70">
          {basis.source === "history"
            ? `Base : coût moyen par thème des ${basis.sampledRuns} dernières exécutions (tokens + recherches web à ${WEB_SEARCH_USD * 1000} $ les 1 000)`
            : "Base : valeurs par défaut (aucune exécution passée exploitable)"}
          , plus 0,01 $ par article rédigé, en supposant que chaque thème atteint le maximum d&apos;articles. Estimation :
          vérifiez les tarifs dans la console Anthropic.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || !dirty}
          className="rounded-md border border-black/20 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/25">
          Enregistrer
        </button>
        {status === "saved" && <span role="status" className="text-sm">Enregistré. La prochaine recherche est comptée à partir de maintenant.</span>}
        {status === "error" && <span role="alert" className="text-sm text-red-600">Échec de l&apos;enregistrement.</span>}
      </div>
    </form>
  );
}
