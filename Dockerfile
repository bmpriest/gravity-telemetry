# syntax=docker/dockerfile:1.7
# ============================================================================
# Gravity Telemetry — production Dockerfile
#
# Multi-stage build:
#   1. deps    — install all node_modules (incl. dev deps + Prisma client)
#   2. builder — run `next build` against the full source tree to produce
#                the standalone server bundle and prisma migration artifacts
#   3. runner  — minimal Alpine Node image carrying only the standalone
#                bundle, the public assets, the .next/static chunks, and the
#                prisma binary needed to run migrations on container start.
#
# The runner stage runs as a non-root `nextjs` user. The startup script
# (docker-entrypoint.sh) applies pending Prisma migrations and seeds the
# admin/ship catalogue before booting `node server.js`. Seeding is idempotent.
# ============================================================================

ARG NODE_VERSION=20.18.1

# ----------------------------------------------------------------------------
# 1. deps — fetch and install all dependencies needed for the build
# ----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ----------------------------------------------------------------------------
# 2. builder — compile Next.js into the standalone bundle
# ----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client must be regenerated against the actual schema before the build,
# otherwise `next build` will fail to import @prisma/client. The deps stage's
# postinstall already ran this, but re-running here is cheap and safe.
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Bundle the seed script (TypeScript) into a single CJS file. The runner stage
# doesn't carry tsx or the full devDependencies tree, so prisma/seed.ts has to
# be self-contained JavaScript by the time it gets there.
#
# We mark ONLY @prisma/client as external — it loads a native query-engine
# binary via dlopen and can't be safely bundled. The runner stage explicitly
# COPYs the full @prisma/client + .prisma/client trees from the builder so the
# require resolves at runtime.
#
# bcryptjs is bundled in (NOT external) because Next.js standalone aggressively
# tree-shakes — it inlines bcryptjs into the route bundles instead of shipping
# it as a discoverable node_modules entry, so an external require from
# /app/prisma/seed.cjs would fail with MODULE_NOT_FOUND. bcryptjs is pure JS
# and ~70KB, so inlining it into seed.cjs is fine.
RUN npx esbuild prisma/seed.ts \
      --bundle \
      --platform=node \
      --target=node20 \
      --format=cjs \
      --external:@prisma/client \
      --outfile=prisma/seed.cjs

# ----------------------------------------------------------------------------
# 3. runner — minimal runtime image
# ----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
# postgresql-client provides `pg_isready`, used by the entrypoint to wait for
# the database to accept connections before running migrations.
RUN apk add --no-cache libc6-compat openssl postgresql-client
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root execution. The standalone server only needs read access to the
# bundle; we mount /app/data for any user-writable state through compose.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy the public assets and the standalone server bundle. `next build` with
# `output: "standalone"` produces a self-contained tree at .next/standalone
# that already includes node_modules pruned to runtime needs.
COPY --from=builder /app/public ./public

# The standalone bundle is a self-contained tree: it ships server.js, the
# pruned node_modules it needs (including @prisma/client and bcryptjs), and
# the .next runtime files. Copying it onto /app gives us /app/server.js plus
# /app/node_modules/{@prisma/client,bcryptjs,...}.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma assets needed at container startup:
#   - schema.prisma + the migration history → `prisma migrate deploy`
#   - the prebundled seed.cjs (built in the builder stage) → `node prisma/seed.cjs`
#   - the prisma CLI package — we invoke it via `node node_modules/prisma/build/index.js`
#     in the entrypoint rather than copying the `.bin/prisma` shim. The shim is
#     a symlink to ../prisma/build/index.js, and Docker COPY follows symlinks,
#     which detaches index.js from the prisma_schema_build_bg.wasm file it
#     readFileSyncs at startup. Running it from its real package path keeps the
#     adjacent build artifacts (wasm + child.js + xdg-open + public/) findable.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
