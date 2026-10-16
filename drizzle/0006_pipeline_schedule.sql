ALTER TABLE "pipeline_runs" ADD COLUMN "trigger" text DEFAULT 'cli' NOT NULL;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD COLUMN "progress" jsonb;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD COLUMN "heartbeat_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE TABLE "pipeline_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"interval_days" smallint DEFAULT 7 NOT NULL,
	"hour" smallint DEFAULT 6 NOT NULL,
	"max_per_theme" smallint DEFAULT 2 NOT NULL,
	"monthly_budget_usd" integer DEFAULT 100 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Existing weekly cron (Monday): keep a weekly schedule, so enabling the in-app scheduler changes nothing by itself.
INSERT INTO "pipeline_settings" ("id") VALUES (1);
