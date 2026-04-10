/**
 * Admin guard semantics: requireUser/requireAdmin throw HttpError(401/403)
 * appropriately, and admin schema validation rejects malformed inputs.
 *
 * The cookie reader is stubbed via vitest module mock so we can drive the
 * test by setting the "current" session token directly.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { setupTestDb, resetUserData, type TestDb } from "../setup/testdb";

let currentToken: string | null = null;

vi.mock("@/lib/session", () => ({
  SESSION_TTL_SECONDS: 30 * 24 * 60 * 60,
  SESSION_RENEW_THRESHOLD_MS: 7 * 24 * 60 * 60 * 1000,
  setSessionCookie: vi.fn(async () => undefined),
  clearSessionCookie: vi.fn(async () => undefined),
  readSessionCookie: vi.fn(async () => currentToken),
}));

let db: TestDb;
let auth: typeof import("@/lib/auth");
let httpError: typeof import("@/lib/httpError");
let adminSchemas: typeof import("@/lib/adminSchemas");

beforeAll(async () => {
  db = await setupTestDb();
  auth = await import("@/lib/auth");
  httpError = await import("@/lib/httpError");
  adminSchemas = await import("@/lib/adminSchemas");
});

afterAll(async () => {
  await db.stop();
});

beforeEach(async () => {
  await resetUserData(db.prisma);
  currentToken = null;
});

describe("requireUser / requireAdmin", () => {
  async function loginAs(username: string, isAdmin: boolean): Promise<string> {
    const user = await db.prisma.user.create({
      data: {
        username,
        passwordHash: await auth.hashPassword("pw-12345678"),
        isAdmin,
      },
    });
    const token = auth.generateSessionToken();
    await db.prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });
    return token;
  }

  test("requireUser throws 401 when no cookie", async () => {
    currentToken = null;
    await expect(auth.requireUser()).rejects.toMatchObject({ status: 401 });
  });

  test("requireUser throws 401 for unknown token", async () => {
    currentToken = "garbage-token";
    await expect(auth.requireUser()).rejects.toMatchObject({ status: 401 });
  });

  test("requireUser succeeds for valid session", async () => {
    currentToken = await loginAs("alice", false);
    const user = await auth.requireUser();
    expect(user.username).toBe("alice");
    expect(user.isAdmin).toBe(false);
  });

  test("requireAdmin throws 403 for non-admin", async () => {
    currentToken = await loginAs("bob", false);
    const err = await auth.requireAdmin().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(httpError.HttpError);
    expect((err as { status: number }).status).toBe(403);
  });

  test("requireAdmin succeeds for admin", async () => {
    currentToken = await loginAs("root", true);
    const user = await auth.requireAdmin();
    expect(user.username).toBe("root");
    expect(user.isAdmin).toBe(true);
  });
});

describe("admin schema validation", () => {
  test("ship schema rejects fighter without fighterType", () => {
    const result = adminSchemas.shipInputSchema.safeParse({
      name: "Bad",
      title: "Bad",
      img: "/x.png",
      type: "Fighter",
      variant: "A",
      variantName: "",
      hasVariants: false,
      manufacturer: "JupiterIndustry",
      row: "Front",
      commandPoints: 1,
      serviceLimit: 1,
    });
    expect(result.success).toBe(false);
  });

  test("ship schema accepts fighter with fighterType + fightersPerSquadron", () => {
    const result = adminSchemas.shipInputSchema.safeParse({
      name: "Good",
      title: "Good",
      img: "/x.png",
      type: "Fighter",
      variant: "A",
      variantName: "",
      hasVariants: false,
      manufacturer: "JupiterIndustry",
      row: "Front",
      commandPoints: 1,
      serviceLimit: 1,
      fighterType: "Small",
      fightersPerSquadron: 4,
    });
    expect(result.success).toBe(true);
  });

  test("module schema rejects known module without name", () => {
    const result = adminSchemas.moduleInputSchema.safeParse({
      system: "M1",
      kind: "weapon",
      isDefault: false,
      img: "/x.png",
    });
    expect(result.success).toBe(false);
  });

  test("module schema accepts unknown module without name", () => {
    const result = adminSchemas.moduleInputSchema.safeParse({
      system: "M1",
      kind: "unknown",
      isDefault: false,
      img: "/x.png",
    });
    expect(result.success).toBe(true);
  });

  test("subsystem schema accepts minimal misc subsystem", () => {
    const result = adminSchemas.subsystemInputSchema.safeParse({
      kind: "misc",
      count: 1,
      title: "Misc",
      name: "misc-1",
    });
    expect(result.success).toBe(true);
  });
});
