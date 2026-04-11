/**
 * Vitest globalSetup — runs ONCE before the test suite (across all files).
 *
 * Responsibilities:
 *   1. Load `.env.test` so DATABASE_URL, SESSION_SECRET, ADMIN_USERNAME and
 *      ADMIN_PASSWORD are present in process.env for everything that follows
 *      (including the seed script and any code-under-test that imports from
 *      `process.env` at module load time).
 *   2. Drop and recreate the test database from scratch by connecting to the
 *      `postgres` maintenance DB on the same server. This guarantees a clean
 *      slate every run — no leftover rows from a half-failed previous suite.
 *   3. Apply Prisma migrations (`prisma migrate deploy`) against the freshly
 *      created database.
 *   4. Run the seed script. The seed populates the ship catalogue from
 *      data/ships.ts and bootstraps an admin user from the env vars set in
 *      step 1. Tests that need user accounts will create their own; this
 *      admin is just here to satisfy the "exactly one admin must exist"
 *      bootstrap invariant and to be a known starting fixture.
 *
 * The DB is left in place after the suite finishes so that an inspector can
 * eyeball the final state. The next run will drop it again before doing
 * anything else, so leftover state never affects results.
 */

import { config as loadEnv } from "dotenv";
import { execSync } from "child_process";
import path from "path";
import { Client } from "pg";

export default async function globalSetup(): Promise<void> {
  // 1. Load .env.test into process.env. We override any pre-existing values
  //    so that an accidentally-set DATABASE_URL in the user's shell doesn't
  //    cause us to truncate their dev database.
  loadEnv({ path: path.resolve(__dirname, "..", "..", ".env.test"), override: true });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("[test setup] DATABASE_URL is not set after loading .env.test");

  const parsed = new URL(databaseUrl);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName || dbName === "postgres") {
    throw new Error(`[test setup] refusing to use database name "${dbName}" — set DATABASE_URL to a dedicated test DB`);
  }

  // 2. Connect to the maintenance database to drop+recreate the test DB.
  //    We can't drop a DB while connected to it, so we have to use `postgres`
  //    (or any other DB) as the connection target.
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    // Force-disconnect any stale clients holding the test DB open before drop.
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await admin.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.end();
  }

  // 3. Apply migrations. We shell out to the prisma CLI rather than calling
  //    a JS API because there is no stable JS entry point for `migrate deploy`,
  //    and shelling out gives us identical behavior to production.
  const repoRoot = path.resolve(__dirname, "..", "..");
  execSync("npx prisma migrate deploy", {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  // 4. Seed the catalogue + bootstrap the admin user.
  execSync("npx tsx prisma/seed.ts", {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
