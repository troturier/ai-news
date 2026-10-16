"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { IconLoader2, IconPlayerPlay } from "@tabler/icons-react";
import { startPipelineRun } from "@/app/[lang]/admin/actions";
import { fmtUsd } from "@/lib/pipeline-costs";
import { WEB_SEARCH_USD } from "@/lib/pipeline-schedule";

type Event = { at: string; level: "info" | "warn" | "error"; msg: string };
type Progress = {
  phase: string; themeIndex: number; themeTotal: number; theme: string | null;
  counters: { discovered: number; duplicates: number; rejected: number; published: number; errors: number };
  costUsd: number; webSearches: number; events: Event[];
};
type Snapshot = {
  run: {
    id: string; status: string; trigger: string; startedAt: string; finishedAt: string | null;
    progress: Progress | null; costUsd: string | null; error: string | null; heartbeatAt: string;
  } | null;
  nextScheduledAt: string | null;
  now: string;
};

// Must match STALE_MS in pipeline/launcher.ts.
const STALE_MS = 3 * 60_000;
const TRIGGERS: Record<string, string> = { manual: "manuel", scheduled: "planifié", cli: "ligne de commande" };

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(iso));
const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(iso));
const fmtDuration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
};

/** `settingsVersion` changes when the schedule is saved: the next scheduled date is fetched again at once. */
export function PipelineLive({ defaultMax, settingsVersion }: { defaultMax: number; settingsVersion: string }) {
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [offset, setOffset] = useState(0); // server clock - browser clock
  const [serverNow, setServerNow] = useState(0); // server clock, ticked every second during a run
  const [max, setMax] = useState(defaultMax);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const wasRunning = useRef(false);

  const run = snap?.run ?? null;
  const running = !!run && run.status === "running" && serverNow - new Date(run.heartbeatAt).getTime() < STALE_MS;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pipeline", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Snapshot;
      setOffset(new Date(data.now).getTime() - Date.now());
      setServerNow(new Date(data.now).getTime());
      setSnap(data);
    } catch {
      // network hiccup: the next poll will catch up
    }
  }, []);

  // Poll every 2 s during a run, every 15 s otherwise (also catches a scheduled run starting).
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const id = setInterval(() => void refresh(), running ? 2_000 : 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refresh, running, settingsVersion]);

  // Elapsed-time clock.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setServerNow(Date.now() + offset), 1_000);
    return () => clearInterval(id);
  }, [running, offset]);

  // Refresh the server-rendered history when a run ends.
  useEffect(() => {
    if (wasRunning.current && !running) router.refresh();
    wasRunning.current = running;
  }, [running, router]);

  const launch = () => {
    setMessage(null);
    start(async () => {
      try {
        const res = await startPipelineRun(max);
        setMessage(res.started ? null : "Une recherche est déjà en cours.");
        await refresh();
      } catch {
        setMessage("Échec du lancement.");
      }
    });
  };

  const p = run?.progress ?? null;
  const pct = p && p.themeTotal ? Math.round(((p.themeIndex - (p.phase === "Thème terminé" || p.phase === "Terminé" ? 0 : 1)) / p.themeTotal) * 100) : 0;
  const done = p?.phase === "Terminé" ? 100 : Math.min(100, Math.max(0, pct));

  return (
    <div className="space-y-4 rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs opacity-70">Articles max. par thème</span>
          <input
            type="number" min={1} max={5} value={max} disabled={running || pending}
            onChange={(e) => setMax(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
            className="w-24 rounded-md border border-black/20 bg-transparent px-2 py-1 dark:border-white/25"
          />
        </label>
        <button
          type="button" onClick={launch} disabled={running || pending}
          className="flex items-center gap-1.5 rounded-md border border-black/20 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/25"
        >
          {running ? <IconLoader2 size={16} aria-hidden className="animate-spin" /> : <IconPlayerPlay size={16} aria-hidden />}
          {running ? "Recherche en cours…" : "Lancer une recherche maintenant"}
        </button>
        {message && <span role="alert" className="text-sm text-red-600">{message}</span>}
        {!running && snap?.nextScheduledAt && (
          <span className="text-xs opacity-70">Prochaine recherche planifiée : {fmtDateTime(snap.nextScheduledAt)}</span>
        )}
        {!running && snap && !snap.nextScheduledAt && (
          <span className="text-xs opacity-70">Planification désactivée.</span>
        )}
      </div>

      {run && (running || run.finishedAt) && (
        <div aria-live="polite" className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <strong>
              {running ? "En cours" : run.status === "ok" ? "Terminée" : "Terminée avec erreur"}
              {" "}({TRIGGERS[run.trigger] ?? run.trigger})
            </strong>
            <span className="opacity-70">
              Début {fmtTime(run.startedAt)} ·{" "}
              {fmtDuration((running ? serverNow : new Date(run.finishedAt ?? run.heartbeatAt).getTime()) - new Date(run.startedAt).getTime())}
            </span>
            {p && (
              <span className="opacity-70">
                ≈ {fmtUsd(p.costUsd + p.webSearches * WEB_SEARCH_USD, 3)} (tokens {fmtUsd(p.costUsd, 3)} + {p.webSearches} recherche(s) web)
              </span>
            )}
          </div>

          {p && (
            <>
              <div>
                <div className="mb-1 flex justify-between text-xs opacity-80">
                  <span>{p.phase}{p.theme ? ` — ${p.theme}` : ""}</span>
                  <span>{p.themeTotal ? `thème ${Math.min(p.themeIndex, p.themeTotal)}/${p.themeTotal}` : ""}</span>
                </div>
                <div
                  role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={done}
                  className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
                >
                  <div className="h-full bg-current transition-all duration-500" style={{ width: `${done}%` }} />
                </div>
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <li>Découverts : <strong>{p.counters.discovered}</strong></li>
                <li>Doublons : <strong>{p.counters.duplicates}</strong></li>
                <li>Écartés : <strong>{p.counters.rejected}</strong></li>
                <li>Publiés : <strong>{p.counters.published}</strong></li>
                <li className={p.counters.errors ? "text-red-600" : ""}>Erreurs : <strong>{p.counters.errors}</strong></li>
              </ul>
              <ol className="max-h-56 space-y-0.5 overflow-y-auto rounded-md bg-black/5 p-2 font-mono text-xs dark:bg-white/10">
                {[...p.events].reverse().map((e, i) => (
                  <li key={`${e.at}-${i}`} className={e.level === "error" ? "text-red-600" : ""}>
                    <span className="opacity-60">{fmtTime(e.at)}</span> {e.msg}
                  </li>
                ))}
              </ol>
            </>
          )}
          {run.error && <p className="text-xs text-red-600">{run.error}</p>}
        </div>
      )}
    </div>
  );
}
