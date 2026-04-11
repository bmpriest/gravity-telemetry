/**
 * Auth route tests — register, login, me, logout, change-password.
 *
 * The session lifecycle is end-to-end here: we drive the routes the same way
 * a real client would (POST register, then GET me with the cookie that
 * register set), so the cookie jar mock and the real createSession code path
 * both get exercised. Anything that bypasses the routes (e.g. seeding a user
 * directly) is restricted to ADMIN setup or to "what does the user table look
 * like after this?" assertions.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { GET as meGET } from "@/app/api/auth/me/route";
import { POST as changePasswordPOST } from "@/app/api/auth/change-password/route";
import { prismaTest, cleanUserData } from "../setup/db";
import { buildRequest, readResponse } from "../setup/api";
import { setActiveCookies, getActiveCookies } from "../setup/cookies";
import { verifyPassword } from "@/lib/password";

beforeEach(async () => {
  await cleanUserData();
});

describe("POST /api/auth/register", () => {
  test("creates a user, sets a session cookie, returns the safe user shape", async () => {
    const res = await registerPOST(buildRequest({ method: "POST", body: { username: "alice", password: "supersecret1" } }));
    const { status, json } = await readResponse<{ success: boolean; user: { id: string; username: string; role: string; mustChangePassword: boolean } }>(res);

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.username).toBe("alice");
    expect(json.user.role).toBe("USER");
    expect(json.user.mustChangePassword).toBe(false);

    // Cookie was set by the createSession call inside the route.
    expect(getActiveCookies().gt_session).toBeTruthy();

    // Password is hashed (never stored as plaintext).
    const dbUser = await prismaTest.user.findUnique({ where: { username: "alice" } });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.passwordHash).not.toBe("supersecret1");
    expect(await verifyPassword("supersecret1", dbUser!.passwordHash)).toBe(true);

    // A session row was persisted.
    const sessions = await prismaTest.session.findMany({ where: { userId: dbUser!.id } });
    expect(sessions).toHaveLength(1);
  });

  test("rejects an invalid username", async () => {
    const res = await registerPOST(buildRequest({ method: "POST", body: { username: "ab", password: "supersecret1" } }));
    const { status, json } = await readResponse<{ success: boolean; error: string }>(res);
    expect(status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/username/i);
  });

  test("rejects a short password", async () => {
    const res = await registerPOST(buildRequest({ method: "POST", body: { username: "bob", password: "short" } }));
    const { status, json } = await readResponse<{ success: boolean; error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/8 characters/i);
  });

  test("rejects a duplicate username", async () => {
    await registerPOST(buildRequest({ method: "POST", body: { username: "carol", password: "supersecret1" } }));
    setActiveCookies({}); // wipe the cookie from the first call so the second is anonymous
    const res = await registerPOST(buildRequest({ method: "POST", body: { username: "carol", password: "anothersecret1" } }));
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/already taken/i);
  });
});

describe("POST /api/auth/login", () => {
  test("logs in a registered user and rotates the cookie to a fresh session", async () => {
    // Register sets a cookie; capture it so we can confirm login replaces it.
    await registerPOST(buildRequest({ method: "POST", body: { username: "dave", password: "supersecret1" } }));
    const cookieAfterRegister = getActiveCookies().gt_session;

    setActiveCookies({}); // log out client-side
    const res = await loginPOST(buildRequest({ method: "POST", body: { username: "dave", password: "supersecret1" } }));
    const { status, json } = await readResponse<{ success: boolean; user: { username: string } }>(res);

    expect(status).toBe(200);
    expect(json.user.username).toBe("dave");

    const cookieAfterLogin = getActiveCookies().gt_session;
    expect(cookieAfterLogin).toBeTruthy();
    expect(cookieAfterLogin).not.toBe(cookieAfterRegister);
  });

  test("rejects an unknown username", async () => {
    const res = await loginPOST(buildRequest({ method: "POST", body: { username: "ghost", password: "supersecret1" } }));
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid/i);
  });

  test("rejects a wrong password", async () => {
    await registerPOST(buildRequest({ method: "POST", body: { username: "erin", password: "supersecret1" } }));
    setActiveCookies({});
    const res = await loginPOST(buildRequest({ method: "POST", body: { username: "erin", password: "wrongpassword" } }));
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid/i);
  });
});

describe("GET /api/auth/me", () => {
  test("returns the current user when a session cookie is present", async () => {
    await registerPOST(buildRequest({ method: "POST", body: { username: "frank", password: "supersecret1" } }));
    const res = await meGET();
    const { json } = await readResponse<{ user: { username: string } }>(res);
    expect(json.user?.username).toBe("frank");
  });

  test("returns null user when no session cookie is set", async () => {
    setActiveCookies({});
    const res = await meGET();
    const { json } = await readResponse<{ user: unknown }>(res);
    expect(json.user).toBeNull();
  });
});

describe("POST /api/auth/logout", () => {
  test("destroys the session row and clears the cookie", async () => {
    await registerPOST(buildRequest({ method: "POST", body: { username: "grace", password: "supersecret1" } }));
    const userBefore = await prismaTest.user.findUnique({ where: { username: "grace" } });
    expect(await prismaTest.session.count({ where: { userId: userBefore!.id } })).toBe(1);

    const res = await logoutPOST();
    expect(res.status).toBe(200);

    expect(getActiveCookies().gt_session).toBeUndefined();
    expect(await prismaTest.session.count({ where: { userId: userBefore!.id } })).toBe(0);
  });
});

describe("POST /api/auth/change-password", () => {
  test("requires the old password when mustChangePassword is false", async () => {
    await registerPOST(buildRequest({ method: "POST", body: { username: "harry", password: "supersecret1" } }));
    const res = await changePasswordPOST(
      buildRequest({ method: "POST", body: { oldPassword: "wrong", newPassword: "newsupersecret2" } }),
    );
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/current password/i);
  });

  test("rotates the password and invalidates every other session", async () => {
    await registerPOST(buildRequest({ method: "POST", body: { username: "ivy", password: "supersecret1" } }));
    const user = await prismaTest.user.findUnique({ where: { username: "ivy" } });

    // Stash a second session row to represent another logged-in device.
    await prismaTest.session.create({
      data: {
        tokenHash: "fake-other-device-hash",
        userId: user!.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    expect(await prismaTest.session.count({ where: { userId: user!.id } })).toBe(2);

    const res = await changePasswordPOST(
      buildRequest({ method: "POST", body: { oldPassword: "supersecret1", newPassword: "brandnewsecret2" } }),
    );
    expect(res.status).toBe(200);

    // The old password no longer works; the new one does.
    const refreshed = await prismaTest.user.findUnique({ where: { id: user!.id } });
    expect(await verifyPassword("supersecret1", refreshed!.passwordHash)).toBe(false);
    expect(await verifyPassword("brandnewsecret2", refreshed!.passwordHash)).toBe(true);

    // The "other device" session is gone, and we have exactly one new session
    // (the one minted by the change-password handler for the current request).
    const remaining = await prismaTest.session.findMany({ where: { userId: user!.id } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].tokenHash).not.toBe("fake-other-device-hash");
  });

  test("admin-reset users can change their password without supplying the old one", async () => {
    // Register a normal user, then forcibly flip mustChangePassword on the row
    // to simulate an admin reset (we can't drive the admin endpoint here
    // without a separate admin session — that's exercised in admin.test.ts).
    await registerPOST(buildRequest({ method: "POST", body: { username: "jen", password: "supersecret1" } }));
    const user = await prismaTest.user.findUnique({ where: { username: "jen" } });
    await prismaTest.user.update({ where: { id: user!.id }, data: { mustChangePassword: true } });

    const res = await changePasswordPOST(
      buildRequest({ method: "POST", body: { newPassword: "freshpassword2" } }),
    );
    expect(res.status).toBe(200);

    const refreshed = await prismaTest.user.findUnique({ where: { id: user!.id } });
    expect(refreshed!.mustChangePassword).toBe(false);
    expect(await verifyPassword("freshpassword2", refreshed!.passwordHash)).toBe(true);
  });

  test("returns 401 when no session is present", async () => {
    setActiveCookies({});
    const res = await changePasswordPOST(buildRequest({ method: "POST", body: { newPassword: "doesntmatter1" } }));
    expect(res.status).toBe(401);
  });
});
