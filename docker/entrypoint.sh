#!/bin/bash
set -euo pipefail

echo "[entrypoint] running prisma migrate deploy"
node node_modules/prisma/build/index.js migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] RUN_SEED=true → running seed"
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts
fi

echo "[entrypoint] starting app"
exec "$@"
