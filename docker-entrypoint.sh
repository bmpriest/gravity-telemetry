#!/bin/sh
# ============================================================================
# Container entrypoint for the Next.js standalone runtime.
#
# 1. Wait for Postgres to accept connections (the `db` service in compose is
#    healthchecked, but we still guard against the rare race where the runner
#    boots before the healthcheck flips green).
# 2. Apply pending Prisma migrations (`migrate deploy` is idempotent — it only
#    runs migrations that haven't been recorded in the _prisma_migrations
#    table on the target DB).
# 3. Re-seed the catalogue + bootstrap the admin user. The seed script is
#    idempotent: ships are upserted by (name, variant) and the admin user is
#    only created if no admin already exists in the database.
# 4. Hand control to the standalone Next.js server.
# ============================================================================

set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] DATABASE_URL is not set — refusing to start." >&2
  exit 1
fi

# Best-effort wait for the database. The compose file already gates the runner
# behind `depends_on: db: condition: service_healthy`, but if someone runs the
# image without compose this loop is a useful safety net.
#
# We parse host + port out of DATABASE_URL with a small POSIX-sh expression so
# that pg_isready can do a real TCP probe rather than us racing on Prisma.
DB_HOST=$(printf '%s' "$DATABASE_URL" | sed -n 's|.*://[^@]*@\([^:/]*\).*|\1|p')
DB_PORT=$(printf '%s' "$DATABASE_URL" | sed -n 's|.*://[^@]*@[^:/]*:\([0-9]*\).*|\1|p')
DB_PORT=${DB_PORT:-5432}

echo "[entrypoint] Waiting for database at ${DB_HOST}:${DB_PORT} to accept connections..."
WAIT_SECONDS=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; do
  if [ "$WAIT_SECONDS" -ge 60 ]; then
    echo "[entrypoint] Database did not become ready within 60s — giving up." >&2
    exit 1
  fi
  sleep 2
  WAIT_SECONDS=$((WAIT_SECONDS + 2))
done
echo "[entrypoint] Database is reachable."

echo "[entrypoint] Applying Prisma migrations..."
# Invoke prisma directly from its package path (not via .bin/prisma) so the
# adjacent prisma_schema_build_bg.wasm file is resolvable from index.js's
# __dirname. See the matching comment in the Dockerfile.
node ./node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Seeding ship catalogue and bootstrapping admin..."
# We invoke the prebundled CJS file directly rather than going through
# `prisma db seed`, because that command would require tsx + the original
# package.json's `prisma.seed` config, neither of which are present in the
# runner image. seed.cjs was built by esbuild in the builder stage and is
# self-contained except for @prisma/client and bcryptjs (which the
# standalone bundle already provides).
node prisma/seed.cjs || echo "[entrypoint] Seed failed (continuing — usually fine on subsequent boots)."

echo "[entrypoint] Starting Next.js server..."
exec "$@"
