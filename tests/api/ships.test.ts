/**
 * Ship catalogue integrity tests, run against the seeded test database.
 *
 * The legacy version of this file walked the in-memory data/ships.ts literal
 * via the typed `AllShip` union. After the migration to Postgres, that import
 * is purely a seed source — we should be checking the data we actually serve,
 * which lives in the DB. So all three checks now query Prisma directly.
 *
 * The three invariants we care about:
 *   1. Subsystem damage adds up to the parent module's antiship/antiair/siege.
 *      Only enforced for stats that every weapon/attack-UAV subsystem on the
 *      module reports — modules with mixed-purpose subsystems (e.g. one
 *      antiship turret + one antiair turret) get a free pass on the missing
 *      category, because there's no contributor to sum.
 *   2. Every ModuleSource.name corresponds to a real entry in utils/credits.ts.
 *   3. Every Ship.img matches the {shipNameToImage(name)}_{variant.lower}.png
 *      naming convention used by the public asset folder.
 */

import { describe, test, expect } from "vitest";
import { prismaTest } from "../setup/db";
import { credits } from "@/utils/credits";
import { shipNameToImage } from "@/utils/ships";

describe("Ship catalogue (DB)", () => {
  test("module antiship/antiair/siege totals match the sum of their subsystems", async () => {
    const modules = await prismaTest.shipModule.findMany({
      where: { kind: "weapon" },
      include: {
        ship: { select: { name: true } },
        subsystems: {
          // Only weapon and (attack/UAV) hanger subsystems carry damage rows.
          // Misc subsystems and aircraft hangers won't have target categories
          // and naturally drop out of the sum.
          include: { targetCategories: true },
        },
      },
    });

    const mismatches: { ship: string; system: string; stat: string; expected: number; actual: number }[] = [];

    for (const mod of modules) {
      const subsystemsWithCategories = mod.subsystems.filter((s) => s.targetCategories.length > 0);
      if (subsystemsWithCategories.length === 0) continue;

      for (const stat of ["antiship", "antiair", "siege"] as const) {
        const overall = mod[stat];
        if (overall === null) continue;

        // Skip stats where some contributing subsystem doesn't measure this
        // category — that mirrors the original test's "can't sum mixed-purpose
        // modules" carve-out.
        const everyContributorReports = subsystemsWithCategories.every((s) =>
          s.targetCategories.some((c) => c.category === stat),
        );
        if (!everyContributorReports) continue;

        // SubsystemTargetCategory.damage is already the rolled-up total
        // contribution for the whole subsystem (i.e. the seed multiplied by
        // `count` before storing it), so we sum the rows directly.
        const summed = subsystemsWithCategories.reduce((acc, sub) => {
          const cat = sub.targetCategories.find((c) => c.category === stat);
          return acc + (cat ? cat.damage : 0);
        }, 0);

        if (summed !== overall) {
          mismatches.push({ ship: mod.ship.name, system: mod.system, stat, expected: overall, actual: summed });
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  test("every module source maps to a real credits entry", async () => {
    const sources = await prismaTest.moduleSource.findMany({
      include: { module: { include: { ship: { select: { name: true } } } } },
    });

    const knownNames = new Set(credits.map((c) => c.name));
    const missing = sources
      .filter((s) => !knownNames.has(s.name))
      .map((s) => ({ ship: s.module.ship.name, system: s.module.system, source: s.name }));

    expect(missing).toEqual([]);
  });

  test("ship image paths follow the {name}_{variant}.png naming schema", async () => {
    const ships = await prismaTest.ship.findMany({ select: { name: true, variant: true, img: true } });

    const wrong = ships
      .map((ship) => {
        const expected = `/ships/${shipNameToImage(ship.name)}_${ship.variant.toLowerCase()}.png`;
        return { ship: ship.name, variant: ship.variant, expected, actual: ship.img };
      })
      .filter((row) => row.expected !== row.actual);

    expect(wrong).toEqual([]);
  });
});
