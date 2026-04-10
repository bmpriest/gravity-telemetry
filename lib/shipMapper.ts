/**
 * Maps Prisma ship rows (with full nested includes) to the frontend AllShip
 * shape consumed by the React components. The DTO omits the legacy fields
 * `direction`, `scope`, and `weight` (and the global `difficulty` map).
 */
import type { Prisma } from "@prisma/client";

const shipTypeOut: Record<string, string> = {
  Fighter: "Fighter",
  Corvette: "Corvette",
  Frigate: "Frigate",
  Destroyer: "Destroyer",
  Cruiser: "Cruiser",
  Battlecruiser: "Battlecruiser",
  AuxiliaryShip: "Auxiliary Ship",
  Carrier: "Carrier",
  Battleship: "Battleship",
};

const manufacturerOut: Record<string, string> = {
  JupiterIndustry: "Jupiter Industry",
  NomaShipping: "NOMA Shipping",
  Antonios: "Antonios",
  DawnAccord: "Dawn Accord",
  Empty: "Empty",
};

const carrierSlotOut: Record<string, string> = {
  SmallFighter: "Small Fighter",
  MediumFighter: "Medium Fighter",
  LargeFighter: "Large Fighter",
  Corvette: "Corvette",
};

// Capacity slot → property name on the capital ship DTO
const capacityProp: Record<string, string> = {
  SmallFighter: "smallFighterCapacity",
  MediumFighter: "mediumFighterCapacity",
  LargeFighter: "largeFighterCapacity",
  Corvette: "corvetteCapacity",
};

export type ShipWithRelations = Prisma.ShipGetPayload<{
  include: {
    hangerCapacities: true;
    modules: {
      include: {
        sources: true;
        subsystems: {
          include: {
            attributes: true;
            priorities: true;
          };
        };
      };
    };
  };
}>;

type ModuleRow = ShipWithRelations["modules"][number];
type SubsystemRow = ModuleRow["subsystems"][number];

export function mapShip(row: ShipWithRelations): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: row.id,
    name: row.name,
    title: row.title,
    img: row.img,
    type: shipTypeOut[row.type] ?? row.type,
    variant: row.variant,
    variantName: row.variantName,
    hasVariants: row.hasVariants,
    manufacturer: manufacturerOut[row.manufacturer] ?? row.manufacturer,
    row: row.row,
    commandPoints: row.commandPoints,
    serviceLimit: row.serviceLimit,
  };

  if (row.type === "Fighter") {
    out.fighterType = row.fighterType;
    out.fightersPerSquadron = row.fightersPerSquadron;
  }

  for (const cap of row.hangerCapacities) {
    const prop = capacityProp[cap.slotType];
    if (prop) out[prop] = cap.capacity;
  }

  if (
    row.type === "Battlecruiser" ||
    row.type === "AuxiliaryShip" ||
    row.type === "Carrier" ||
    row.type === "Battleship"
  ) {
    out.modules = row.modules
      .slice()
      .sort((a, b) => moduleSystemOrder(a.system) - moduleSystemOrder(b.system))
      .map(mapModule);
  }

  return out;
}

const SYSTEM_ORDER = [
  "M1",
  "M2",
  "M3",
  "A1",
  "A2",
  "A3",
  "B1",
  "B2",
  "B3",
  "C1",
  "C2",
  "C3",
  "D1",
  "D2",
  "D3",
  "E1",
  "E2",
  "F1",
  "F2",
  "G1",
  "G2",
  "H1",
  "H2",
];
function moduleSystemOrder(s: string): number {
  const i = SYSTEM_ORDER.indexOf(s);
  return i === -1 ? 999 : i;
}

function mapModule(row: ModuleRow): Record<string, unknown> {
  if (row.kind === "unknown") {
    return {
      type: "unknown",
      img: row.img,
      system: row.system,
      unknown: true,
    };
  }

  const sourcedFrom =
    row.sources.length > 0 ? row.sources.map((s) => s.name) : null;

  const base: Record<string, unknown> = {
    type: "known",
    img: row.img,
    system: row.system,
    name: row.name,
    sourcedFrom,
  };
  if (row.isDefault) base.default = true;

  let stats: Record<string, unknown>;
  if (row.kind === "weapon") {
    stats = {
      type: "weapon",
      antiship: row.antishipDamage,
      antiair: row.antiairDamage,
      siege: row.siegeDamage,
      hp: row.hp,
    };
  } else if (row.kind === "propulsion") {
    stats = {
      type: "propulsion",
      cruise: row.cruise,
      warp: row.warp,
      hp: row.hp,
    };
  } else {
    // misc → "armor" (frontend's discriminator)
    stats = {
      type: "armor",
      armor: row.armor,
      extraHP: row.extraHp,
      energyShield: row.energyShield,
      hp: row.hp,
    };
    if (row.hpRecovery !== null) stats.hpRecovery = row.hpRecovery;
    if (row.storage !== null) stats.storage = row.storage;
  }
  base.stats = stats;

  base.subsystems = row.subsystems
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(mapSubsystem);

  return base;
}

function mapSubsystem(row: SubsystemRow): Record<string, unknown> {
  const attributes =
    row.attributes.length > 0
      ? row.attributes.map((a) => a.attributeName)
      : null;

  const base: Record<string, unknown> = {
    count: row.count,
    title: row.title,
    name: row.name,
    attributes,
  };

  switch (row.kind) {
    case "misc":
      return { type: "misc", ...base };

    case "weapon":
      return {
        type: "weapon",
        ...base,
        damageType: row.damageType,
        target: weaponTargetOut(row.weaponTarget),
        lockonEfficiency: row.lockonEfficiency,
        alpha: row.alpha,
        stats: weaponStats(row),
      };

    case "hangerAircraft": {
      const slot = row.hangerSlot ?? "";
      return {
        type: "hanger",
        ...base,
        hanger: carrierSlotOut[slot] ?? slot,
        capacity: row.capacity,
      };
    }

    case "hangerAttackUav":
      return {
        type: "hanger",
        ...base,
        hanger: row.hangerSlot,
        capacity: row.capacity,
        damageType: row.damageType,
        target: weaponTargetOut(row.weaponTarget),
        lockonEfficiency: row.lockonEfficiency,
        alpha: row.alpha,
        stats: weaponStats(row),
      };

    case "hangerRepairUav":
      return {
        type: "hanger",
        ...base,
        hanger: row.hangerSlot,
        capacity: row.capacity,
        repair: row.repair,
      };

    case "hangerMiscUav":
      return {
        type: "hanger",
        ...base,
        hanger: row.hangerSlot,
        capacity: row.capacity,
        stats: uavStats(row),
      };
  }
}

function weaponTargetOut(t: string | null): string | null {
  if (!t) return null;
  if (t === "SmallShip") return "Small Ship";
  if (t === "LargeShip") return "Large Ship";
  return t;
}

function weaponStats(row: SubsystemRow): Record<string, unknown> | null {
  if (row.statsKind === "none") return null;

  const targetPriority: Record<string, unknown> = {};
  if (row.antishipPosition !== null) {
    targetPriority.antiship = {
      position: row.antishipPosition,
      damage: row.antishipDamage,
      priorities: row.priorities
        .filter((p) => p.scope === "antiship")
        .map((p) => [p.order, p.shipType]),
    };
  }
  if (row.antiairPosition !== null) {
    targetPriority.antiair = {
      position: row.antiairPosition,
      damage: row.antiairDamage,
      priorities: row.priorities
        .filter((p) => p.scope === "antiair")
        .map((p) => [p.order, p.shipType]),
    };
  }
  if (row.siegePosition !== null) {
    targetPriority.siege = {
      position: row.siegePosition,
      damage: row.siegeDamage,
    };
  }

  const stats: Record<string, unknown> = {
    cooldown: row.cooldown,
    lockOnTime: row.lockOnTime,
    targetPriority,
  };

  if (row.statsKind === "projectile") {
    stats.attacksPerRound = [row.attacksPerRoundA, row.attacksPerRoundB];
    if (row.duration !== null) stats.duration = row.duration;
  } else if (row.statsKind === "energy") {
    stats.duration = row.duration;
    stats.damageFrequency = row.damageFrequency;
  }

  return stats;
}

function uavStats(row: SubsystemRow): Record<string, unknown> {
  const targetPriority = row.priorities
    .filter((p) => p.scope === "uav")
    .map((p) => [p.order, p.shipType]);

  return {
    duration: row.duration,
    cooldown: row.cooldown,
    lockOnTime: row.lockOnTime,
    operationCount: [row.operationCountA, row.operationCountB],
    targetPriority,
  };
}
