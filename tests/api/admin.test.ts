/**
 * Admin route tests for the v4.0 admin API.
 *
 * v4 replaced the bespoke ship/module/subsystem CRUD endpoints with:
 *   - a generic table editor   (/api/admin/db)
 *   - a read-only SQL view     (/api/admin/query)
 *   - a JSON importer          (/api/admin/import)
 * plus the unchanged users + manufacturers endpoints.
 *
 * We verify role gating on every surface and the core behavior of each.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { GET as adminUsersGET } from "@/app/api/admin/users/route";
import { POST as resetPasswordPOST } from "@/app/api/admin/users/[id]/reset-password/route";
import { GET as adminManufacturersGET, POST as adminManufacturersPOST } from "@/app/api/admin/manufacturers/route";
import { PATCH as adminManufacturersPATCH, DELETE as adminManufacturersDELETE } from "@/app/api/admin/manufacturers/[id]/route";
import { GET as dbGET, POST as dbPOST, PATCH as dbPATCH, DELETE as dbDELETE } from "@/app/api/admin/db/route";
import { POST as queryPOST } from "@/app/api/admin/query/route";
import { POST as importPOST } from "@/app/api/admin/import/route";
import { prismaTest, cleanUserData, loginAs } from "../setup/db";
import { buildRequest, readResponse } from "../setup/api";
import { setActiveCookies } from "../setup/cookies";
import { verifyPassword } from "@/lib/password";

beforeEach(async () => {
  await cleanUserData();
});

async function jupiterId(): Promise<number> {
  const m = await prismaTest.manufacturer.findUnique({ where: { name: "Jupiter Industry" } });
  if (!m) throw new Error("Test fixture missing: Jupiter Industry was not seeded.");
  return m.id;
}

// ----------------------------------------------------------------------------
// Role gating across every admin surface
// ----------------------------------------------------------------------------

describe("admin route gating", () => {
  test("GET /api/admin/users — 401 anonymous, 403 regular", async () => {
    setActiveCookies({});
    expect((await adminUsersGET(buildRequest({ url: "http://localhost/api/admin/users" }))).status).toBe(401);
    await loginAs({ username: "regular", password: "regularpass1" });
    expect((await adminUsersGET(buildRequest({ url: "http://localhost/api/admin/users" }))).status).toBe(403);
  });

  test("/api/admin/db — 401 anonymous, 403 regular", async () => {
    setActiveCookies({});
    expect((await dbGET(buildRequest({ url: "http://localhost/api/admin/db?table=Ship" }))).status).toBe(401);
    await loginAs({ username: "regular_db", password: "regularpass1" });
    expect((await dbGET(buildRequest({ url: "http://localhost/api/admin/db?table=Ship" }))).status).toBe(403);
  });

  test("/api/admin/query + /api/admin/import — 401 anonymous, 403 regular", async () => {
    setActiveCookies({});
    expect((await queryPOST(buildRequest({ method: "POST", body: { sql: "SELECT 1" } }))).status).toBe(401);
    expect((await importPOST(buildRequest({ method: "POST", body: {} }))).status).toBe(401);
    await loginAs({ username: "regular_q", password: "regularpass1" });
    expect((await queryPOST(buildRequest({ method: "POST", body: { sql: "SELECT 1" } }))).status).toBe(403);
    expect((await importPOST(buildRequest({ method: "POST", body: {} }))).status).toBe(403);
  });
});

// ----------------------------------------------------------------------------
// /api/admin/users
// ----------------------------------------------------------------------------

describe("GET /api/admin/users", () => {
  test("returns paginated users and never leaks passwordHash", async () => {
    await loginAs({ username: "admin1", password: "adminpass1", role: "ADMIN" });
    for (let i = 0; i < 5; i++) {
      await prismaTest.user.create({ data: { username: `user${i}`, passwordHash: "x", role: "USER" } });
    }
    const res = await adminUsersGET(buildRequest({ url: "http://localhost/api/admin/users?page=1&pageSize=3" }));
    interface Row { id: string; username: string; passwordHash?: string }
    const { status, json } = await readResponse<{ data: Row[]; total: number }>(res);
    expect(status).toBe(200);
    expect(json.data).toHaveLength(3);
    expect(json.total).toBe(6);
    for (const row of json.data) expect(row).not.toHaveProperty("passwordHash");
  });
});

describe("POST /api/admin/users/:id/reset-password", () => {
  test("rotates the password, forces a change, and destroys all sessions", async () => {
    await loginAs({ username: "admin2", password: "adminpass2", role: "ADMIN" });
    const target = await prismaTest.user.create({ data: { username: "victim", passwordHash: "garbage", role: "USER" } });
    await prismaTest.session.createMany({
      data: [
        { tokenHash: "victim-session-1", userId: target.id, expiresAt: new Date(Date.now() + 86400_000) },
        { tokenHash: "victim-session-2", userId: target.id, expiresAt: new Date(Date.now() + 86400_000) },
      ],
    });
    const res = await resetPasswordPOST(buildRequest({ method: "POST", body: { password: "adminchosen1" } }), { params: Promise.resolve({ id: target.id }) });
    const { status, json } = await readResponse<{ password: string }>(res);
    expect(status).toBe(200);
    expect(json.password).toBe("adminchosen1");
    const refreshed = await prismaTest.user.findUnique({ where: { id: target.id } });
    expect(refreshed!.mustChangePassword).toBe(true);
    expect(await verifyPassword("adminchosen1", refreshed!.passwordHash)).toBe(true);
    expect(await prismaTest.session.count({ where: { userId: target.id } })).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// /api/admin/db — generic table editor
// ----------------------------------------------------------------------------

describe("admin generic DB editor", () => {
  test("create + patch + toggle visible + delete a Ship round-trips", async () => {
    await loginAs({ username: "dbadmin1", password: "adminpass1", role: "ADMIN" });
    const manufacturerId = await jupiterId();

    const createRes = await dbPOST(buildRequest({
      method: "POST",
      url: "http://localhost/api/admin/db?table=Ship",
      body: { name: "DB Test Cruiser", shortName: "DBTest", type: "Cruiser", manufacturerId, commandPoints: 5 },
    }));
    const { status: cs, json: cj } = await readResponse<{ id: number }>(createRes);
    expect(cs).toBe(200);
    expect(typeof cj.id).toBe("number");

    // Patch a scalar.
    const patchRes = await dbPATCH(buildRequest({ method: "PATCH", url: `http://localhost/api/admin/db?table=Ship&id=${cj.id}`, body: { commandPoints: 9 } }));
    expect(patchRes.status).toBe(200);
    expect((await prismaTest.ship.findUnique({ where: { id: cj.id } }))!.commandPoints).toBe(9);

    // Toggle visibility off.
    const visRes = await dbPATCH(buildRequest({ method: "PATCH", url: `http://localhost/api/admin/db?table=Ship&id=${cj.id}`, body: { visible: false } }));
    expect(visRes.status).toBe(200);
    expect((await prismaTest.ship.findUnique({ where: { id: cj.id } }))!.visible).toBe(false);

    // Delete.
    const delRes = await dbDELETE(buildRequest({ method: "DELETE", url: `http://localhost/api/admin/db?table=Ship&id=${cj.id}` }));
    expect(delRes.status).toBe(200);
    expect(await prismaTest.ship.findUnique({ where: { id: cj.id } })).toBeNull();
  });

  test("rejects a non-whitelisted table", async () => {
    await loginAs({ username: "dbadmin2", password: "adminpass2", role: "ADMIN" });
    const res = await dbGET(buildRequest({ url: "http://localhost/api/admin/db?table=User" }));
    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------------------
// /api/admin/query — read-only SQL
// ----------------------------------------------------------------------------

describe("admin SQL view", () => {
  test("runs a SELECT and returns rows", async () => {
    await loginAs({ username: "sqladmin1", password: "adminpass1", role: "ADMIN" });
    const res = await queryPOST(buildRequest({ method: "POST", body: { sql: `SELECT count(*)::int AS n FROM "Ship"` } }));
    const { status, json } = await readResponse<{ rows: { n: number }[] }>(res);
    expect(status).toBe(200);
    expect(json.rows[0].n).toBeGreaterThan(0);
  });

  test("rejects a mutating statement", async () => {
    await loginAs({ username: "sqladmin2", password: "adminpass2", role: "ADMIN" });
    const res = await queryPOST(buildRequest({ method: "POST", body: { sql: `DELETE FROM "Ship"` } }));
    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------------------
// /api/admin/import — JSON importer
// ----------------------------------------------------------------------------

describe("admin JSON importer", () => {
  test("imports a minimal ships.json object", async () => {
    await loginAs({ username: "impadmin1", password: "adminpass1", role: "ADMIN" });
    const payload = {
      "987654": {
        ship_id: 987654,
        name: "Importer Test - Demo",
        short_name: "ImpDemo",
        type: "Cruiser",
        manufacturer: "Jupiter Industry",
        manufacturer_id: 1,
        command_points: 12,
        systems: [],
      },
    };
    const res = await importPOST(buildRequest({ method: "POST", body: payload }));
    const { status } = await readResponse(res);
    expect(status).toBe(200);

    const imported = await prismaTest.ship.findUnique({ where: { gameId: 987654 } });
    expect(imported).not.toBeNull();
    expect(imported!.commandPoints).toBe(12);

    // Clean up so other catalogue-walking tests don't see this fixture.
    await prismaTest.ship.delete({ where: { id: imported!.id } });
  });
});

// ----------------------------------------------------------------------------
// /api/admin/manufacturers — runtime-editable manufacturer table (unchanged)
// ----------------------------------------------------------------------------

describe("admin manufacturer CRUD", () => {
  test("GET — anonymous gets 401, regular user gets 403", async () => {
    setActiveCookies({});
    expect((await adminManufacturersGET()).status).toBe(401);
    await loginAs({ username: "manuregular", password: "regularpass1" });
    expect((await adminManufacturersGET()).status).toBe(403);
  });

  test("create + rename + delete a manufacturer round-trips", async () => {
    await loginAs({ username: "manuadmin1", password: "adminpass1", role: "ADMIN" });
    const createRes = await adminManufacturersPOST(buildRequest({ method: "POST", body: { name: "Test Foundry" } }));
    const { status: createStatus, json: createJson } = await readResponse<{ id: number; name: string }>(createRes);
    expect(createStatus).toBe(200);
    expect(createJson.name).toBe("Test Foundry");

    const patchRes = await adminManufacturersPATCH(buildRequest({ method: "PATCH", body: { name: "Renamed Foundry" } }), { params: Promise.resolve({ id: String(createJson.id) }) });
    expect(patchRes.status).toBe(200);
    expect((await prismaTest.manufacturer.findUnique({ where: { id: createJson.id } }))!.name).toBe("Renamed Foundry");

    const deleteRes = await adminManufacturersDELETE(buildRequest({ method: "DELETE" }), { params: Promise.resolve({ id: String(createJson.id) }) });
    expect(deleteRes.status).toBe(200);
    expect(await prismaTest.manufacturer.findUnique({ where: { id: createJson.id } })).toBeNull();
  });

  test("refuses to delete a manufacturer that still has ships", async () => {
    await loginAs({ username: "manuadmin3", password: "adminpass3", role: "ADMIN" });
    const jupiter = await prismaTest.manufacturer.findUnique({ where: { name: "Jupiter Industry" } });
    const res = await adminManufacturersDELETE(buildRequest({ method: "DELETE" }), { params: Promise.resolve({ id: String(jupiter!.id) }) });
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/ship/i);
  });
});
