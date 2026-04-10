/**
 * Spins up a throw-away Postgres container, applies migrations, and returns
 * a fresh PrismaClient bound to it. Tests opt in via `await setupTestDb()`
 * inside `beforeAll`.
 */
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export interface TestDb {
  prisma: PrismaClient;
  databaseUrl: string;
  stop: () => Promise<void>;
}

export async function setupTestDb(): Promise<TestDb> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:16-alpine").start();
  const databaseUrl = container.getConnectionUri();

  // Apply migrations using prisma's CLI; pass the URL via env so prisma uses
  // the throw-away container instead of the developer's `.env`.
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  process.env.DATABASE_URL = databaseUrl;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  return {
    prisma,
    databaseUrl,
    stop: async () => {
      await prisma.$disconnect();
      await container.stop();
    },
  };
}

/** Wipes user/session/blueprint/fleet/mail rows between tests. Leaves ship data. */
export async function resetUserData(prisma: PrismaClient): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.blueprintAccount.deleteMany();
  await prisma.savedMail.deleteMany();
  await prisma.fleetShipInstance.deleteMany();
  await prisma.fleet.deleteMany();
  await prisma.user.deleteMany();
}
