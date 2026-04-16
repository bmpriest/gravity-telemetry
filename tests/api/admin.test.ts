/**
 * Admin route tests — /api/admin/users and /api/admin/ships.
 *
 * Two pillars to verify:
 *   1. Role gating actually works. Anonymous requests get 401, logged-in
 *      non-admins get 403, admins get 200. We test each gate at the
 *      handler level so a future regression in lib/session.ts is caught.
 *   2. The mutation paths do what they advertise: reset-password destroys
 *      all sessions and forces mustChangePassword=true; ship CRUD writes
 *      land and respect uniqueness; deletes cascade.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { GET as adminUsersGET } from "@/app/api/admin/users/route";
import { POST as resetPasswordPOST } from "@/app/api/admin/users/[id]/reset-password/route";
import { POST as adminShipsPOST } from "@/app/api/admin/ships/route";
import { PATCH as adminShipsPATCH, DELETE as adminShipsDELETE } from "@/app/api/admin/ships/[id]/route";
import { GET as adminManufacturersGET, POST as adminManufacturersPOST } from "@/app/api/admin/manufacturers/route";
import { PATCH as adminManufacturersPATCH, DELETE as adminManufacturersDELETE } from "@/app/api/admin/manufacturers/[id]/route";
import { POST as adminShipModulesPOST } from "@/app/api/admin/ships/[id]/modules/route";
import { PATCH as adminModulesPATCH, DELETE as adminModulesDELETE } from "@/app/api/admin/modules/[id]/route";
import { POST as adminSubsystemsPOST } from "@/app/api/admin/modules/[id]/subsystems/route";
import { PATCH as adminSubsystemsPATCH, DELETE as adminSubsystemsDELETE } from "@/app/api/admin/subsystems/[id]/route";
import { prismaTest, cleanUserData, loginAs } from "../setup/db";
import { buildRequest, readResponse } from "../setup/api";
import { setActiveCookies } from "../setup/cookies";
import { verifyPassword } from "@/lib/password";

beforeEach(async () => {
  await cleanUserData();
});

// ----------------------------------------------------------------------------
// Role gating
// ----------------------------------------------------------------------------

describe("admin route gating", () => {
  test("GET /api/admin/users — 401 when anonymous", async () => {
    setActiveCookies({});
    const res = await adminUsersGET(buildRequest({ url: "http://localhost/api/admin/users" }));
    expect(res.status).toBe(401);
  });

  test("GET /api/admin/users — 403 when logged in as a regular user", async () => {
    await loginAs({ username: "regular", password: "regularpass1" });
    const res = await adminUsersGET(buildRequest({ url: "http://localhost/api/admin/users" }));
    expect(res.status).toBe(403);
  });

  test("POST /api/admin/ships — 401 when anonymous", async () => {
    setActiveCookies({});
    const res = await adminShipsPOST(buildRequest({ method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });

  test("POST /api/admin/ships — 403 when logged in as a regular user", async () => {
    await loginAs({ username: "regular2", password: "regularpass2" });
    const res = await adminShipsPOST(buildRequest({ method: "POST", body: {} }));
    expect(res.status).toBe(403);
  });
});

// ----------------------------------------------------------------------------
// /api/admin/users
// ----------------------------------------------------------------------------

describe("GET /api/admin/users", () => {
  test("returns paginated users with username search and never leaks passwordHash", async () => {
    await loginAs({ username: "admin1", password: "adminpass1", role: "ADMIN" });
    // Some seeded users to page over.
    for (let i = 0; i < 5; i++) {
      await prismaTest.user.create({
        data: { username: `user${i}`, passwordHash: "x", role: "USER" },
      });
    }

    const res = await adminUsersGET(
      buildRequest({ url: "http://localhost/api/admin/users?page=1&pageSize=3" }),
    );
    interface Row { id: string; username: string; role: string; passwordHash?: string }
    const { status, json } = await readResponse<{ data: Row[]; total: number }>(res);

    expect(status).toBe(200);
    expect(json.data).toHaveLength(3);
    // total = 5 USER + 1 ADMIN we just made
    expect(json.total).toBe(6);
    for (const row of json.data) {
      expect(row).not.toHaveProperty("passwordHash");
    }

    // Search narrows to the matching users only.
    const filtered = await adminUsersGET(
      buildRequest({ url: "http://localhost/api/admin/users?q=user2" }),
    );
    const filteredJson = await readResponse<{ data: Row[]; total: number }>(filtered);
    expect(filteredJson.json.total).toBe(1);
    expect(filteredJson.json.data[0].username).toBe("user2");
  });
});

describe("POST /api/admin/users/:id/reset-password", () => {
  test("rotates the password, sets mustChangePassword, and destroys all sessions for the target", async () => {
    await loginAs({ username: "admin2", password: "adminpass2", role: "ADMIN" });

    // Create a victim user with two live sessions.
    const target = await prismaTest.user.create({
      data: { username: "victim", passwordHash: "garbage", role: "USER" },
    });
    await prismaTest.session.createMany({
      data: [
        { tokenHash: "victim-session-1", userId: target.id, expiresAt: new Date(Date.now() + 86400_000) },
        { tokenHash: "victim-session-2", userId: target.id, expiresAt: new Date(Date.now() + 86400_000) },
      ],
    });

    const res = await resetPasswordPOST(
      buildRequest({ method: "POST", body: { password: "adminchosen1" } }),
      { params: Promise.resolve({ id: target.id }) },
    );
    const { status, json } = await readResponse<{ password: string }>(res);
    expect(status).toBe(200);
    expect(json.password).toBe("adminchosen1");

    const refreshed = await prismaTest.user.findUnique({ where: { id: target.id } });
    expect(refreshed!.mustChangePassword).toBe(true);
    expect(await verifyPassword("adminchosen1", refreshed!.passwordHash)).toBe(true);
    expect(await prismaTest.session.count({ where: { userId: target.id } })).toBe(0);
  });

  test("generates a random password when none is supplied", async () => {
    await loginAs({ username: "admin3", password: "adminpass3", role: "ADMIN" });
    const target = await prismaTest.user.create({
      data: { username: "randomvictim", passwordHash: "x", role: "USER" },
    });

    const res = await resetPasswordPOST(
      buildRequest({ method: "POST", body: {} }),
      { params: Promise.resolve({ id: target.id }) },
    );
    const { json } = await readResponse<{ password: string }>(res);
    expect(json.password).toMatch(/^[A-Za-z0-9]{16}$/);

    const refreshed = await prismaTest.user.findUnique({ where: { id: target.id } });
    expect(await verifyPassword(json.password, refreshed!.passwordHash)).toBe(true);
  });

  test("400 when the target user does not exist", async () => {
    await loginAs({ username: "admin4", password: "adminpass4", role: "ADMIN" });
    const res = await resetPasswordPOST(
      buildRequest({ method: "POST", body: {} }),
      { params: Promise.resolve({ id: "no-such-user" }) },
    );
    expect(res.status).toBe(400);
  });
});

// ----------------------------------------------------------------------------
// /api/admin/ships
// ----------------------------------------------------------------------------

// Resolve a manufacturer id from the seeded catalogue. The globalSetup seed
// inserts the original 5 manufacturers, so any of them is safe to reference;
// these tests use Jupiter Industry as the canonical fixture.
async function jupiterId(): Promise<number> {
  const m = await prismaTest.manufacturer.findUnique({ where: { name: "Jupiter Industry" } });
  if (!m) throw new Error("Test fixture missing: Jupiter Industry was not seeded.");
  return m.id;
}

describe("admin ship CRUD", () => {
  test("create + patch + delete a ship round-trips through the DB", async () => {
    await loginAs({ username: "admin5", password: "adminpass5", role: "ADMIN" });
    const manufacturerId = await jupiterId();

    const createRes = await adminShipsPOST(
      buildRequest({
        method: "POST",
        body: {
          name: "Test Cruiser",
          title: "Test Title",
          img: "/ships/test_cruiser_a.png",
          type: "Cruiser",
          variant: "A",
          variantName: "Test Variant",
          hasVariants: false,
          manufacturerId,
          row: "Front",
          commandPoints: 5,
          serviceLimit: 4,
        },
      }),
    );
    const { status: createStatus, json: createJson } = await readResponse<{ id: number }>(createRes);
    expect(createStatus).toBe(200);
    expect(typeof createJson.id).toBe("number");

    const patchRes = await adminShipsPATCH(
      buildRequest({ method: "PATCH", body: { title: "Updated Title", commandPoints: 7 } }),
      { params: Promise.resolve({ id: String(createJson.id) }) },
    );
    expect(patchRes.status).toBe(200);

    const updated = await prismaTest.ship.findUnique({ where: { id: createJson.id } });
    expect(updated!.title).toBe("Updated Title");
    expect(updated!.commandPoints).toBe(7);

    const deleteRes = await adminShipsDELETE(
      buildRequest({ method: "DELETE" }),
      { params: Promise.resolve({ id: String(createJson.id) }) },
    );
    expect(deleteRes.status).toBe(200);

    const afterDelete = await prismaTest.ship.findUnique({ where: { id: createJson.id } });
    expect(afterDelete).toBeNull();
  });

  test("rejects a duplicate (name, variant)", async () => {
    await loginAs({ username: "admin6", password: "adminpass6", role: "ADMIN" });
    const manufacturerId = await jupiterId();
    // The seeded catalogue contains AT021 variant A; reuse it to force a clash.
    const res = await adminShipsPOST(
      buildRequest({
        method: "POST",
        body: {
          name: "AT021",
          title: "duplicate",
          img: "/ships/at021_a.png",
          type: "Fighter",
          variant: "A",
          variantName: "duplicate",
          hasVariants: true,
          manufacturerId,
          row: "Front",
          commandPoints: 1,
          serviceLimit: 1,
        },
      }),
    );
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/already exists/i);
  });

  test("rejects an invalid enum value", async () => {
    await loginAs({ username: "admin7", password: "adminpass7", role: "ADMIN" });
    const manufacturerId = await jupiterId();
    const res = await adminShipsPOST(
      buildRequest({
        method: "POST",
        body: {
          name: "BadEnumShip",
          title: "x",
          img: "x",
          type: "NotAType",
          variant: "A",
          variantName: "x",
          hasVariants: false,
          manufacturerId,
          row: "Front",
          commandPoints: 1,
          serviceLimit: 1,
        },
      }),
    );
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/unknown ship type/i);
  });

  test("accepts an empty img and the resolver falls back to the type icon", async () => {
    await loginAs({ username: "admin8", password: "adminpass8", role: "ADMIN" });
    const manufacturerId = await jupiterId();

    const createRes = await adminShipsPOST(
      buildRequest({
        method: "POST",
        body: {
          name: "ImglessCruiser",
          title: "no img",
          img: "",
          type: "Cruiser",
          variant: "A",
          variantName: "x",
          hasVariants: false,
          manufacturerId,
          row: "Front",
          commandPoints: 1,
          serviceLimit: 1,
        },
      }),
    );
    const { status, json } = await readResponse<{ id: number }>(createRes);
    expect(status).toBe(200);

    // The DB column should hold the empty string verbatim — the fallback happens
    // in the mapper, not on write.
    const row = await prismaTest.ship.findUnique({ where: { id: json.id } });
    expect(row!.img).toBe("");

    // And mapShips() should resolve it to the per-type icon.
    const { mapShips, shipInclude } = await import("@/lib/shipMapper");
    const all = await prismaTest.ship.findMany({
      include: shipInclude,
      where: { id: json.id },
    });
    const mapped = mapShips(all);
    expect(mapped[0].img).toBe("/ships/classes/cruiser.svg");

    // Clean up so cross-file tests (e.g. tests/api/ships.test.ts) that walk
    // the entire seeded catalogue don't see this row. cleanUserData() doesn't
    // touch Ship since it lives in the catalogue layer.
    await prismaTest.ship.delete({ where: { id: json.id } });
  });

  test("rejects a non-existent manufacturerId", async () => {
    await loginAs({ username: "admin9", password: "adminpass9", role: "ADMIN" });
    const res = await adminShipsPOST(
      buildRequest({
        method: "POST",
        body: {
          name: "GhostManu",
          title: "x",
          img: "x",
          type: "Cruiser",
          variant: "A",
          variantName: "x",
          hasVariants: false,
          manufacturerId: 999_999,
          row: "Front",
          commandPoints: 1,
          serviceLimit: 1,
        },
      }),
    );
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/manufacturer/i);
  });
});

// ----------------------------------------------------------------------------
// /api/admin/manufacturers — runtime-editable manufacturer table
// ----------------------------------------------------------------------------

describe("admin manufacturer CRUD", () => {
  test("GET — anonymous gets 401, regular user gets 403", async () => {
    setActiveCookies({});
    const anonRes = await adminManufacturersGET();
    expect(anonRes.status).toBe(401);

    await loginAs({ username: "manuregular", password: "regularpass1" });
    const userRes = await adminManufacturersGET();
    expect(userRes.status).toBe(403);
  });

  test("create + rename + delete a manufacturer round-trips", async () => {
    await loginAs({ username: "manuadmin1", password: "adminpass1", role: "ADMIN" });

    // Create
    const createRes = await adminManufacturersPOST(
      buildRequest({ method: "POST", body: { name: "Test Foundry" } }),
    );
    const { status: createStatus, json: createJson } = await readResponse<{ id: number; name: string }>(createRes);
    expect(createStatus).toBe(200);
    expect(createJson.name).toBe("Test Foundry");
    expect(typeof createJson.id).toBe("number");

    // Rename
    const patchRes = await adminManufacturersPATCH(
      buildRequest({ method: "PATCH", body: { name: "Renamed Foundry" } }),
      { params: Promise.resolve({ id: String(createJson.id) }) },
    );
    expect(patchRes.status).toBe(200);

    const renamed = await prismaTest.manufacturer.findUnique({ where: { id: createJson.id } });
    expect(renamed!.name).toBe("Renamed Foundry");

    // Delete
    const deleteRes = await adminManufacturersDELETE(
      buildRequest({ method: "DELETE" }),
      { params: Promise.resolve({ id: String(createJson.id) }) },
    );
    expect(deleteRes.status).toBe(200);

    const afterDelete = await prismaTest.manufacturer.findUnique({ where: { id: createJson.id } });
    expect(afterDelete).toBeNull();
  });

  test("rejects a duplicate manufacturer name", async () => {
    await loginAs({ username: "manuadmin2", password: "adminpass2", role: "ADMIN" });
    // The seed already inserted "Jupiter Industry"; re-creating it must fail.
    const res = await adminManufacturersPOST(
      buildRequest({ method: "POST", body: { name: "Jupiter Industry" } }),
    );
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    expect(json.error).toMatch(/already exists/i);
  });

  test("refuses to delete a manufacturer that still has ships", async () => {
    await loginAs({ username: "manuadmin3", password: "adminpass3", role: "ADMIN" });
    // Jupiter Industry is referenced by the seeded catalogue.
    const jupiter = await prismaTest.manufacturer.findUnique({ where: { name: "Jupiter Industry" } });
    const res = await adminManufacturersDELETE(
      buildRequest({ method: "DELETE" }),
      { params: Promise.resolve({ id: String(jupiter!.id) }) },
    );
    const { status, json } = await readResponse<{ error: string }>(res);
    expect(status).toBe(400);
    // Server should report the count of referencing ships so the UI can
    // tell the admin why the delete failed.
    expect(json.error).toMatch(/ship/i);
  });
});

// ----------------------------------------------------------------------------
// /api/admin/.../modules + /api/admin/modules/.../subsystems
// ----------------------------------------------------------------------------

describe("admin module + subsystem CRUD", () => {
  // Use a fresh test ship per test so we don't bleed state into other test
  // files that walk the seeded catalogue.
  async function createTestShip(name: string) {
    const manufacturerId = await jupiterId();
    return prismaTest.ship.create({
      data: {
        name,
        title: "Test",
        img: "",
        type: "Carrier",
        variant: "A",
        variantName: "x",
        hasVariants: false,
        manufacturerId,
        row: "Back",
        commandPoints: 1,
        serviceLimit: 1,
      },
    });
  }

  test("create + patch + delete a module on a ship round-trips", async () => {
    await loginAs({ username: "modadmin1", password: "adminpass1", role: "ADMIN" });
    const ship = await createTestShip("ModuleTestShip1");

    const createRes = await adminShipModulesPOST(
      buildRequest({
        method: "POST",
        body: { kind: "weapon", system: "M1", name: "Test Weapon", hp: 100, antiship: 50 },
      }),
      { params: Promise.resolve({ id: String(ship.id) }) },
    );
    const { status: cs, json: cj } = await readResponse<{ id: number }>(createRes);
    expect(cs).toBe(200);
    expect(typeof cj.id).toBe("number");

    const patchRes = await adminModulesPATCH(
      buildRequest({ method: "PATCH", body: { hp: 200, antiship: 75 } }),
      { params: Promise.resolve({ id: String(cj.id) }) },
    );
    expect(patchRes.status).toBe(200);

    const updated = await prismaTest.shipModule.findUnique({ where: { id: cj.id } });
    expect(updated!.hp).toBe(200);
    expect(updated!.antiship).toBe(75);

    const deleteRes = await adminModulesDELETE(
      buildRequest({ method: "DELETE" }),
      { params: Promise.resolve({ id: String(cj.id) }) },
    );
    expect(deleteRes.status).toBe(200);

    const afterDelete = await prismaTest.shipModule.findUnique({ where: { id: cj.id } });
    expect(afterDelete).toBeNull();

    // Clean up the test ship.
    await prismaTest.ship.delete({ where: { id: ship.id } });
  });

  test("CV3000 M1 case: create a module with a Large Fighter and a Corvette hangar, edit capacities", async () => {
    // The acceptance test for hangar editing — one module, two hangar
    // subsystems with different aircraft types and capacities. This is the
    // exact shape of the CV3000's M1 module in the seed data.
    await loginAs({ username: "modadmin2", password: "adminpass2", role: "ADMIN" });
    const ship = await createTestShip("ModuleTestShipCV3000");

    const moduleRes = await adminShipModulesPOST(
      buildRequest({
        method: "POST",
        body: { kind: "weapon", system: "M1", name: "Test Hangar Module" },
      }),
      { params: Promise.resolve({ id: String(ship.id) }) },
    );
    const { json: mj } = await readResponse<{ id: number }>(moduleRes);

    // First subsystem: 5x Large Fighter.
    const sub1Res = await adminSubsystemsPOST(
      buildRequest({
        method: "POST",
        body: {
          count: 1,
          title: "Large Fighter Bay",
          name: "LFB",
          kind: "hanger",
          hanger: "Large Fighter",
          capacity: 5,
        },
      }),
      { params: Promise.resolve({ id: String(mj.id) }) },
    );
    const { status: s1Status, json: s1Json } = await readResponse<{ id: number }>(sub1Res);
    expect(s1Status).toBe(200);

    // Second subsystem: 3x Corvette.
    const sub2Res = await adminSubsystemsPOST(
      buildRequest({
        method: "POST",
        body: {
          count: 1,
          title: "Corvette Bay",
          name: "CB",
          kind: "hanger",
          hanger: "Corvette",
          capacity: 3,
        },
      }),
      { params: Promise.resolve({ id: String(mj.id) }) },
    );
    const { status: s2Status, json: s2Json } = await readResponse<{ id: number }>(sub2Res);
    expect(s2Status).toBe(200);

    // Verify both rows landed with the right kind / hanger / capacity.
    const sub1 = await prismaTest.subsystem.findUnique({ where: { id: s1Json.id } });
    expect(sub1!.kind).toBe("hanger");
    expect(sub1!.hanger).toBe("Large Fighter");
    expect(sub1!.capacity).toBe(5);

    const sub2 = await prismaTest.subsystem.findUnique({ where: { id: s2Json.id } });
    expect(sub2!.kind).toBe("hanger");
    expect(sub2!.hanger).toBe("Corvette");
    expect(sub2!.capacity).toBe(3);

    // Edit the Large Fighter capacity from 5 to 6 (the regression test for
    // the hangar editor — this is the exact field the user wants flexibility
    // on).
    const editRes = await adminSubsystemsPATCH(
      buildRequest({ method: "PATCH", body: { capacity: 6 } }),
      { params: Promise.resolve({ id: String(s1Json.id) }) },
    );
    expect(editRes.status).toBe(200);
    const editedSub = await prismaTest.subsystem.findUnique({ where: { id: s1Json.id } });
    expect(editedSub!.capacity).toBe(6);

    // Delete the Corvette subsystem and confirm the cascade leaves the Large
    // Fighter row alone.
    const delRes = await adminSubsystemsDELETE(
      buildRequest({ method: "DELETE" }),
      { params: Promise.resolve({ id: String(s2Json.id) }) },
    );
    expect(delRes.status).toBe(200);
    expect(await prismaTest.subsystem.findUnique({ where: { id: s2Json.id } })).toBeNull();
    expect(await prismaTest.subsystem.findUnique({ where: { id: s1Json.id } })).not.toBeNull();

    // Clean up — module cascade removes the remaining subsystem, ship cascade
    // removes the module.
    await prismaTest.ship.delete({ where: { id: ship.id } });
  });

  test("module + subsystem routes are gated on admin role", async () => {
    setActiveCookies({});
    const anonRes = await adminShipModulesPOST(
      buildRequest({ method: "POST", body: {} }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(anonRes.status).toBe(401);

    await loginAs({ username: "modregular", password: "regularpass1" });
    const userRes = await adminShipModulesPOST(
      buildRequest({ method: "POST", body: {} }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(userRes.status).toBe(403);
  });
});
