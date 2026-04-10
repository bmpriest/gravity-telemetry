/**
 * Fleet roundtrip: persist a fleet with carrier-loaded ships, read back via
 * the wire-format helper, and verify cascade-delete behavior.
 *
 * `lib/fleets.ts` is `server-only`; we stub the import using vitest's alias
 * before loading it.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { setupTestDb, resetUserData, type TestDb } from "../setup/testdb";

let db: TestDb;
let fleetToWire: typeof import("@/lib/fleets")["fleetToWire"];
let userId: string;
let shipId: number;

beforeAll(async () => {
  db = await setupTestDb();
  ({ fleetToWire } = await import("@/lib/fleets"));
});

afterAll(async () => {
  await db.stop();
});

beforeEach(async () => {
  await resetUserData(db.prisma);
  await db.prisma.ship.deleteMany();
  const ship = await db.prisma.ship.create({
    data: {
      id: 1,
      name: "Test Carrier",
      title: "Carrier",
      img: "/ships/test_a.png",
      type: "Carrier",
      variant: "A",
      variantName: "",
      hasVariants: false,
      manufacturer: "JupiterIndustry",
      row: "Back",
      commandPoints: 200,
      serviceLimit: 2,
    },
  });
  shipId = ship.id;
  const user = await db.prisma.user.create({
    data: { username: "fleet-user", passwordHash: "x" },
  });
  userId = user.id;
});

describe("fleet roundtrip", () => {
  test("persist + wire conversion preserves rows and carrier loads", async () => {
    const fleet = await db.prisma.fleet.create({
      data: {
        userId,
        name: "Strike Force",
        maxCommandPoints: 600,
      },
    });
    // Front-row carrier instance
    const carrier = await db.prisma.fleetShipInstance.create({
      data: {
        fleetId: fleet.id,
        shipId,
        fleetRow: "front",
        position: 0,
      },
    });
    // A carried ship beneath the carrier
    await db.prisma.fleetShipInstance.create({
      data: {
        fleetId: fleet.id,
        shipId,
        fleetRow: "carried",
        carrierInstanceId: carrier.id,
        position: 0,
      },
    });
    // Reinforcement on its own
    await db.prisma.fleetShipInstance.create({
      data: {
        fleetId: fleet.id,
        shipId,
        fleetRow: "reinforcements",
        position: 1,
      },
    });

    const read = await db.prisma.fleet.findUnique({
      where: { id: fleet.id },
      include: { instances: { include: { ship: { select: { variant: true } } } } },
    });
    expect(read).not.toBeNull();
    const wire = fleetToWire(read!);

    expect(wire.name).toBe("Strike Force");
    expect(wire.maxCommandPoints).toBe(600);
    expect(wire.rows.front).toHaveLength(1);
    expect(wire.rows.front[0].id).toBe(carrier.id);
    expect(wire.rows.middle).toHaveLength(0);
    expect(wire.rows.back).toHaveLength(0);
    expect(wire.rows.reinforcements).toHaveLength(1);
    // Carried ship is not in rows; lives under carrierLoads keyed by parent id.
    expect(wire.carrierLoads[carrier.id]).toHaveLength(1);
  });

  test("deleting fleet cascades to instances", async () => {
    const fleet = await db.prisma.fleet.create({
      data: { userId, name: "Doomed", maxCommandPoints: 400 },
    });
    await db.prisma.fleetShipInstance.create({
      data: { fleetId: fleet.id, shipId, fleetRow: "front", position: 0 },
    });
    await db.prisma.fleet.delete({ where: { id: fleet.id } });
    expect(await db.prisma.fleetShipInstance.count()).toBe(0);
  });

  test("deleting user cascades to fleets and instances", async () => {
    const fleet = await db.prisma.fleet.create({
      data: { userId, name: "X", maxCommandPoints: 400 },
    });
    await db.prisma.fleetShipInstance.create({
      data: { fleetId: fleet.id, shipId, fleetRow: "front", position: 0 },
    });
    await db.prisma.user.delete({ where: { id: userId } });
    expect(await db.prisma.fleet.count()).toBe(0);
    expect(await db.prisma.fleetShipInstance.count()).toBe(0);
  });
});
