/**
 * Test-side Prisma client + helpers for resetting per-test state.
 *
 * `cleanUserData` truncates everything user-owned (auth, blueprints, fleets,
 * mails) but leaves the seeded ship catalogue intact. Tests call this in
 * beforeEach so they always start from a known empty state without paying the
 * cost of re-running migrations and re-seeding.
 *
 * `createTestUser` is a small fixture that hashes a password and inserts a
 * user row directly via Prisma so individual tests don't have to drive the
 * /api/auth/register route just to get a logged-in user.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { setActiveCookies } from "./cookies";
import { createSession } from "@/lib/session";

// Note: this client uses the DATABASE_URL set by globalSetup before any test
// file is imported, so it points at the test database, not the dev database.
export const prismaTest = new PrismaClient();

/**
 * Truncate every table that holds user-generated content. Order matters only
 * because we want CASCADE to do the work — restarting identity keeps test
 * fixtures predictable across runs.
 *
 * The Ship/ShipModule/Subsystem/etc. tables are deliberately NOT touched, so
 * the seeded catalogue is reused by every test. The only catalogue mutation
 * tests perform is via /api/admin/ships, and those tests are responsible for
 * undoing their own changes.
 */
export async function cleanUserData(): Promise<void> {
  await prismaTest.$executeRawUnsafe(
    `TRUNCATE TABLE
      "Session",
      "BlueprintAccount",
      "ShipBlueprint",
      "ModuleBlueprint",
      "SavedFleet",
      "FleetShipInstance",
      "SavedMail",
      "User"
     RESTART IDENTITY CASCADE`,
  );
}

export interface CreateUserOptions {
  username: string;
  password: string;
  role?: "USER" | "ADMIN";
  mustChangePassword?: boolean;
}

export async function createTestUser(opts: CreateUserOptions) {
  const passwordHash = await bcrypt.hash(opts.password, 4); // low cost in tests
  return prismaTest.user.create({
    data: {
      username: opts.username,
      passwordHash,
      role: opts.role ?? "USER",
      mustChangePassword: opts.mustChangePassword ?? false,
    },
  });
}

/**
 * Creates a user, then primes the cookie jar with a real session for them.
 * After this call, any route handler invoked from the test will see the user
 * as authenticated.
 */
export async function loginAs(opts: CreateUserOptions): Promise<{ id: string; username: string; role: "USER" | "ADMIN" }> {
  const user = await createTestUser(opts);
  // createSession sets the cookie via the mocked next/headers cookies() jar.
  setActiveCookies({});
  await createSession(user.id);
  return { id: user.id, username: user.username, role: user.role };
}
