ALTER TABLE "user" ALTER COLUMN "digest_enabled" SET DEFAULT false;--> statement-breakpoint
UPDATE "user" SET "digest_enabled" = false;
