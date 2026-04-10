/**
 * Integration tests for the auth library against a real Postgres container.
 *
 * Each test sets DATABASE_URL via testdb, then dynamically imports @/lib/auth
 * (which transitively constructs the PrismaClient) so the singleton picks up
 * the throw-away container.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, resetUserData, type TestDb } from "../setup/testdb";

let db: TestDb;
let auth: typeof import("@/lib/auth");

beforeAll(async () => {
  db = await setupTestDb();
  // Dynamic import AFTER DATABASE_URL is set so the prisma singleton binds correctly.
  auth = await import("@/lib/auth");
});

afterAll(async () => {
  await db.stop();
});

beforeEach(async () => {
  await resetUserData(db.prisma);
});

describe("password hashing", () => {
  test("hashed password verifies", async () => {
    const hash = await auth.hashPassword("hunter2-correct");
    expect(hash).not.toBe("hunter2-correct");
    expect(await auth.verifyPassword("hunter2-correct", hash)).toBe(true);
    expect(await auth.verifyPassword("wrong", hash)).toBe(false);
  });

  test("each hash is unique (salted)", async () => {
    const a = await auth.hashPassword("same-password");
    const b = await auth.hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});

describe("session lifecycle", () => {
  test("created session verifies and surfaces user fields", async () => {
    const user = await db.prisma.user.create({
      data: {
        username: "alice",
        passwordHash: await auth.hashPassword("pw-12345678"),
        isAdmin: false,
        mustChangePassword: true,
      },
    });

    const token = auth.generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.prisma.session.create({ data: { token, userId: user.id, expiresAt } });

    const session = await auth.verifySession(token);
    expect(session).not.toBeNull();
    expect(session?.username).toBe("alice");
    expect(session?.isAdmin).toBe(false);
    expect(session?.mustChangePassword).toBe(true);
  });

  test("expired session returns null and is cleaned up", async () => {
    const user = await db.prisma.user.create({
      data: {
        username: "bob",
        passwordHash: await auth.hashPassword("pw-12345678"),
      },
    });
    const token = auth.generateSessionToken();
    const expiresAt = new Date(Date.now() - 60_000);
    await db.prisma.session.create({ data: { token, userId: user.id, expiresAt } });

    const session = await auth.verifySession(token);
    expect(session).toBeNull();
    // best-effort cleanup is async; give it a moment
    await new Promise((r) => setTimeout(r, 50));
    const remaining = await db.prisma.session.findUnique({ where: { token } });
    expect(remaining).toBeNull();
  });

  test("unknown token returns null", async () => {
    const session = await auth.verifySession("does-not-exist");
    expect(session).toBeNull();
  });

  test("sliding renewal extends expiry when <7 days remain", async () => {
    const user = await db.prisma.user.create({
      data: {
        username: "carol",
        passwordHash: await auth.hashPassword("pw-12345678"),
      },
    });
    const token = auth.generateSessionToken();
    const oldExpiry = new Date(Date.now() + 60 * 1000); // 1 min from now
    await db.prisma.session.create({ data: { token, userId: user.id, expiresAt: oldExpiry } });

    // verifySession will renew. setSessionCookie throws outside Next request scope,
    // so wrap and ignore — we only care that the DB row was updated.
    try {
      await auth.verifySession(token);
    } catch {
      /* cookies() unavailable in vitest */
    }
    const updated = await db.prisma.session.findUnique({ where: { token } });
    expect(updated).not.toBeNull();
    // Expiry should be pushed out far past the original 1 min.
    expect(updated!.expiresAt.getTime()).toBeGreaterThan(oldExpiry.getTime() + 86400_000);
  });
});
