/**
 * Drives the /api/auth/* route handlers directly to verify success/error
 * status codes, payload validation, and the public-registration env gate.
 *
 * Cookie + session module is stubbed (we don't actually exercise Set-Cookie
 * here — that path is covered by the auth lib tests).
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
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

beforeAll(async () => {
  db = await setupTestDb();
  auth = await import("@/lib/auth");
});

afterAll(async () => {
  await db.stop();
});

beforeEach(async () => {
  await resetUserData(db.prisma);
  currentToken = null;
});

function jsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loginAs(username: string, password = "pw-12345678", isAdmin = false): Promise<string> {
  const user = await db.prisma.user.create({
    data: {
      username,
      passwordHash: await auth.hashPassword(password),
      isAdmin,
    },
  });
  const token = auth.generateSessionToken();
  await db.prisma.session.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 86400_000) },
  });
  return token;
}

describe("POST /api/auth/login", () => {
  test("rejects unknown user", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonRequest("http://x/login", { username: "ghost", password: "anything" }));
    expect(res.status).toBe(401);
  });

  test("rejects wrong password", async () => {
    await loginAs("known");
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonRequest("http://x/login", { username: "known", password: "wrong-pw-12" }));
    expect(res.status).toBe(401);
  });

  test("accepts correct credentials", async () => {
    await loginAs("known", "correct-horse");
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonRequest("http://x/login", { username: "known", password: "correct-horse" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; user: { username: string } };
    expect(body.success).toBe(true);
    expect(body.user.username).toBe("known");
  });

  test("rejects malformed payload", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(jsonRequest("http://x/login", { username: "" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/register", () => {
  test("403 when ALLOW_PUBLIC_REGISTRATION is unset", async () => {
    delete process.env.ALLOW_PUBLIC_REGISTRATION;
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(jsonRequest("http://x/register", { username: "newbie", password: "pw-12345678" }));
    expect(res.status).toBe(403);
  });

  test("succeeds when env enabled", async () => {
    process.env.ALLOW_PUBLIC_REGISTRATION = "true";
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(jsonRequest("http://x/register", { username: "newbie", password: "pw-12345678" }));
    expect(res.status).toBe(200);
    const dbUser = await db.prisma.user.findUnique({ where: { username: "newbie" } });
    expect(dbUser).not.toBeNull();
    delete process.env.ALLOW_PUBLIC_REGISTRATION;
  });

  test("409 on duplicate username", async () => {
    process.env.ALLOW_PUBLIC_REGISTRATION = "true";
    await loginAs("dupe");
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(jsonRequest("http://x/register", { username: "dupe", password: "pw-12345678" }));
    expect(res.status).toBe(409);
    delete process.env.ALLOW_PUBLIC_REGISTRATION;
  });
});

describe("POST /api/auth/change-password", () => {
  test("401 without session", async () => {
    currentToken = null;
    const { POST } = await import("@/app/api/auth/change-password/route");
    const res = await POST(jsonRequest("http://x/cp", { currentPassword: "x", newPassword: "pw-12345678" }));
    expect(res.status).toBe(401);
  });

  test("rejects wrong current password", async () => {
    currentToken = await loginAs("eve", "old-password-12");
    const { POST } = await import("@/app/api/auth/change-password/route");
    const res = await POST(jsonRequest("http://x/cp", { currentPassword: "wrong-old", newPassword: "new-pw-12345678" }));
    expect(res.status).toBe(401);
  });

  test("rejects new === current", async () => {
    currentToken = await loginAs("frank", "same-password-1");
    const { POST } = await import("@/app/api/auth/change-password/route");
    const res = await POST(jsonRequest("http://x/cp", { currentPassword: "same-password-1", newPassword: "same-password-1" }));
    expect(res.status).toBe(400);
  });

  test("succeeds and clears mustChangePassword flag", async () => {
    currentToken = await loginAs("grace", "old-password-12");
    // Initially set the flag.
    await db.prisma.user.update({
      where: { username: "grace" },
      data: { mustChangePassword: true },
    });
    const { POST } = await import("@/app/api/auth/change-password/route");
    const res = await POST(jsonRequest("http://x/cp", { currentPassword: "old-password-12", newPassword: "new-pw-12345678" }));
    expect(res.status).toBe(200);
    const updated = await db.prisma.user.findUnique({ where: { username: "grace" } });
    expect(updated?.mustChangePassword).toBe(false);
    expect(await auth.verifyPassword("new-pw-12345678", updated!.passwordHash)).toBe(true);
  });
});
