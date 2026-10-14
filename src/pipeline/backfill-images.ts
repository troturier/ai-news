// Backfill: looks for an illustration for articles that have none (no call to the paid API).
//   npm run backfill-images [-- --dry] [-- --all]    (--all: also retries those already processed without a result)
import { loadEnvFile, argv, exit } from "node:process";

try {
  loadEnvFile(".env");
} catch {}

async function main() {
  const dry = argv.includes("--dry");
  const { eq, isNull } = await import("drizzle-orm");
  const { db } = await import("../db");
  const { articles } = await import("../db/schema");
  const { findImage } = await import("./image");

  const rows = await db
    .select({ id: articles.id, slug: articles.slug, url: articles.canonicalUrl })
    .from(articles)
    .where(isNull(articles.imageUrl));
  let found = 0;
  for (const a of rows) {
    const img = await findImage({ url: a.url }).catch(() => null);
    console.log(`${img ? "✓" : "–"} ${a.slug.slice(0, 55).padEnd(55)} ${img ? `${img.source} ${img.url.slice(0, 70)}` : "no image (theme icon)"}`);
    if (img) {
      found++;
      if (!dry) await db.update(articles).set({ imageUrl: img.url, imageSource: img.source }).where(eq(articles.id, a.id));
    }
  }
  console.log(`${found}/${rows.length} article(s) illustrated${dry ? " (dry run)" : ""}.`);
  exit(0);
}
main().catch((e) => { console.error(e); exit(1); });
