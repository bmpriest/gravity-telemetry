/**
 * Seed script — populates the ship catalogue from data/ships.ts and bootstraps
 * an admin user from ADMIN_USERNAME / ADMIN_PASSWORD env vars if no admin exists.
 *
 * Idempotent: safe to re-run. Ships are upserted by [name, variant], existing
 * modules/subsystems for a given ship are wiped and rebuilt on each run so that
 * stale columns don't linger after schema or data changes. Blueprint references
 * remain valid because Ship.id is preserved across runs (we insert explicit ids
 * and bump the autoincrement sequence afterward).
 *
 * The dead `direction`, `scope`, `weight` fields and the `difficulty` const from
 * data/ships.ts are deliberately ignored here — they were leftovers from a
 * removed feature and are not migrated to the database.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { data as shipData } from "../data/ships";

const prisma = new PrismaClient();

// ----------------------------------------------------------------------------
// Enum mapping helpers — convert the human-readable strings used in
// data/ships.ts into the Prisma/Postgres enum identifiers.
// ----------------------------------------------------------------------------

function mapShipType(t: string): "Fighter" | "Corvette" | "Frigate" | "Destroyer" | "Cruiser" | "Battlecruiser" | "AuxiliaryShip" | "Carrier" | "Battleship" {
  if (t === "Auxiliary Ship") return "AuxiliaryShip";
  if (t === "Fighter" || t === "Corvette" || t === "Frigate" || t === "Destroyer" || t === "Cruiser" || t === "Battlecruiser" || t === "Carrier" || t === "Battleship") return t;
  throw new Error(`Unknown ship type: ${t}`);
}

// The manufacturer enum was replaced with a Manufacturer table in the
// 20260404145214_manufacturer_table migration. Names in data/ships.ts already
// use the human-readable form, so seedManufacturers() upserts them by name and
// the ship loop looks up the FK id from this map.
const MANUFACTURER_NAMES = ["Jupiter Industry", "NOMA Shipping", "Antonios", "Dawn Accord", "Empty"] as const;

async function seedManufacturers(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const name of MANUFACTURER_NAMES) {
    const row = await prisma.manufacturer.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    map.set(name, row.id);
  }
  return map;
}

function mapRow(r: string): "Front" | "Middle" | "Back" {
  if (r === "Front" || r === "Middle" || r === "Back") return r;
  throw new Error(`Unknown row: ${r}`);
}

function mapFighterSize(s: string | undefined): "Small" | "Medium" | "Large" | null {
  if (!s) return null;
  if (s === "Small" || s === "Medium" || s === "Large") return s;
  throw new Error(`Unknown fighter size: ${s}`);
}

function mapWeaponTarget(t: string | undefined): "Building" | "Aircraft" | "SmallShip" | "LargeShip" | null {
  if (!t) return null;
  switch (t) {
    case "Building":    return "Building";
    case "Aircraft":    return "Aircraft";
    case "Small Ship":  return "SmallShip";
    case "Large Ship":  return "LargeShip";
    default: throw new Error(`Unknown weapon target: ${t}`);
  }
}

function mapDamageType(d: string | undefined): "Projectile" | "Energy" | null {
  if (!d) return null;
  if (d === "Projectile" || d === "Energy") return d;
  throw new Error(`Unknown damage type: ${d}`);
}

// ----------------------------------------------------------------------------
// Seed driver
// ----------------------------------------------------------------------------

async function seedShips(manufacturerIds: Map<string, number>) {
  console.log(`Seeding ${shipData.length} ships...`);

  for (const ship of shipData) {
    // Ship-level fields. Type-specific fields are extracted via narrow casts
    // since data/ships.ts uses a discriminated union and we want loose access here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = ship as any;

    const manufacturerId = manufacturerIds.get(s.manufacturer as string);
    if (manufacturerId === undefined) throw new Error(`Unknown manufacturer "${s.manufacturer}" for ship ${s.name}`);

    const baseData = {
      id: s.id as number,
      name: s.name as string,
      title: s.title as string,
      img: s.img as string,
      type: mapShipType(s.type),
      variant: s.variant as string,
      variantName: s.variantName as string,
      hasVariants: s.hasVariants as boolean,
      manufacturerId,
      row: mapRow(s.row),
      commandPoints: s.commandPoints as number,
      serviceLimit: s.serviceLimit as number,
      fighterType: s.type === "Fighter" ? mapFighterSize(s.fighterType) : null,
      fightersPerSquadron: s.type === "Fighter" ? (s.fightersPerSquadron as number) : null,
      smallFighterCapacity: typeof s.smallFighterCapacity === "number" ? (s.smallFighterCapacity as number) : null,
      mediumFighterCapacity: typeof s.mediumFighterCapacity === "number" ? (s.mediumFighterCapacity as number) : null,
      largeFighterCapacity: typeof s.largeFighterCapacity === "number" ? (s.largeFighterCapacity as number) : null,
      corvetteCapacity: typeof s.corvetteCapacity === "number" ? (s.corvetteCapacity as number) : null,
    };

    // Upsert the ship row by composite (name, variant). On update we wipe the
    // module subtree and rebuild it so the seed stays the source of truth.
    const existing = await prisma.ship.findUnique({ where: { name_variant: { name: baseData.name, variant: baseData.variant } } });

    if (existing) {
      await prisma.shipModule.deleteMany({ where: { shipId: existing.id } });
      await prisma.ship.update({ where: { id: existing.id }, data: { ...baseData, id: undefined } });
    } else {
      await prisma.ship.create({ data: baseData });
    }

    // Modules only exist on supercapital ships in the source data.
    if (Array.isArray(s.modules)) {
      for (const mod of s.modules) await seedModule(baseData.id, mod);
    }
  }

  // Bump the Ship id sequence past the highest seeded id so future inserts
  // (admin-created ships) don't collide.
  const maxId = await prisma.ship.aggregate({ _max: { id: true } });
  if (maxId._max.id !== null) {
    await prisma.$executeRawUnsafe(`SELECT setval('"Ship_id_seq"', ${maxId._max.id + 1}, false)`);
  }

  console.log(`  done.`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedModule(shipId: number, mod: any) {
  if (mod.type === "unknown") {
    await prisma.shipModule.create({
      data: {
        shipId,
        kind: "unknown",
        system: mod.system as string,
        isUnknown: true,
        isDefault: mod.default === true,
        img: (mod.img as string) ?? null,
      },
    });
    return;
  }

  // Known module: weapon | propulsion | armor.
  const stats = mod.stats ?? {};
  const created = await prisma.shipModule.create({
    data: {
      shipId,
      kind: stats.type as "weapon" | "propulsion" | "armor",
      system: mod.system as string,
      isDefault: mod.default === true,
      isUnknown: false,
      img: (mod.img as string) ?? null,
      name: (mod.name as string) ?? null,
      hp: typeof stats.hp === "number" ? stats.hp : null,
      antiship: typeof stats.antiship === "number" ? stats.antiship : null,
      antiair: typeof stats.antiair === "number" ? stats.antiair : null,
      siege: typeof stats.siege === "number" ? stats.siege : null,
      cruise: typeof stats.cruise === "number" ? stats.cruise : null,
      warp: typeof stats.warp === "number" ? stats.warp : null,
      armor: typeof stats.armor === "number" ? stats.armor : null,
      extraHp: typeof stats.extraHP === "number" ? stats.extraHP : null,
      energyShield: typeof stats.energyShield === "number" ? stats.energyShield : null,
      hpRecovery: typeof stats.hpRecovery === "number" ? stats.hpRecovery : null,
      storage: typeof stats.storage === "number" ? stats.storage : null,
    },
  });

  if (Array.isArray(mod.sourcedFrom)) {
    for (const name of mod.sourcedFrom as string[]) {
      await prisma.moduleSource.create({ data: { moduleId: created.id, name } });
    }
  }

  if (Array.isArray(mod.subsystems)) {
    for (const sub of mod.subsystems) await seedSubsystem(created.id, sub);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedSubsystem(moduleId: number, sub: any) {
  const stats = sub.stats ?? null;

  const subData = {
    moduleId,
    count: sub.count as number,
    title: sub.title as string,
    name: sub.name as string,
    kind: sub.type as "weapon" | "hanger" | "misc",
    damageType: mapDamageType(sub.damageType),
    target: mapWeaponTarget(sub.target),
    lockonEfficiency: typeof sub.lockonEfficiency === "number" ? sub.lockonEfficiency : null,
    alpha: typeof sub.alpha === "number" ? sub.alpha : null,
    hanger: typeof sub.hanger === "string" ? sub.hanger : null,
    capacity: typeof sub.capacity === "number" ? sub.capacity : null,
    repair: typeof sub.repair === "number" ? sub.repair : null,
    cooldown: typeof stats?.cooldown === "number" ? stats.cooldown : null,
    lockOnTime: typeof stats?.lockOnTime === "number" ? stats.lockOnTime : null,
    duration: typeof stats?.duration === "number" ? stats.duration : null,
    damageFrequency: typeof stats?.damageFrequency === "number" ? stats.damageFrequency : null,
    attacksPerRoundA: Array.isArray(stats?.attacksPerRound) ? (stats.attacksPerRound[0] as number) : null,
    attacksPerRoundB: Array.isArray(stats?.attacksPerRound) ? (stats.attacksPerRound[1] as number) : null,
    operationCountA: Array.isArray(stats?.operationCount) ? (stats.operationCount[0] as number) : null,
    operationCountB: Array.isArray(stats?.operationCount) ? (stats.operationCount[1] as number) : null,
  };

  const created = await prisma.subsystem.create({ data: subData });

  if (Array.isArray(sub.attributes)) {
    for (const attr of sub.attributes as string[]) {
      await prisma.subsystemAttribute.create({ data: { subsystemId: created.id, attribute: attr } });
    }
  }

  // targetPriority can be:
  //  - undefined (no priorities at all)
  //  - an object keyed by antiship/antiair/siege (regular weapons & attack UAVs)
  //  - a flat array of [order, type] tuples (misc UAVs: spotter/shield/info/recon)
  const tp = stats?.targetPriority;
  if (tp && Array.isArray(tp)) {
    for (const [order, targetType] of tp as [number, string][]) {
      await prisma.subsystemUavPriority.create({ data: { subsystemId: created.id, order, targetType } });
    }
  } else if (tp && typeof tp === "object") {
    for (const category of ["antiship", "antiair", "siege"] as const) {
      const entry = tp[category];
      if (!entry) continue;
      const cat = await prisma.subsystemTargetCategory.create({
        data: {
          subsystemId: created.id,
          category,
          position: entry.position as number,
          damage: entry.damage as number,
        },
      });
      if (Array.isArray(entry.priorities)) {
        for (const [order, targetType] of entry.priorities as [number, string][]) {
          await prisma.subsystemTargetType.create({ data: { categoryId: cat.id, order, targetType } });
        }
      }
    }
  }
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn("ADMIN_USERNAME or ADMIN_PASSWORD not set — skipping admin bootstrap.");
    return;
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log(`Admin already exists (${existingAdmin.username}), skipping bootstrap.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
    },
  });
  console.log(`Bootstrapped admin user "${username}" (mustChangePassword=true).`);
}

async function main() {
  const manufacturerIds = await seedManufacturers();
  await seedShips(manufacturerIds);
  await seedAdmin();
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
