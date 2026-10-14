# AI News

An AI news blog, **bilingual (French / English)**. Every week, a pipeline looks for popular news by theme
(law, machine learning, open source…), writes an original summary with its sources, translates it and publishes it.
Readers follow themes, keep track of what they have read, build lists and comment.

## Features

- Accounts: e-mail + password (with e-mail verification) or Google, Cloudflare Turnstile captcha, `admin` / `reader` roles.
- Themes to follow (chosen at first login, editable), "My themes" feed, weekly e-mail digest.
- Tracking: read articles, "Interesting / Not interesting", comments, reports.
- Article cards: illustration (the source's sharing image, otherwise the theme icon), theme color, clickable Read / Unread badge, quick add to a list, "hide read articles" button.
- Reading lists ("À lire plus tard" by default): name, color and icon chosen among ~5,000 Tabler icons.
- Full-text search, RSS feeds (global and per theme), related articles, Markdown export (Obsidian), dark mode.
- Administration: unpublish, moderate reports, monitor pipeline runs and their cost.
- GDPR: JSON data export, account deletion.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · PostgreSQL 17 · Drizzle · Better Auth · Resend · Anthropic API
(web search, structured outputs validated with zod) · Docker Compose + Traefik.

## Development

```bash
cp .env.example .env          # then fill in the keys
docker compose up -d          # local PostgreSQL (port 5433)
npm ci
npm run db:migrate && npm run db:seed
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run pipeline -- --theme llm-agents --max 2 [--dry]` | Generates articles (`--dry`: discovery and filtering only) |
| `npm run pipeline:compare` | Compares models on the same theme |
| `npm run digest -- --dry --since-days 30` | Simulates the e-mail digest |
| `npm run backfill-images [-- --dry]` | Looks for an illustration for articles that have none (no paid calls) |
| `npm run make-admin -- address@example.com` | Grants the admin role |
| `npm run build` | Production build |

The pipeline: discovery (web search) → deduplication → **deterministic** popularity filter (GitHub stars,
Hacker News, source scale) → EN + FR writing. Defaults: Sonnet for discovery, Haiku for writing
(overridable, see `.env.example`).

## Deployment (VPS, Docker Compose behind Traefik)

```bash
git clone https://github.com/troturier/ai-news.git /opt/docker/ai-news && cd /opt/docker/ai-news
cp .env.example .env && chmod 600 .env        # fill in APP_DOMAIN, secrets, keys
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm tools src/db/seed.ts
```

Update: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.
Weekly task (cron): `scripts/weekly.sh` (database backup, pipeline, digest).
