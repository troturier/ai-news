-- Full-text search: generated column (dictionary depends on the language) + GIN index.
-- The ::regconfig literals are folded into constants, so the expression stays immutable.
ALTER TABLE "article_translations" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  CASE WHEN "locale" = 'fr' THEN
    setweight(to_tsvector('french'::regconfig, coalesce("title", '')), 'A') ||
    setweight(to_tsvector('french'::regconfig, coalesce("summary", '')), 'B') ||
    setweight(to_tsvector('french'::regconfig, coalesce("body", '')), 'C')
  ELSE
    setweight(to_tsvector('english'::regconfig, coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce("summary", '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce("body", '')), 'C')
  END
) STORED;
--> statement-breakpoint
CREATE INDEX "article_translations_search_idx" ON "article_translations" USING GIN ("search");
