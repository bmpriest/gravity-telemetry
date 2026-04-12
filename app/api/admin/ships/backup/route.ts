import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { shipInclude } from "@/lib/shipMapper";

/**
 * GET /api/admin/ships/backup — Export all ships and manufacturers as JSON.
 * POST /api/admin/ships/backup — Import ships and manufacturers from JSON.
 */

export async function GET() {
  return handle(async () => {
    await requireAdmin();

    const manufacturers = await prisma.manufacturer.findMany({
      orderBy: { name: "asc" },
    });

    const ships = await prisma.ship.findMany({
      include: {
        ...shipInclude,
      },
      orderBy: [{ name: "asc" }, { variant: "asc" }],
    });

    return { data: { manufacturers, ships } };
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const body = await req.json();

    const { manufacturers, ships } = body;

    if (!Array.isArray(manufacturers) || !Array.isArray(ships)) {
      throw new Error("Invalid backup format. Expected 'manufacturers' and 'ships' arrays.");
    }

    // 1. Upsert manufacturers
    for (const m of manufacturers) {
      await prisma.manufacturer.upsert({
        where: { name: m.name },
        update: {},
        create: { name: m.name },
      });
    }

    // Re-fetch manufacturers to get their IDs
    const dbManufacturers = await prisma.manufacturer.findMany();
    const manufacturerMap = new Map(dbManufacturers.map((m) => [m.name, m.id]));

    // 2. Upsert ships and their nested data
    for (const s of ships) {
      const manufacturerId = manufacturerMap.get(s.manufacturer.name);
      if (!manufacturerId) {
        console.warn(`Skipping ship ${s.name} ${s.variant}: manufacturer ${s.manufacturer.name} not found.`);
        continue;
      }

      const shipData = {
        name: s.name,
        title: s.title,
        img: s.img,
        type: s.type,
        variant: s.variant,
        variantName: s.variantName,
        hasVariants: s.hasVariants,
        manufacturerId,
        row: s.row,
        commandPoints: s.commandPoints,
        serviceLimit: s.serviceLimit,
        fighterType: s.fighterType,
        fightersPerSquadron: s.fightersPerSquadron,
        smallFighterCapacity: s.smallFighterCapacity,
        mediumFighterCapacity: s.mediumFighterCapacity,
        largeFighterCapacity: s.largeFighterCapacity,
        corvetteCapacity: s.corvetteCapacity,
      };

      const existingShip = await prisma.ship.findUnique({
        where: { name_variant: { name: s.name, variant: s.variant } },
      });

      let shipId: number;

      if (existingShip) {
        await prisma.ship.update({
          where: { id: existingShip.id },
          data: shipData,
        });
        shipId = existingShip.id;

        // For simplicity in import, we'll clear existing modules and recreate them.
        // This avoids complex diffing of nested modules/subsystems.
        await prisma.shipModule.deleteMany({ where: { shipId } });
      } else {
        const created = await prisma.ship.create({ data: shipData });
        shipId = created.id;
      }

      // Create modules
      if (Array.isArray(s.modules)) {
        for (const mod of s.modules) {
          const createdModule = await prisma.shipModule.create({
            data: {
              shipId,
              kind: mod.kind,
              system: mod.system,
              isDefault: mod.isDefault,
              isUnknown: mod.isUnknown,
              img: mod.img,
              name: mod.name,
              hp: mod.hp,
              antiship: mod.antiship,
              antiair: mod.antiair,
              siege: mod.siege,
              cruise: mod.cruise,
              warp: mod.warp,
              armor: mod.armor,
              extraHp: mod.extraHp,
              energyShield: mod.energyShield,
              hpRecovery: mod.hpRecovery,
              storage: mod.storage,
              sources: {
                create: mod.sources?.map((src: any) => ({ name: src.name })) ?? [],
              },
              subsystems: {
                create: mod.subsystems?.map((sub: any) => ({
                  count: sub.count,
                  title: sub.title,
                  name: sub.name,
                  kind: sub.kind,
                  damageType: sub.damageType,
                  target: sub.target,
                  lockonEfficiency: sub.lockonEfficiency,
                  alpha: sub.alpha,
                  hanger: sub.hanger,
                  capacity: sub.capacity,
                  repair: sub.repair,
                  cooldown: sub.cooldown,
                  lockOnTime: sub.lockOnTime,
                  duration: sub.duration,
                  damageFrequency: sub.damageFrequency,
                  attacksPerRoundA: sub.attacksPerRoundA,
                  attacksPerRoundB: sub.attacksPerRoundB,
                  operationCountA: sub.operationCountA,
                  operationCountB: sub.operationCountB,
                  attributes: {
                    create: sub.attributes?.map((attr: any) => ({ attribute: attr.attribute })) ?? [],
                  },
                  targetCategories: {
                    create: sub.targetCategories?.map((cat: any) => ({
                      category: cat.category,
                      position: cat.position,
                      damage: cat.damage,
                      priorities: {
                        create: cat.priorities?.map((p: any) => ({
                          order: p.order,
                          targetType: p.targetType,
                        })) ?? [],
                      },
                    })) ?? [],
                  },
                  uavPriorities: {
                    create: sub.uavPriorities?.map((p: any) => ({
                      order: p.order,
                      targetType: p.targetType,
                    })) ?? [],
                  },
                })) ?? [],
              },
            },
          });
        }
      }
    }

    return { success: true };
  });
}
