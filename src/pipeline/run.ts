import { randomBytes } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../db";
import {
  articleTranslations,
  articles,
  pipelineRuns,
  themes,
} from "../db/schema";
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
    : await db.insert(pipelineRuns).values({}).returning({ id: pipelineRuns.id });

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

    for (const theme of selected) {
      stats.themes++;
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
        continue;
      }
      stats.discovered += candidates.length;

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
          continue;
        }
        accepted.push({ c, url, score: verdict.score, signals: verdict.signals });
      }

      accepted.sort((a, b) => b.score - a.score);
      if (opts.dryRun) continue;

      for (const { c, url, score, signals } of accepted.slice(0, opts.maxPerTheme)) {
        try {
          const art = await writeArticle({ candidate: c, themeName: theme.names.en, tracker });
          if (art.verdict === "skip") {
            stats.skippedByWriter++;
            stats.details.push({ theme: theme.slug, title: c.title, outcome: "skipped by the writer", reason: art.skipReason });
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
          }
        } catch (e) {
          stats.errors.push(`${theme.slug} (writing "${c.title}"): ${(e as Error).message}`);
        }
      }
    }

    if (run.id) {
      await db
        .update(pipelineRuns)
        .set({
          finishedAt: new Date(),
          status: stats.errors.length && !stats.published ? "error" : "ok",
          stats: { ...stats, usage: tracker.toJSON() },
          costUsd: tracker.tokenCostUsd.toFixed(4),
        })
        .where(eq(pipelineRuns.id, run.id));
    }
    return { stats, usage: tracker.toJSON() };
  } catch (e) {
    if (run.id) {
      await db
        .update(pipelineRuns)
        .set({ finishedAt: new Date(), status: "error", error: (e as Error).message, stats: { ...stats, usage: tracker.toJSON() } })
        .where(eq(pipelineRuns.id, run.id));
    }
    throw e;
  }
}
