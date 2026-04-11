/**
 * User data route tests — /api/blueprints, /api/fleets, /api/mail.
 *
 * Three things matter for these endpoints:
 *   1. They reject anonymous requests outright (these features are login-only).
 *   2. They scope reads and writes to the current user — one user must never
 *      be able to read, overwrite, or delete another user's data, even by
 *      guessing IDs. We test this with two users in the same case.
 *   3. The serialization layer round-trips correctly: writing a payload then
 *      reading it back yields the same logical structure.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { GET as blueprintsGET, POST as blueprintsPOST } from "@/app/api/blueprints/route";
import { DELETE as blueprintsDELETE } from "@/app/api/blueprints/[index]/route";
import { GET as fleetsGET, POST as fleetsPOST } from "@/app/api/fleets/route";
import { DELETE as fleetsDELETE } from "@/app/api/fleets/[id]/route";
import { GET as mailGET, POST as mailPOST } from "@/app/api/mail/route";
import { GET as singleMailGET, DELETE as mailDELETE } from "@/app/api/mail/[id]/route";
import { prismaTest, cleanUserData, loginAs } from "../setup/db";
import { buildRequest, readResponse } from "../setup/api";
import { setActiveCookies, getActiveCookies } from "../setup/cookies";

beforeEach(async () => {
  await cleanUserData();
});

// We need a real ship id for the blueprint payloads. The seed populates the
// catalogue, so any deterministic name works — we look it up once per test.
async function pickShipWithModule() {
  const ship = await prismaTest.ship.findFirst({
    where: { modules: { some: {} } },
    include: { modules: { take: 1 } },
  });
  if (!ship) throw new Error("test fixture: no ship with modules in seeded catalogue");
  return ship;
}

// ----------------------------------------------------------------------------
// /api/blueprints
// ----------------------------------------------------------------------------

describe("/api/blueprints", () => {
  test("anonymous GET → 401", async () => {
    setActiveCookies({});
    const res = await blueprintsGET();
    expect(res.status).toBe(401);
  });

  test("POST then GET round-trips a blueprint account with ships and modules", async () => {
    await loginAs({ username: "bp_alice", password: "bp_alicepass1" });
    const ship = await pickShipWithModule();

    const writeRes = await blueprintsPOST(buildRequest({
      method: "POST",
      body: {
        accountIndex: 0,
        accountName: "Main",
        unassignedTp: [10, 20, 30, 40, 50, 60, 70, 80, 90],
        ships: [
          {
            shipId: ship.id,
            unlocked: true,
            techPoints: 5,
            mirrorTechPoints: false,
            modules: [{ moduleId: ship.modules[0].id, unlocked: true }],
          },
        ],
      },
    }));
    expect(writeRes.status).toBe(200);

    const readRes = await blueprintsGET();
    interface AccountOut {
      accountIndex: number;
      accountName: string;
      unassignedTp: number[];
      ships: { shipId: number; unlocked: boolean; modules: { moduleId: number; unlocked: boolean }[] }[];
    }
    const { json } = await readResponse<{ data: AccountOut[] }>(readRes);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].accountName).toBe("Main");
    expect(json.data[0].unassignedTp).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(json.data[0].ships).toHaveLength(1);
    expect(json.data[0].ships[0].shipId).toBe(ship.id);
    expect(json.data[0].ships[0].modules).toHaveLength(1);
    expect(json.data[0].ships[0].modules[0].moduleId).toBe(ship.modules[0].id);
  });

  test("one user cannot see another user's blueprints", async () => {
    const ship = await pickShipWithModule();

    // Alice writes a blueprint.
    await loginAs({ username: "bp_isolated_alice", password: "bp_isolated_a1" });
    await blueprintsPOST(buildRequest({
      method: "POST",
      body: {
        accountIndex: 0,
        accountName: "Alice",
        unassignedTp: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ships: [{ shipId: ship.id, unlocked: true, techPoints: 0, mirrorTechPoints: false, modules: [] }],
      },
    }));

    // Bob logs in (cookie jar replaced) and reads — sees nothing.
    setActiveCookies({});
    await loginAs({ username: "bp_isolated_bob", password: "bp_isolated_b1" });
    const res = await blueprintsGET();
    const { json } = await readResponse<{ data: unknown[] }>(res);
    expect(json.data).toEqual([]);
  });

  test("DELETE re-numbers later accounts to keep indices contiguous", async () => {
    await loginAs({ username: "bp_renum", password: "bp_renumpass1" });
    const ship = await pickShipWithModule();

    // Three accounts at indexes 0, 1, 2.
    for (let i = 0; i < 3; i++) {
      await blueprintsPOST(buildRequest({
        method: "POST",
        body: {
          accountIndex: i,
          accountName: `Account ${i}`,
          unassignedTp: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          ships: [{ shipId: ship.id, unlocked: false, techPoints: 0, mirrorTechPoints: false, modules: [] }],
        },
      }));
    }

    // Delete the middle one.
    const delRes = await blueprintsDELETE(buildRequest({ method: "DELETE" }), {
      params: Promise.resolve({ index: "1" }),
    });
    expect(delRes.status).toBe(200);

    const readRes = await blueprintsGET();
    interface Acc { accountIndex: number; accountName: string }
    const { json } = await readResponse<{ data: Acc[] }>(readRes);
    expect(json.data.map((a) => [a.accountIndex, a.accountName])).toEqual([
      [0, "Account 0"],
      [1, "Account 2"], // formerly index 2, shifted down
    ]);
  });
});

// ----------------------------------------------------------------------------
// /api/fleets
// ----------------------------------------------------------------------------

describe("/api/fleets", () => {
  test("anonymous GET → 401", async () => {
    setActiveCookies({});
    const res = await fleetsGET();
    expect(res.status).toBe(401);
  });

  test("POST then GET round-trips a fleet with rows and a carrier load", async () => {
    await loginAs({ username: "fleet_alice", password: "fleet_apass1" });
    const ship = await pickShipWithModule();

    const writeRes = await fleetsPOST(buildRequest({
      method: "POST",
      body: {
        id: "fleet-1",
        name: "First Fleet",
        rows: {
          front: [{ id: "inst-front-1", shipId: ship.id, variant: ship.variant }],
          middle: [],
          back: [{ id: "inst-back-1", shipId: ship.id, variant: ship.variant }],
          reinforcements: [{ id: "inst-reinf-1", shipId: ship.id, variant: ship.variant }],
        },
        carrierLoads: {
          "inst-front-1": [{ id: "inst-carried-1", shipId: ship.id, variant: ship.variant }],
        },
      },
    }));
    expect(writeRes.status).toBe(200);

    const readRes = await fleetsGET();
    interface FleetOut {
      id: string;
      name: string;
      rows: { front: { id: string }[]; middle: { id: string }[]; back: { id: string }[]; reinforcements: { id: string }[] };
      carrierLoads: Record<string, { id: string }[]>;
    }
    const { json } = await readResponse<{ data: FleetOut[] }>(readRes);
    expect(json.data).toHaveLength(1);
    const fleet = json.data[0];
    expect(fleet.id).toBe("fleet-1");
    expect(fleet.name).toBe("First Fleet");
    expect(fleet.rows.front.map((i) => i.id)).toEqual(["inst-front-1"]);
    expect(fleet.rows.back.map((i) => i.id)).toEqual(["inst-back-1"]);
    expect(fleet.rows.reinforcements.map((i) => i.id)).toEqual(["inst-reinf-1"]);
    expect(fleet.carrierLoads["inst-front-1"]?.map((i) => i.id)).toEqual(["inst-carried-1"]);
  });

  test("a user cannot overwrite another user's fleet by re-using its id", async () => {
    const ship = await pickShipWithModule();

    await loginAs({ username: "fleet_owner", password: "fleet_ownerpass1" });
    await fleetsPOST(buildRequest({
      method: "POST",
      body: {
        id: "shared-id",
        name: "Owned by owner",
        rows: { front: [{ id: "i1", shipId: ship.id, variant: ship.variant }], middle: [], back: [], reinforcements: [] },
        carrierLoads: {},
      },
    }));

    setActiveCookies({});
    await loginAs({ username: "fleet_attacker", password: "fleet_attackerpass1" });
    const res = await fleetsPOST(buildRequest({
      method: "POST",
      body: {
        id: "shared-id",
        name: "Attacker overwrite",
        rows: { front: [{ id: "i2", shipId: ship.id, variant: ship.variant }], middle: [], back: [], reinforcements: [] },
        carrierLoads: {},
      },
    }));
    expect(res.status).toBe(400);

    // The original owner's fleet is untouched.
    const owner = await prismaTest.user.findUnique({ where: { username: "fleet_owner" } });
    const fleet = await prismaTest.savedFleet.findUnique({ where: { id: "shared-id" } });
    expect(fleet?.userId).toBe(owner!.id);
    expect(fleet?.name).toBe("Owned by owner");
  });

  test("DELETE refuses to remove a fleet owned by another user", async () => {
    const ship = await pickShipWithModule();

    await loginAs({ username: "fleet_del_owner", password: "fleet_del_ownerpass1" });
    await fleetsPOST(buildRequest({
      method: "POST",
      body: {
        id: "del-id",
        name: "Don't delete me",
        rows: { front: [{ id: "i", shipId: ship.id, variant: ship.variant }], middle: [], back: [], reinforcements: [] },
        carrierLoads: {},
      },
    }));

    setActiveCookies({});
    await loginAs({ username: "fleet_del_attacker", password: "fleet_del_attackerpass1" });
    const res = await fleetsDELETE(buildRequest({ method: "DELETE" }), { params: Promise.resolve({ id: "del-id" }) });
    expect(res.status).toBe(400);

    expect(await prismaTest.savedFleet.findUnique({ where: { id: "del-id" } })).not.toBeNull();
  });
});

// ----------------------------------------------------------------------------
// /api/mail
// ----------------------------------------------------------------------------

describe("/api/mail", () => {
  test("anonymous GET → 401", async () => {
    setActiveCookies({});
    const res = await mailGET();
    expect(res.status).toBe(401);
  });

  test("POST creates a mail, GET returns it, single GET returns the same body", async () => {
    await loginAs({ username: "mail_alice", password: "mail_apass1" });

    const writeRes = await mailPOST(buildRequest({
      method: "POST",
      body: {
        template: {
          name: "Welcome",
          ops: [
            { insert: "Hello, " },
            { insert: "captain", attributes: { color: "#ff0000" } },
            { insert: "!\n" },
          ],
        },
      },
    }));
    interface SaveOut { saved: { id: string; name: string; ops: { insert: string; attributes?: { color: string } }[] } }
    const { json: writeJson } = await readResponse<SaveOut>(writeRes);
    expect(writeJson.saved.name).toBe("Welcome");
    // Round trip preserves both plain inserts and color attributes.
    expect(writeJson.saved.ops).toHaveLength(3);
    expect(writeJson.saved.ops[1].attributes?.color).toBe("#ff0000");

    const listRes = await mailGET();
    const { json: listJson } = await readResponse<{ data: { id: string; name: string }[] }>(listRes);
    expect(listJson.data).toHaveLength(1);

    const singleRes = await singleMailGET(buildRequest({}), { params: Promise.resolve({ id: writeJson.saved.id }) });
    const { json: singleJson } = await readResponse<{ data: { name: string } }>(singleRes);
    expect(singleJson.data.name).toBe("Welcome");
  });

  test("POST with the same name updates the existing mail in place", async () => {
    await loginAs({ username: "mail_update", password: "mail_updatepass1" });

    await mailPOST(buildRequest({
      method: "POST",
      body: { template: { name: "Briefing", ops: [{ insert: "v1\n" }] } },
    }));
    await mailPOST(buildRequest({
      method: "POST",
      body: { template: { name: "Briefing", ops: [{ insert: "v2\n" }] } },
    }));

    const user = await prismaTest.user.findUnique({ where: { username: "mail_update" } });
    const mails = await prismaTest.savedMail.findMany({ where: { userId: user!.id } });
    expect(mails).toHaveLength(1);
    expect(mails[0].name).toBe("Briefing");
  });

  test("one user cannot read another user's mail by id", async () => {
    await loginAs({ username: "mail_owner", password: "mail_ownerpass1" });
    const writeRes = await mailPOST(buildRequest({
      method: "POST",
      body: { template: { name: "Private", ops: [{ insert: "secret\n" }] } },
    }));
    const { json } = await readResponse<{ saved: { id: string } }>(writeRes);
    const mailId = json.saved.id;

    setActiveCookies({});
    await loginAs({ username: "mail_attacker", password: "mail_attackerpass1" });
    const res = await singleMailGET(buildRequest({}), { params: Promise.resolve({ id: mailId }) });
    expect(res.status).toBe(400);
  });

  test("DELETE removes a mail and refuses to delete one owned by someone else", async () => {
    await loginAs({ username: "mail_del_owner", password: "mail_del_ownerpass1" });
    const writeRes = await mailPOST(buildRequest({
      method: "POST",
      body: { template: { name: "Disposable", ops: [{ insert: "trash\n" }] } },
    }));
    const { json } = await readResponse<{ saved: { id: string } }>(writeRes);
    const mailId = json.saved.id;

    setActiveCookies({});
    await loginAs({ username: "mail_del_attacker", password: "mail_del_attackerpass1" });
    const attackerDel = await mailDELETE(buildRequest({ method: "DELETE" }), { params: Promise.resolve({ id: mailId }) });
    expect(attackerDel.status).toBe(400);

    // Switch back to owner — the cookie jar still works because login mints
    // a fresh session row for that username.
    setActiveCookies({});
    await loginAs({ username: "mail_del_owner_2", password: "mail_del_ownerpass2" });
    // The owner_2 user is a fresh user — we re-establish ownership context by
    // using the prismaTest client to confirm the original mail is still there
    // and then the original owner can finish deleting.
    const stillThere = await prismaTest.savedMail.findUnique({ where: { id: mailId } });
    expect(stillThere).not.toBeNull();

    // Re-issue ownership for the original mail to mail_del_owner_2 and delete.
    const newOwner = await prismaTest.user.findUnique({ where: { username: "mail_del_owner_2" } });
    await prismaTest.savedMail.update({ where: { id: mailId }, data: { userId: newOwner!.id } });
    const ownerDel = await mailDELETE(buildRequest({ method: "DELETE" }), { params: Promise.resolve({ id: mailId }) });
    expect(ownerDel.status).toBe(200);
    expect(await prismaTest.savedMail.findUnique({ where: { id: mailId } })).toBeNull();
  });
});

// ----------------------------------------------------------------------------
// Cookie jar sanity check — make sure setActiveCookies({}) actually clears the
// session, so the anonymous-401 tests above are testing what we think they are.
// ----------------------------------------------------------------------------

describe("test cookie jar", () => {
  test("setActiveCookies({}) leaves no gt_session in the jar", () => {
    setActiveCookies({});
    expect(getActiveCookies().gt_session).toBeUndefined();
  });
});
