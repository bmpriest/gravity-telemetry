import { describe, test, expect } from "vitest";
import { data } from "../../prisma/seed-data";
import { credits } from "@/utils/credits";
import { shipNameToImage } from "@/utils/ships";
import type { AllModule } from "@/utils/ships";

describe("Seed Data Tests", () => {
  test("Super capital ship module subsystem stats should add up to overall module stats", () => {
    const modules = data
      .filter((ship) => "modules" in ship)
      .flatMap((ship) => ("modules" in ship ? ship.modules.map((mod) => [ship.name, mod] as [string, AllModule]) : []));

    const invalidSubsystems: [string, string, string, string][] = [];
    for (const [ship, mod] of modules) {
      if (mod.type === "unknown") continue;
      if (!("antiship" in mod.stats) || !("antiair" in mod.stats) || !("siege" in mod.stats)) continue;
      if (mod.subsystems.every((subsystem) => !("stats" in subsystem))) continue;

      const stats = ["antiship", "antiair", "siege"] as (keyof typeof mod.stats)[];
      for (const stat of stats) {
        const overallStat = mod.stats[stat];
        if (overallStat === null) continue;
        // Skip when any subsystem has null stats or is missing this scope from its target priority.
        const skip = mod.subsystems.some((subsystem) => {
          if (!("stats" in subsystem)) return false;
          if (subsystem.stats === null) return true;
          if (Array.isArray(subsystem.stats.targetPriority)) return true;
          return !(stat in subsystem.stats.targetPriority);
        });
        if (skip) continue;

        const subsystemStat = mod.subsystems.reduce((acc, curr) => {
          if (!("stats" in curr) || curr.stats === null) return acc;
          if (Array.isArray(curr.stats.targetPriority)) return acc;

          const tp = curr.stats.targetPriority as Record<string, { damage: number } | undefined>;
          const currentTargetPriority = tp[stat];
          if (!currentTargetPriority) return acc;

          return acc + currentTargetPriority.damage;
        }, 0);

        if (overallStat !== subsystemStat) invalidSubsystems.push([ship, stat, mod.system, mod.name]);
      }
    }

    expect(invalidSubsystems).toMatchObject([]);
  });

  test("Super capital ship module sources should be in credits", () => {
    const modules = data
      .filter((ship) => "modules" in ship)
      .flatMap((ship) => ("modules" in ship ? ship.modules.map((mod) => [ship.name, mod] as [string, AllModule]) : []));

    const missingCredits: [string, string, string, string][] = [];
    for (const [ship, mod] of modules) {
      if (mod.type === "unknown" || !mod.sourcedFrom) continue;

      for (const source of mod.sourcedFrom) {
        if (!credits.find((person) => person.name === source)) missingCredits.push([ship, mod.system, mod.name, source]);
      }
    }

    expect(missingCredits).toMatchObject([]);
  });

  test("Ship image paths should follow naming schema", () => {
    const wrongImages: [string, string, string, string][] = [];
    for (const ship of data) {
      const expectedPath = `/ships/${shipNameToImage(ship.name)}_${ship.variant.toLowerCase()}.png`;
      const actualPath = ship.img;
      if (actualPath !== expectedPath) wrongImages.push([ship.name, ship.variant, actualPath, expectedPath]);
    }

    expect(wrongImages).toMatchObject([]);
  });
});
