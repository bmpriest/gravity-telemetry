/**
 * Ship catalogue integrity tests for the v4.0 normalized schema, run against
 * the seeded test database.
 *
 * The invariants we care about now:
 *   1. The legacy /api/ships catalogue maps cleanly to AllShip and exposes the
 *      fields the fleet builder / blueprint tracker rely on (only visible ships,
 *      supercaps carry coded "modules").
 *   2. The rich /api/ships/rich catalogue reconstructs the full
 *      Ship → System → Slot → Module → Weapon → TargetPriority hierarchy.
 *   3. Ship images are either empty (UI falls back to the class icon) or live
 *      under /ships.
 */

import { describe, test, expect } from "vitest";
import { prismaTest } from "../setup/db";
import { mapLegacyShips, legacyShipInclude } from "@/lib/shipMapper";
import { mapRichShips, richShipInclude } from "@/lib/richShipMapper";
import { isSupercapital } from "@/utils/shipModel";

describe("Ship catalogue (DB) — legacy mapper", () => {
  test("only visible ships are served and carry the fleet/tracker fields", async () => {
    const rows = await prismaTest.ship.findMany({ where: { visible: true }, include: legacyShipInclude });
    const ships = mapLegacyShips(rows);

    expect(ships.length).toBeGreaterThan(0);
    // No Base / Utility ships (they're imported hidden).
    expect(ships.every((s) => !["Base", "Large Utility Ship", "Medium Utility Ship", "Small Utility Ship"].includes(s.type))).toBe(true);

    for (const s of ships) {
      expect(typeof s.id).toBe("number");
      expect(typeof s.commandPoints).toBe("number");
      expect(typeof s.serviceLimit).toBe("number");
      if (isSupercapital(s.type)) {
        // Supercaps expose their coded systems as "modules".
        expect(Array.isArray((s as { modules: unknown[] }).modules)).toBe(true);
      }
    }
  });

  test("fighters map aircraft_type → Small/Medium/Large", async () => {
    const rows = await prismaTest.ship.findMany({ where: { visible: true, type: "Fighter" }, include: legacyShipInclude });
    const fighters = mapLegacyShips(rows);
    expect(fighters.length).toBeGreaterThan(0);
    for (const f of fighters) {
      expect(["Small", "Medium", "Large"]).toContain((f as { fighterType: string }).fighterType);
    }
  });
});

describe("Ship catalogue (DB) — rich mapper", () => {
  test("a battleship reconstructs the full system/slot/module/weapon hierarchy", async () => {
    const rows = await prismaTest.ship.findMany({ where: { type: "Battleship" }, include: richShipInclude });
    const ships = mapRichShips(rows);
    expect(ships.length).toBeGreaterThan(0);

    const ship = ships[0];
    expect(ship.systems.length).toBeGreaterThan(0);
    // At least one weapon system with a module that has weapon + target priorities.
    const weaponSystem = ship.systems.find((sys) => sys.modules.some((m) => m.weapon && m.weapon.targetPriorities.length > 0));
    expect(weaponSystem).toBeDefined();
    const mod = weaponSystem!.modules.find((m) => m.weapon)!;
    expect(mod.quantity).toBeGreaterThanOrEqual(1);
    expect(mod.weapon!.targetPriorities[0].shipTypes.length).toBeGreaterThan(0);
  });

  test("coded systems exist only on supercapital ships", async () => {
    const rows = await prismaTest.ship.findMany({ where: { visible: true }, include: richShipInclude });
    const ships = mapRichShips(rows);
    for (const s of ships) {
      const hasCoded = s.systems.some((sys) => sys.code);
      if (hasCoded) expect(isSupercapital(s.type)).toBe(true);
    }
  });
});

describe("Ship catalogue (DB) — images", () => {
  test("every ship image is empty or lives under /ships", async () => {
    const ships = await prismaTest.ship.findMany({ select: { img: true } });
    const wrong = ships.filter((s) => s.img !== "" && !s.img.startsWith("/ships/"));
    expect(wrong).toEqual([]);
  });
});
