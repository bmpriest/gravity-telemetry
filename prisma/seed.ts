/**
 * Seeds ship/module/subsystem/attribute data from prisma/seed-data.ts into the
 * relational schema. Wipes existing ship-related rows first; idempotent.
 *
 *   npm run db:seed
 */
import {
  PrismaClient,
  ShipType,
  Manufacturer,
  Row,
  Variant,
  FighterType,
  CarrierSlot,
  ModuleSystem,
  ModuleKind,
  SubsystemKind,
  DamageType,
  WeaponTarget,
  SubsystemStatsKind,
  TargetScope,
  Prisma,
} from "@prisma/client";
import { data as ships } from "./seed-data";
import { attributes as attributeDefs } from "../utils/ships";
import type {
  AllShip,
  AllModule,
  Fighter as FighterShip,
  WeaponSubsystem,
  AircraftSubsystem,
  AttackUAVSubsystem,
  RepairUAVSubsystem,
  MiscUAVSubsystem,
  MiscSubsytem,
} from "../utils/ships";

const prisma = new PrismaClient();

// ──────────────────────── enum maps ────────────────────────

const shipTypeMap: Record<string, ShipType> = {
  Fighter: ShipType.Fighter,
  Corvette: ShipType.Corvette,
  Frigate: ShipType.Frigate,
  Destroyer: ShipType.Destroyer,
  Cruiser: ShipType.Cruiser,
  Battlecruiser: ShipType.Battlecruiser,
  "Auxiliary Ship": ShipType.AuxiliaryShip,
  Carrier: ShipType.Carrier,
  Battleship: ShipType.Battleship,
};

const manufacturerMap: Record<string, Manufacturer> = {
  "Jupiter Industry": Manufacturer.JupiterIndustry,
  "NOMA Shipping": Manufacturer.NomaShipping,
  Antonios: Manufacturer.Antonios,
  "Dawn Accord": Manufacturer.DawnAccord,
  Empty: Manufacturer.Empty,
};

const rowMap: Record<string, Row> = {
  Front: Row.Front,
  Middle: Row.Middle,
  Back: Row.Back,
};

const variantMap: Record<string, Variant> = {
  A: Variant.A,
  B: Variant.B,
  C: Variant.C,
  D: Variant.D,
};

const fighterTypeMap: Record<string, FighterType> = {
  Small: FighterType.Small,
  Medium: FighterType.Medium,
  Large: FighterType.Large,
};

const carrierSlotMap: Record<string, CarrierSlot> = {
  "Small Fighter": CarrierSlot.SmallFighter,
  "Medium Fighter": CarrierSlot.MediumFighter,
  "Large Fighter": CarrierSlot.LargeFighter,
  Corvette: CarrierSlot.Corvette,
};

const damageTypeMap: Record<string, DamageType> = {
  Projectile: DamageType.Projectile,
  Energy: DamageType.Energy,
};

const weaponTargetMap: Record<string, WeaponTarget> = {
  Building: WeaponTarget.Building,
  Aircraft: WeaponTarget.Aircraft,
  "Small Ship": WeaponTarget.SmallShip,
  "Large Ship": WeaponTarget.LargeShip,
};

// Fighter/Corvette hangars store carrier-slot strings; map to CarrierSlot.
// UAV hangars store UAV variant strings; categorize into kinds.
const HANGER_AIRCRAFT_SLOTS = new Set<string>([
  "Small Fighter",
  "Medium Fighter",
  "Large Fighter",
  "Corvette",
]);
const HANGER_ATTACK_UAV = new Set<string>([
  "Area-Denial Anti-Aircraft UAV",
  "Cooperative Offensive UAV",
  "Tactical UAV",
  "Siege UAV",
  "Military UAV",
  "Guard UAV",
]);
const HANGER_REPAIR_UAV = new Set<string>(["Repair UAV"]);
const HANGER_MISC_UAV = new Set<string>([
  "Spotter UAV",
  "Shield UAV",
  "Info UAV",
  "Recon UAV",
]);

function classifyHanger(hanger: string): SubsystemKind {
  if (HANGER_AIRCRAFT_SLOTS.has(hanger)) return SubsystemKind.hangerAircraft;
  if (HANGER_ATTACK_UAV.has(hanger)) return SubsystemKind.hangerAttackUav;
  if (HANGER_REPAIR_UAV.has(hanger)) return SubsystemKind.hangerRepairUav;
  if (HANGER_MISC_UAV.has(hanger)) return SubsystemKind.hangerMiscUav;
  throw new Error(`Unknown hanger type: ${hanger}`);
}

// ──────────────────────── helpers ────────────────────────

function lookup<T>(map: Record<string, T>, key: string, label: string): T {
  const v = map[key];
  if (v === undefined) throw new Error(`Unknown ${label}: ${key}`);
  return v;
}

function isFighter(ship: AllShip): ship is FighterShip {
  return ship.type === "Fighter";
}

function isSuperCap(
  ship: AllShip
): ship is AllShip & { modules: AllModule[] } {
  return (
    ship.type === "Battlecruiser" ||
    ship.type === "Auxiliary Ship" ||
    ship.type === "Carrier" ||
    ship.type === "Battleship"
  );
}

function getCapacities(
  ship: AllShip
): Array<{ slot: CarrierSlot; capacity: number }> {
  const out: Array<{ slot: CarrierSlot; capacity: number }> = [];
  const s = ship as unknown as Record<string, unknown>;
  if (typeof s.mediumFighterCapacity === "number") {
    out.push({
      slot: CarrierSlot.MediumFighter,
      capacity: s.mediumFighterCapacity,
    });
  }
  if (typeof s.largeFighterCapacity === "number") {
    out.push({
      slot: CarrierSlot.LargeFighter,
      capacity: s.largeFighterCapacity,
    });
  }
  if (typeof s.corvetteCapacity === "number") {
    out.push({ slot: CarrierSlot.Corvette, capacity: s.corvetteCapacity });
  }
  return out;
}

// ──────────────────────── seed ────────────────────────

async function main(): Promise<void> {
  console.log("[seed] starting");

  await prisma.$transaction(
    async (tx) => {
      // Wipe ship-related tables (order matters: children first).
      // Cascades from Ship handle most child rows, but we wipe Attribute too.
      await tx.targetPriorityShipType.deleteMany();
      await tx.subsystemAttribute.deleteMany();
      await tx.subsystem.deleteMany();
      await tx.moduleSource.deleteMany();
      await tx.module.deleteMany();
      await tx.shipHangerCapacity.deleteMany();
      // Anything that references Ship via Restrict (FleetShipInstance) or
      // Cascade (BlueprintShipUnlock) is cleared by their own cascades when
      // the dependent rows go. FleetShipInstance is Restrict — clean it
      // explicitly to allow ship deletes.
      await tx.fleetShipInstance.deleteMany();
      await tx.blueprintShipUnlock.deleteMany();
      await tx.ship.deleteMany();
      await tx.attribute.deleteMany();

      // Insert attributes lookup table.
      await tx.attribute.createMany({
        data: Object.entries(attributeDefs).map(([name, description]) => ({
          name,
          description,
        })),
      });

      let moduleCount = 0;
      let subsystemCount = 0;
      let hangerCount = 0;

      for (const ship of ships) {
        const shipRow = await tx.ship.create({
          data: {
            id: ship.id,
            name: ship.name,
            title: ship.title,
            img: ship.img,
            type: lookup(shipTypeMap, ship.type, "ship type"),
            variant: lookup(variantMap, ship.variant, "variant"),
            variantName: ship.variantName,
            hasVariants: ship.hasVariants,
            manufacturer: lookup(
              manufacturerMap,
              ship.manufacturer,
              "manufacturer"
            ),
            row: lookup(rowMap, ship.row, "row"),
            commandPoints: ship.commandPoints,
            serviceLimit: ship.serviceLimit,
            fighterType: isFighter(ship)
              ? lookup(fighterTypeMap, ship.fighterType, "fighter type")
              : null,
            fightersPerSquadron: isFighter(ship)
              ? ship.fightersPerSquadron
              : null,
          },
        });

        // Hanger capacities (capital ships)
        for (const cap of getCapacities(ship)) {
          await tx.shipHangerCapacity.create({
            data: {
              shipId: shipRow.id,
              slotType: cap.slot,
              capacity: cap.capacity,
            },
          });
          hangerCount++;
        }

        // Modules (super-capitals only)
        if (!isSuperCap(ship)) continue;

        for (const mod of ship.modules) {
          const system = ModuleSystem[mod.system];
          if (!system) {
            throw new Error(
              `Unknown module system "${mod.system}" on ship ${String(
                ship.id
              )} ${ship.name}`
            );
          }

          if (mod.type === "unknown") {
            await tx.module.create({
              data: {
                shipId: shipRow.id,
                system,
                kind: ModuleKind.unknown,
                isDefault: false,
                img: mod.img,
              },
            });
            moduleCount++;
            continue;
          }

          // Known module: weapon | propulsion | armor (=misc)
          let kind: ModuleKind;
          let modStats: Partial<Prisma.ModuleUncheckedCreateInput> = {};
          if (mod.stats.type === "weapon") {
            kind = ModuleKind.weapon;
            modStats = {
              hp: mod.stats.hp,
              antishipDamage: mod.stats.antiship,
              antiairDamage: mod.stats.antiair,
              siegeDamage: mod.stats.siege,
            };
          } else if (mod.stats.type === "propulsion") {
            kind = ModuleKind.propulsion;
            modStats = {
              hp: mod.stats.hp,
              cruise: mod.stats.cruise,
              warp: mod.stats.warp,
            };
          } else {
            kind = ModuleKind.misc;
            modStats = {
              hp: mod.stats.hp,
              armor: mod.stats.armor,
              extraHp: mod.stats.extraHP,
              energyShield: mod.stats.energyShield,
              hpRecovery: mod.stats.hpRecovery ?? null,
              storage: mod.stats.storage ?? null,
            };
          }

          const moduleRow = await tx.module.create({
            data: {
              shipId: shipRow.id,
              system,
              kind,
              isDefault: mod.default ?? false,
              img: mod.img,
              name: mod.name,
              ...modStats,
            },
          });
          moduleCount++;

          // ModuleSource entries (sourcedFrom)
          if (mod.sourcedFrom) {
            for (const sourceName of mod.sourcedFrom) {
              await tx.moduleSource.create({
                data: { moduleId: moduleRow.id, name: sourceName },
              });
            }
          }

          // Subsystems
          let sortOrder = 0;
          for (const sub of mod.subsystems) {
            await insertSubsystem(tx, moduleRow.id, sub, sortOrder++);
            subsystemCount++;
          }
        }
      }

      // Bump Ship id sequence past the max so future autogen-style inserts
      // would not collide. (Ship.id is not autoincrement, but blueprints/admin
      // may create new ships via Postgres-side defaults later.)
      const maxId = ships.reduce((m, s) => (s.id > m ? s.id : m), 0);
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"Ship"', 'id'), ${String(maxId + 1)}, false)`
      );

      console.log(
        `[seed] ships=${String(ships.length)} modules=${String(
          moduleCount
        )} subsystems=${String(subsystemCount)} hangerCaps=${String(hangerCount)}`
      );
    },
    { timeout: 120_000 }
  );

  console.log("[seed] done");
}

// ──────────────────────── subsystem insert ────────────────────────

type AnySubsystem =
  | WeaponSubsystem
  | AircraftSubsystem
  | AttackUAVSubsystem
  | RepairUAVSubsystem
  | MiscUAVSubsystem
  | MiscSubsytem;

async function insertSubsystem(
  tx: Prisma.TransactionClient,
  moduleId: number,
  sub: AnySubsystem,
  sortOrder: number
): Promise<void> {
  const base = {
    moduleId,
    count: sub.count,
    title: sub.title,
    name: sub.name,
    sortOrder,
  };

  let kind: SubsystemKind;
  let kindFields: Partial<Prisma.SubsystemUncheckedCreateInput> = {};
  let priorities: Array<{
    scope: TargetScope;
    order: number;
    shipType: string;
  }> = [];
  let statsFields: Partial<Prisma.SubsystemUncheckedCreateInput> = {
    statsKind: SubsystemStatsKind.none,
  };

  if (sub.type === "misc") {
    kind = SubsystemKind.misc;
  } else if (sub.type === "weapon") {
    kind = SubsystemKind.weapon;
    kindFields = weaponFields(sub);
    statsFields = weaponStatsFields(sub);
    priorities = weaponPriorities(sub);
  } else {
    // sub.type === "hanger"
    kind = classifyHanger(sub.hanger);
    if (kind === SubsystemKind.hangerAircraft) {
      const slot = lookup(carrierSlotMap, sub.hanger, "carrier slot");
      kindFields = { hangerSlot: slot, capacity: sub.capacity };
    } else if (kind === SubsystemKind.hangerAttackUav) {
      const attack = sub as AttackUAVSubsystem;
      kindFields = {
        hangerSlot: attack.hanger,
        capacity: attack.capacity,
        damageType: lookup(damageTypeMap, attack.damageType, "damage type"),
        weaponTarget: lookup(weaponTargetMap, attack.target, "weapon target"),
        lockonEfficiency: attack.lockonEfficiency,
        alpha: attack.alpha,
      };
      // Reuses weapon-style targetPriority + projectile/energy stats
      statsFields = weaponStatsFields(attack);
      priorities = weaponPriorities(attack);
    } else if (kind === SubsystemKind.hangerRepairUav) {
      const rep = sub as RepairUAVSubsystem;
      kindFields = {
        hangerSlot: rep.hanger,
        capacity: rep.capacity,
        repair: rep.repair,
      };
    } else {
      // hangerMiscUav — UAV stats with flat targetPriority
      const misc = sub as MiscUAVSubsystem;
      kindFields = { hangerSlot: misc.hanger, capacity: misc.capacity };
      statsFields = uavStatsFields(misc);
      priorities = misc.stats.targetPriority.map(([order, shipType]) => ({
        scope: TargetScope.uav,
        order,
        shipType,
      }));
    }
  }

  const created = await tx.subsystem.create({
    data: {
      ...base,
      kind,
      ...kindFields,
      ...statsFields,
    },
  });

  // Attributes
  if (sub.attributes) {
    for (const attrName of sub.attributes) {
      await tx.subsystemAttribute.create({
        data: { subsystemId: created.id, attributeName: attrName },
      });
    }
  }

  // Target priorities
  for (const p of priorities) {
    await tx.targetPriorityShipType.create({
      data: {
        subsystemId: created.id,
        scope: p.scope,
        order: p.order,
        shipType: p.shipType,
      },
    });
  }
}

function weaponFields(
  sub: WeaponSubsystem
): Partial<Prisma.SubsystemUncheckedCreateInput> {
  return {
    damageType: lookup(damageTypeMap, sub.damageType, "damage type"),
    weaponTarget: lookup(weaponTargetMap, sub.target, "weapon target"),
    lockonEfficiency: sub.lockonEfficiency,
    alpha: sub.alpha,
  };
}

function weaponStatsFields(
  sub: WeaponSubsystem | AttackUAVSubsystem
): Partial<Prisma.SubsystemUncheckedCreateInput> {
  const stats = sub.stats;
  if (!stats) return { statsKind: SubsystemStatsKind.none };

  const flat: Partial<Prisma.SubsystemUncheckedCreateInput> = {
    cooldown: stats.cooldown,
    lockOnTime: stats.lockOnTime,
  };

  // Discriminate via attacksPerRound (projectile) vs damageFrequency (energy)
  if ("attacksPerRound" in stats) {
    flat.statsKind = SubsystemStatsKind.projectile;
    flat.attacksPerRoundA = stats.attacksPerRound[0];
    flat.attacksPerRoundB = stats.attacksPerRound[1];
    if (stats.duration !== undefined) flat.duration = stats.duration;
  } else {
    flat.statsKind = SubsystemStatsKind.energy;
    flat.duration = stats.duration;
    flat.damageFrequency = stats.damageFrequency;
  }

  // Flatten per-scope position+damage
  const tp = stats.targetPriority;
  if (tp.antiship) {
    flat.antishipPosition = tp.antiship.position;
    flat.antishipDamage = tp.antiship.damage;
  }
  if (tp.antiair) {
    flat.antiairPosition = tp.antiair.position;
    flat.antiairDamage = tp.antiair.damage;
  }
  if (tp.siege) {
    flat.siegePosition = tp.siege.position;
    flat.siegeDamage = tp.siege.damage;
  }
  return flat;
}

function weaponPriorities(
  sub: WeaponSubsystem | AttackUAVSubsystem
): Array<{ scope: TargetScope; order: number; shipType: string }> {
  if (!sub.stats) return [];
  const out: Array<{ scope: TargetScope; order: number; shipType: string }> = [];
  const tp = sub.stats.targetPriority;
  if (tp.antiship?.priorities) {
    for (const [order, shipType] of tp.antiship.priorities) {
      out.push({ scope: TargetScope.antiship, order, shipType });
    }
  }
  if (tp.antiair?.priorities) {
    for (const [order, shipType] of tp.antiair.priorities) {
      out.push({ scope: TargetScope.antiair, order, shipType });
    }
  }
  // siege has no per-type priorities
  return out;
}

function uavStatsFields(
  sub: MiscUAVSubsystem
): Partial<Prisma.SubsystemUncheckedCreateInput> {
  return {
    statsKind: SubsystemStatsKind.uav,
    duration: sub.stats.duration,
    cooldown: sub.stats.cooldown,
    lockOnTime: sub.stats.lockOnTime,
    operationCountA: sub.stats.operationCount[0],
    operationCountB: sub.stats.operationCount[1],
  };
}

main()
  .catch((err: unknown) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
