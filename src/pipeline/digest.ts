import { loadEnvFile, argv, exit } from "node:process";
import { writeFileSync } from "node:fs";

try {
  loadEnvFile(".env");
} catch {}

const arg = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 ? argv[i + 1] : undefined;
};

const DEFAULT_WINDOW_DAYS = 8;
const MAX_ARTICLES = 10;
const MAX_WINDOW_DAYS = 14;

async function main() {
  const dry = argv.includes("--dry");
  const only = arg("to"); // single recipient (test)
  const sinceDays = arg("since-days"); // ignore lastDigestAt (test)
  const out = arg("out"); // writes the HTML of the first e-mail (with --dry)

  const { and, desc, eq, gt, inArray } = await import("drizzle-orm");
  const { db } = await import("../db");
  const { articleTranslations, articles, subscriptions, themes, user } = await import("../db/schema");
  const { buildDigest } = await import("../lib/digest");
  const { sendEmail } = await import("../lib/email");

  const users = await db
    .select({ id: user.id, email: user.email, locale: user.locale, last: user.lastDigestAt })
    .from(user)
    .where(and(eq(user.emailVerified, true), eq(user.digestEnabled, true), only ? eq(user.email, only) : undefined));

  const stats = { users: users.length, sent: 0, skippedNoThemes: 0, skippedNothingNew: 0, errors: [] as string[] };
  let wroteSample = false;

  for (const u of users) {
    try {
      const lang = u.locale === "en" ? "en" : "fr";
      const subs = await db.select({ id: subscriptions.themeId }).from(subscriptions).where(eq(subscriptions.userId, u.id));
      if (!subs.length) { stats.skippedNoThemes++; continue; }

      const floor = Date.now() - MAX_WINDOW_DAYS * 86_400_000;
      const since = sinceDays
        ? new Date(Date.now() - Number(sinceDays) * 86_400_000)
        : new Date(Math.max(u.last?.getTime() ?? Date.now() - DEFAULT_WINDOW_DAYS * 86_400_000, floor));

      const rows = await db
        .select({ slug: articles.slug, title: articleTranslations.title, summary: articleTranslations.summary, theme: themes.names, color: themes.color })
        .from(articles)
        .innerJoin(articleTranslations, and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, lang)))
        .innerJoin(themes, eq(themes.id, articles.themeId))
        .where(and(eq(articles.status, "published"), gt(articles.publishedAt, since), inArray(articles.themeId, subs.map((s) => s.id))))
        .orderBy(desc(articles.publishedAt))
        .limit(MAX_ARTICLES);
      if (!rows.length) { stats.skippedNothingNew++; continue; }

      const mail = buildDigest({
        userId: u.id,
        lang,
        articles: rows.map((r) => ({ slug: r.slug, title: r.title, summary: r.summary, theme: r.theme[lang], color: r.color })),
      });

      if (dry) {
        console.log(`[dry] ${u.email} (${lang}): "${mail.subject}" · ${rows.length} article(s)`);
        if (out && !wroteSample) { writeFileSync(out, mail.html); wroteSample = true; }
        continue;
      }
      await sendEmail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text, headers: mail.headers });
      await db.update(user).set({ lastDigestAt: new Date() }).where(eq(user.id, u.id));
      stats.sent++;
      await new Promise((r) => setTimeout(r, 600)); // sending quota (Resend: 2 requests/s by default)
    } catch (e) {
      stats.errors.push(`${u.email} : ${(e as Error).message}`);
    }
  }
  console.log(JSON.stringify(stats, null, 2));
  exit(stats.errors.length && !stats.sent ? 1 : 0);
}
main().catch((e) => { console.error(e); exit(1); });
