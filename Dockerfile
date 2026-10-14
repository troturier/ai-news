FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
# Public value, embedded in the browser code: required at build time.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
# Build-time placeholder only (variable scoped to this command, never in the final image):
# Better Auth refuses to initialise in production without a secret.
RUN BETTER_AUTH_SECRET=build-only-placeholder-not-used-at-runtime npm run build

# One-shot target: applies the Drizzle migrations.
FROM deps AS migrate
COPY drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs
CMD ["node", "scripts/migrate.mjs"]

# One-shot target: command-line tools (pipeline, digest, seed, make-admin…).
# Usage: docker compose run --rm tools src/pipeline/cli.ts --max 2
FROM deps AS tools
COPY . .
ENV TZ=Europe/Paris
ENTRYPOINT ["npx", "tsx", "--conditions=react-server"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    TZ=Europe/Paris \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
