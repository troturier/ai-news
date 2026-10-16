import { randomBytes } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../db";
import {
  articleTranslations,
  articles,
  pipelineRuns,
  themes,
} from "../db/schema";
import { ProgressReporter } from "./progress";
import { discover } from "./discover";
import { MODELS, UsageTracker } from "./llm";
import { findImage } from "./image";
import { assessPopularity, type Candidate } from "./popularity";
import { canonicalUrl, hostOf, slugify, titleSimilarity } from "./url";
import { writeArticle } from "./write";

export type RunOptions = {
  themeSlugs?: string[];
  maxPerTheme: number;
  dryRun: boolean;
  /** Row already created by the launcher (admin button or scheduler); otherwise one is inserted here. */
  runId?: string;
  trigger?: "manual" | "scheduled" | "cli";
};

const SIMILAR_TITLE = 0.6;
const RECENT_DAYS = 14;

type Log = Record<string, unknown>;

/** Model-provided URLs: only valid http(s) addresses are kept (never `javascript:` or `data:`), canonicalised. */
function safeCorroborating(urls: string[]) {
  return urls.flatMap((u) => {
    try {
      const url = canonicalUrl(u);
      return [{ url, title: url, publisher: hostOf(url) ?? url }];
    } catch {
      return [];
    }
  });
}

export async function runPipeline(opts: RunOptions) {
  const tracker = new UsageTracker();
  const stats = {
    themes: 0,
    discovered: 0,
    duplicates: 0,
    rejectedPopularity: 0,
    skippedByWriter: 0,
    published: 0,
    errors: [] as string[],
    details: [] as Log[],
  };

  const [run] = opts.dryRun
    ? [{ id: null as string | null }]
    : opts.runId
      ? [{ id: opts.runId as string | null }]
      : await db
          .insert(pipelineRuns)
          .values({ trigger: opts.trigger ?? "cli" })
          .returning({ id: pipelineRuns.id });
  const progress = run.id ? new ProgressReporter(run.id) : null;
  // Long model calls write no progress: a timer keeps the heartbeat alive (a dead process stops it).
  const heartbeat = run.id
    ? setInterval(() => {
        db.update(pipelineRuns).set({ heartbeatAt: new Date() }).where(eq(pipelineRuns.id, run.id!)).catch(() => {});
      }, 30_000)
    : null;
  const counters = () => ({
    discovered: stats.discovered,
    duplicates: stats.duplicates,
    rejected: stats.rejectedPopularity + stats.skippedByWriter,
    published: stats.published,
    errors: stats.errors.length,
  });
  const report = (phase: string, extra: { theme?: string | null; themeIndex?: number; themeTotal?: number } = {}) =>
    progress?.update({ phase, ...extra, counters: counters(), costUsd: Number(tracker.tokenCostUsd.toFixed(4)), webSearches: tracker.webSearches });

  try {
    const allThemes = await db.select().from(themes).where(eq(themes.active, true));
    const selected = opts.themeSlugs?.length
      ? allThemes.filter((t) => opts.themeSlugs!.includes(t.slug))
      : allThemes;

    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);
    const recent = await db
      .select({ themeId: articles.themeId, canonicalUrl: articles.canonicalUrl, title: articleTranslations.title })
      .from(articles)
      .innerJoin(articleTranslations, eq(articleTranslations.articleId, articles.id))
      .where(and(gte(articles.publishedAt, since), eq(articleTranslations.locale, "en")))
      .orderBy(desc(articles.publishedAt));

    await progress?.log(`${selected.length} thème(s) à traiter`);
    for (const [i, theme] of selected.entries()) {
      stats.themes++;
      const themeProgress = { theme: theme.names.fr, themeIndex: i + 1, themeTotal: selected.length };
      await report("Recherche d'articles (web)", themeProgress);
      let candidates: Candidate[] = [];
      try {
        candidates = await discover({
          themeName: theme.names.en,
          themeDescription: theme.descriptions.en,
          today: new Date().toISOString().slice(0, 10),
          // All themes combined: the same topic can be a candidate in two themes.
          alreadyPublished: recent.slice(0, 40).map((r) => r.title),
          max: opts.maxPerTheme + 2, // margin: some will be discarded
          tracker,
        });
      } catch (e) {
        stats.errors.push(`${theme.slug} (discovery): ${(e as Error).message}`);
        await progress?.log(`${theme.names.fr} : échec de la recherche (${(e as Error).message})`, "error");
        await report("Recherche échouée", themeProgress);
        continue;
      }
      stats.discovered += candidates.length;
      await progress?.log(`${theme.names.fr} : ${candidates.length} candidat(s) trouvé(s)`);
      await report("Déduplication et filtre de popularité", themeProgress);

      // Deduplication then popularity, before any writing (saves tokens).
      const accepted: { c: Candidate; url: string; score: number; signals: Log }[] = [];
      for (const c of candidates) {
        let url: string;
        try {
          url = canonicalUrl(c.url);
        } catch {
          stats.errors.push(`${theme.slug} : invalid URL ${c.url}`);
          continue;
        }
        const dup =
          recent.some((r) => r.canonicalUrl === url) ||
          recent.some((r) => titleSimilarity(r.title, c.title) >= SIMILAR_TITLE) ||
          accepted.some((a) => titleSimilarity(a.c.title, c.title) >= SIMILAR_TITLE);
        if (dup || (await db.select({ id: articles.id }).from(articles).where(eq(articles.canonicalUrl, url)).limit(1)).length) {
          stats.duplicates++;
          stats.details.push({ theme: theme.slug, title: c.title, outcome: "duplicate" });
          await progress?.log(`Doublon écarté : ${c.title}`);
          continue;
        }
        const verdict = await assessPopularity(c);
        stats.details.push({
          theme: theme.slug,
          title: c.title,
          url,
          outcome: verdict.accepted ? "accepted" : "rejected (popularity)",
          score: verdict.score,
          reasons: verdict.reasons,
        });
        if (!verdict.accepted) {
          stats.rejectedPopularity++;
          await progress?.log(`Écarté (popularité ${verdict.score}) : ${c.title}`);
          continue;
        }
        await progress?.log(`Retenu (popularité ${verdict.score}) : ${c.title}`);
        accepted.push({ c, url, score: verdict.score, signals: verdict.signals });
      }

      accepted.sort((a, b) => b.score - a.score);
      if (opts.dryRun) continue;

      for (const { c, url, score, signals } of accepted.slice(0, opts.maxPerTheme)) {
        try {
          await report(`Rédaction : ${c.title}`, themeProgress);
          const art = await writeArticle({ candidate: c, themeName: theme.names.en, tracker });
          if (art.verdict === "skip") {
            stats.skippedByWriter++;
            stats.details.push({ theme: theme.slug, title: c.title, outcome: "skipped by the writer", reason: art.skipReason });
            await progress?.log(`Écarté par le rédacteur : ${c.title}`);
            continue;
          }
          const image = await findImage({ url: c.url, githubRepo: c.githubRepo }).catch(() => null);
          const slug = `${slugify(art.en.title)}-${randomBytes(3).toString("hex")}`;
          const inserted = await db.transaction(async (tx) => {
            const [row] = await tx
              .insert(articles)
              .values({
                slug,
                themeId: theme.id,
                canonicalUrl: url,
                sources: [
                  { url, title: c.title, publisher: c.publisher },
                  ...safeCorroborating(c.corroboratingUrls),
                ],
                tags: art.tags,
                imageUrl: image?.url ?? null,
                imageSource: image?.source ?? null,
                popularityScore: score,
                popularitySignals: signals,
                model: MODELS.write,
                runId: run.id,
              })
              .onConflictDoNothing({ target: articles.canonicalUrl })
              .returning({ id: articles.id });
            if (!row) return false;
            await tx.insert(articleTranslations).values([
              { articleId: row.id, locale: "en", ...art.en },
              { articleId: row.id, locale: "fr", ...art.fr },
            ]);
            return true;
          });
          if (inserted) {
            stats.published++;
            recent.unshift({ themeId: theme.id, canonicalUrl: url, title: art.en.title }); // most recent first
            await progress?.log(`Publié : ${art.fr.title}`);
          }
        } catch (e) {
          stats.errors.push(`${theme.slug} (writing "${c.title}"): ${(e as Error).message}`);
          await progress?.log(`Échec de rédaction : ${c.title} (${(e as Error).message})`, "error");
        }
      }
      await report("Thème terminé", themeProgress);
    }
    await report("Terminé", { theme: null });
    await progress?.settled();

    if (run.id) {
      await db
        .update(pipelineRuns)
        .set({
          finishedAt: new Date(),
          status: stats.errors.length && !stats.published ? "error" : "ok",
          stats: { ...stats, usage: tracker.toJSON() },
          costUsd: tracker.tokenCostUsd.toFixed(4),
          heartbeatAt: new Date(),
        })
        .where(eq(pipelineRuns.id, run.id));
    }
    return { stats, usage: tracker.toJSON() };
  } catch (e) {
    if (run.id) {
      await progress?.log(`Échec : ${(e as Error).message}`, "error");
      await db
        .update(pipelineRuns)
        .set({ finishedAt: new Date(), status: "error", error: (e as Error).message, stats: { ...stats, usage: tracker.toJSON() } })
        .where(eq(pipelineRuns.id, run.id));
    }
    throw e;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
}
