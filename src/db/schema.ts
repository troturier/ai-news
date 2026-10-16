import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const localeEnum = pgEnum("locale", ["fr", "en"]);

/* -------------------------------------------------------------------------- */
/* Authentication (tables expected by Better Auth)                             */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("reader"), // "reader" | "admin"
  locale: text("locale").notNull().default("fr"),
  onboardedAt: timestamp("onboarded_at"),
  // Weekly e-mail digest: opt-in (off until the user ticks the box at onboarding or in the profile), one-click unsubscribe.
  digestEnabled: boolean("digest_enabled").notNull().default(false),
  lastDigestAt: timestamp("last_digest_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* -------------------------------------------------------------------------- */
/* Themes and subscriptions                                                    */
/* -------------------------------------------------------------------------- */

export const themes = pgTable("themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  names: jsonb("names").$type<Record<"fr" | "en", string>>().notNull(),
  descriptions: jsonb("descriptions")
    .$type<Record<"fr" | "en", string>>()
    .notNull(),
  icon: text("icon").notNull(), // Tabler icon name
  color: text("color").notNull(),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.themeId] })],
);

/* -------------------------------------------------------------------------- */
/* Articles                                                                   */
/* -------------------------------------------------------------------------- */

export type ArticleSource = {
  url: string;
  title: string;
  publisher?: string;
};

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id),
    status: text("status").notNull().default("published"), // "published" | "hidden"
    // Deduplication: canonical URL of the main source.
    canonicalUrl: text("canonical_url").notNull().unique(),
    sources: jsonb("sources").$type<ArticleSource[]>().notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    // Illustration: sharing image (og:image) of the source or GitHub avatar, displayed from its
    // source (never copied). When absent, the theme icon is shown.
    imageUrl: text("image_url"),
    imageSource: text("image_source"), // "og" | "github"
    popularityScore: integer("popularity_score").notNull().default(0),
    popularitySignals: jsonb("popularity_signals").$type<
      Record<string, unknown>
    >(),
    model: text("model"),
    runId: uuid("run_id"),
    publishedAt: timestamp("published_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("articles_theme_published_idx").on(t.themeId, t.publishedAt),
    index("articles_published_idx").on(t.publishedAt),
  ],
);

export const articleTranslations = pgTable(
  "article_translations",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(), // Markdown
  },
  (t) => [primaryKey({ columns: [t.articleId, t.locale] })],
);

/* -------------------------------------------------------------------------- */
/* Read tracking, lists, reactions, comments                                   */
/* -------------------------------------------------------------------------- */

export const articleReads = pgTable(
  "article_reads",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.articleId] })],
);

export const readingLists = pgTable(
  "reading_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(), // Tabler icon name
    isDefault: boolean("is_default").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("reading_lists_user_idx").on(t.userId),
    // Only one default list per user.
    uniqueIndex("reading_lists_one_default")
      .on(t.userId)
      .where(sql`${t.isDefault}`),
  ],
);

export const readingListItems = pgTable(
  "reading_list_items",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => readingLists.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.listId, t.articleId] })],
);

export const articleReactions = pgTable(
  "article_reactions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(), // 1 = interesting, -1 = not interesting
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.articleId] })],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: text("status").notNull().default("visible"), // "visible" | "hidden"
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("comments_article_idx").on(t.articleId, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* Reports (articles and comments) and pipeline runs                           */
/* -------------------------------------------------------------------------- */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // "article" | "comment"
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => [
    uniqueIndex("reports_one_per_user_target").on(
      t.userId,
      t.targetType,
      t.targetId,
    ),
  ],
);

export const pipelineRuns = pgTable("pipeline_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  status: text("status").notNull().default("running"), // "running" | "ok" | "error"
  stats: jsonb("stats").$type<Record<string, unknown>>(),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
  error: text("error"),
  /** "manual" (admin button), "scheduled" (in-app scheduler) or "cli" (command line, including the former cron). */
  trigger: text("trigger").notNull().default("cli"),
  /** Live progress, written while the run is going (phase, counters, recent events). */
  progress: jsonb("progress").$type<Record<string, unknown>>(),
  /** Last progress write: a "running" run without a recent heartbeat is considered dead. */
  heartbeatAt: timestamp("heartbeat_at").notNull().defaultNow(),
});

/** Single-row table (id = 1): pipeline schedule edited from the admin page. */
export const pipelineSettings = pgTable("pipeline_settings", {
  id: smallint("id").primaryKey().default(1),
  /** Days between two scheduled runs; 0 = scheduler off (manual runs only). */
  intervalDays: smallint("interval_days").notNull().default(7),
  /** Hour of the day (Europe/Paris) at which a scheduled run starts. */
  hour: smallint("hour").notNull().default(6),
  maxPerTheme: smallint("max_per_theme").notNull().default(2),
  /** Monthly budget in USD, used only for the estimate shown in the admin page. */
  monthlyBudgetUsd: integer("monthly_budget_usd").notNull().default(100),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Relations (for db.query)                                                    */
/* -------------------------------------------------------------------------- */

export const articlesRelations = relations(articles, ({ one, many }) => ({
  theme: one(themes, { fields: [articles.themeId], references: [themes.id] }),
  translations: many(articleTranslations),
}));

export const articleTranslationsRelations = relations(
  articleTranslations,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleTranslations.articleId],
      references: [articles.id],
    }),
  }),
);

export const readingListsRelations = relations(readingLists, ({ many }) => ({
  items: many(readingListItems),
}));

export const readingListItemsRelations = relations(
  readingListItems,
  ({ one }) => ({
    list: one(readingLists, {
      fields: [readingListItems.listId],
      references: [readingLists.id],
    }),
    article: one(articles, {
      fields: [readingListItems.articleId],
      references: [articles.id],
    }),
  }),
);
