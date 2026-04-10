/**
 * Roundtrip test for the relational blueprint store: writes account → unlocks
 * → module unlocks → unassigned-tp rows in one transaction, then reads them
 * back and verifies cascade-on-account-delete clears all children.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, resetUserData, type TestDb } from "../setup/testdb";
import { ShipType } from "@prisma/client";

let db: TestDb;
let userId: string;
let shipId: number;
let moduleId: number;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db.stop();
});

beforeEach(async () => {
  await resetUserData(db.prisma);
  // Seed minimal ship/module data — just enough to satisfy FKs.
  // ID is seed-controlled (not autoincrement).
  await db.prisma.ship.deleteMany();
  const ship = await db.prisma.ship.create({
    data: {
      id: 1,
      name: "Test Ship",
      title: "Tester",
      img: "/ships/test_a.png",
      type: "Battlecruiser",
      variant: "A",
      variantName: "",
      hasVariants: false,
      manufacturer: "JupiterIndustry",
      row: "Front",
      commandPoints: 100,
      serviceLimit: 5,
    },
  });
  shipId = ship.id;
  const mod = await db.prisma.module.create({
    data: {
      shipId: ship.id,
      system: "M1",
      kind: "weapon",
      isDefault: true,
      img: "/weapons/icons/test.png",
      name: "Test Weapon",
      hp: 1000,
    },
  });
  moduleId = mod.id;
  const user = await db.prisma.user.create({
    data: { username: "blueprint-user", passwordHash: "x" },
  });
  userId = user.id;
});

describe("blueprint roundtrip", () => {
  test("save → read returns identical structure", async () => {
    const account = await db.prisma.blueprintAccount.create({
      data: { userId, accountIndex: 0, accountName: "Main" },
    });
    const unlock = await db.prisma.blueprintShipUnlock.create({
      data: { accountId: account.id, shipId, techPoints: 50 },
    });
    await db.prisma.blueprintModuleUnlock.create({
      data: { shipUnlockId: unlock.id, moduleId },
    });
    await db.prisma.blueprintUnassignedTp.create({
      data: { accountId: account.id, shipType: ShipType.Battlecruiser, techPoints: 25 },
    });

    const read = await db.prisma.blueprintAccount.findUnique({
      where: { id: account.id },
      include: {
        shipUnlocks: { include: { moduleUnlocks: true } },
        unassignedTp: true,
      },
    });
    expect(read).not.toBeNull();
    expect(read?.shipUnlocks).toHaveLength(1);
    expect(read?.shipUnlocks[0].techPoints).toBe(50);
    expect(read?.shipUnlocks[0].moduleUnlocks).toHaveLength(1);
    expect(read?.shipUnlocks[0].moduleUnlocks[0].moduleId).toBe(moduleId);
    expect(read?.unassignedTp).toHaveLength(1);
    expect(read?.unassignedTp[0].techPoints).toBe(25);
  });

  test("unique (userId, accountIndex) prevents duplicates", async () => {
    await db.prisma.blueprintAccount.create({
      data: { userId, accountIndex: 0, accountName: "First" },
    });
    await expect(
      db.prisma.blueprintAccount.create({
        data: { userId, accountIndex: 0, accountName: "Second" },
      })
    ).rejects.toThrow();
  });

  test("deleting account cascades to ship/module unlocks and unassignedTp", async () => {
    const account = await db.prisma.blueprintAccount.create({
      data: { userId, accountIndex: 0, accountName: "ToDelete" },
    });
    const unlock = await db.prisma.blueprintShipUnlock.create({
      data: { accountId: account.id, shipId, techPoints: 10 },
    });
    await db.prisma.blueprintModuleUnlock.create({
      data: { shipUnlockId: unlock.id, moduleId },
    });
    await db.prisma.blueprintUnassignedTp.create({
      data: { accountId: account.id, shipType: ShipType.Battlecruiser, techPoints: 5 },
    });

    await db.prisma.blueprintAccount.delete({ where: { id: account.id } });

    expect(await db.prisma.blueprintShipUnlock.count()).toBe(0);
    expect(await db.prisma.blueprintModuleUnlock.count()).toBe(0);
    expect(await db.prisma.blueprintUnassignedTp.count()).toBe(0);
  });

  test("deleting user cascades to all blueprint accounts", async () => {
    await db.prisma.blueprintAccount.create({
      data: { userId, accountIndex: 0, accountName: "Acc0" },
    });
    await db.prisma.blueprintAccount.create({
      data: { userId, accountIndex: 1, accountName: "Acc1" },
    });
    await db.prisma.user.delete({ where: { id: userId } });
    expect(await db.prisma.blueprintAccount.count()).toBe(0);
  });
});
