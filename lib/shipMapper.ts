/**
 * Maps a Prisma `Ship` (with deep includes) into the legacy `AllShip` shape that
 * the frontend already consumes. Doing this server-side keeps the API contract
 * stable while the storage layer moves to Postgres — every page that touches
 * `useUserStore.shipData` continues to see the same union type.
 *
 * The transformation is the inverse of `prisma/seed.ts`: enum identifiers are
 * mapped back to the human-readable strings the UI uses, and the normalized
 * subsystem/target tables are folded back into the nested object the legacy
 * `AllShip` type expects.
 */

import type { AllShip } from "@/utils/ships";
import { resolveShipImage } from "@/utils/ships";

// ============================================================================
// Prisma input shape — matches `shipInclude` below. We avoid importing Prisma's
// generated `Ship & { modules: ... }` payload type because it would force every
// caller to also import Prisma type helpers; instead we describe the same shape
// locally with a minimal interface.
// ============================================================================

interface DbTargetType { order: number; targetType: string }
interface DbTargetCategory { category: string; position: number; damage: number; priorities: DbTargetType[] }
interface DbUavPriority { order: number; targetType: string }
interface DbAttribute { attribute: string }
interface DbSubsystem {
  id: number;
  count: number;
  title: string;
  name: string;
  kind: "weapon" | "hanger" | "misc";
  damageType: "Projectile" | "Energy" | null;
  target: "Building" | "Aircraft" | "SmallShip" | "LargeShip" | null;
  lockonEfficiency: number | null;
  alpha: number | null;
  hanger: string | null;
  capacity: number | null;
  repair: number | null;
  cooldown: number | null;
  lockOnTime: number | null;
  duration: number | null;
  damageFrequency: number | null;
  attacksPerRoundA: number | null;
  attacksPerRoundB: number | null;
  operationCountA: number | null;
  operationCountB: number | null;
  attributes: DbAttribute[];
  targetCategories: DbTargetCategory[];
  uavPriorities: DbUavPriority[];
}
interface DbSource { name: string }
interface DbModule {
  id: number;
  kind: "weapon" | "propulsion" | "armor" | "unknown";
  system: string;
  isDefault: boolean;
  isUnknown: boolean;
  img: string | null;
  name: string | null;
  hp: number | null;
  antiship: number | null;
  antiair: number | null;
  siege: number | null;
  cruise: number | null;
  warp: number | null;
  armor: number | null;
  extraHp: number | null;
  energyShield: number | null;
  hpRecovery: number | null;
  storage: number | null;
  sources: DbSource[];
  subsystems: DbSubsystem[];
}
interface DbShip {
  id: number;
  name: string;
  title: string;
  img: string;
  type: "Fighter" | "Corvette" | "Frigate" | "Destroyer" | "Cruiser" | "Battlecruiser" | "AuxiliaryShip" | "Carrier" | "Battleship";
  variant: string;
  variantName: string;
  hasVariants: boolean;
  // Manufacturer is now a joined table row, so we read the human-readable name
  // directly. The DbShip's manufacturerId is unused by the mapper but kept on
  // the model for the admin write paths.
  manufacturer: { name: string };
  row: "Front" | "Middle" | "Back";
  commandPoints: number;
  serviceLimit: number;
  fighterType: "Small" | "Medium" | "Large" | null;
  fightersPerSquadron: number | null;
  smallFighterCapacity: number | null;
  mediumFighterCapacity: number | null;
  largeFighterCapacity: number | null;
  corvetteCapacity: number | null;
  modules: DbModule[];
}

/**
 * Standard Prisma include used by every ship-fetching route. Centralizing it
 * means the mapper and the queries can never drift out of sync.
 */
export const shipInclude = {
  manufacturer: true,
  modules: {
    include: {
      sources: true,
      subsystems: {
        include: {
          attributes: true,
          targetCategories: { include: { priorities: { orderBy: { order: "asc" as const } } } },
          uavPriorities: { orderBy: { order: "asc" as const } },
        },
      },
    },
  },
};

// ============================================================================
// Enum → display-string mappers (inverse of seed.ts)
// ============================================================================

function shipTypeToDisplay(t: DbShip["type"]): string {
  return t === "AuxiliaryShip" ? "Auxiliary Ship" : t;
}

function targetToDisplay(t: NonNullable<DbSubsystem["target"]>): string {
  return t === "SmallShip" ? "Small Ship" : t === "LargeShip" ? "Large Ship" : t;
}

// ============================================================================
// Subsystem mapper
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSubsystemStats(sub: DbSubsystem): any {
  // For misc-UAV subsystems the targetPriority is the flat uavPriorities array.
  // For everything else it's the antiship/antiair/siege keyed object built from
  // targetCategories. A subsystem with neither is treated as having no stats.
  const hasUavPriorities = sub.uavPriorities.length > 0;
  const hasTargetCategories = sub.targetCategories.length > 0;
  const hasFlatStats = sub.cooldown !== null || sub.lockOnTime !== null || sub.duration !== null;

  if (!hasUavPriorities && !hasTargetCategories && !hasFlatStats) return null;

  if (hasUavPriorities) {
    return {
      targetPriority: sub.uavPriorities.map((p) => [p.order, p.targetType]),
      duration: sub.duration ?? 0,
      cooldown: sub.cooldown ?? 0,
      lockOnTime: sub.lockOnTime ?? 0,
      operationCount: [sub.operationCountA ?? 0, sub.operationCountB ?? 0],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetPriority: any = {};
  for (const cat of sub.targetCategories) {
    targetPriority[cat.category] = {
      position: cat.position,
      damage: cat.damage,
      ...(cat.priorities.length > 0 && {
        priorities: cat.priorities.map((p) => [p.order, p.targetType]),
      }),
    };
  }

  // Projectile vs energy stats are distinguished by the presence of attacksPerRound.
  if (sub.attacksPerRoundA !== null && sub.attacksPerRoundB !== null) {
    return {
      targetPriority,
      cooldown: sub.cooldown ?? 0,
      lockOnTime: sub.lockOnTime ?? 0,
      attacksPerRound: [sub.attacksPerRoundA, sub.attacksPerRoundB],
      ...(sub.duration !== null && { duration: sub.duration }),
    };
  }

  return {
    targetPriority,
    cooldown: sub.cooldown ?? 0,
    lockOnTime: sub.lockOnTime ?? 0,
    duration: sub.duration ?? 0,
    damageFrequency: sub.damageFrequency ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSubsystem(sub: DbSubsystem): any {
  const attrs = sub.attributes.length > 0 ? sub.attributes.map((a) => a.attribute) : null;

  if (sub.kind === "weapon") {
    return {
      id: sub.id,
      type: "weapon",
      count: sub.count,
      title: sub.title,
      name: sub.name,
      damageType: sub.damageType,
      target: sub.target ? targetToDisplay(sub.target) : null,
      lockonEfficiency: sub.lockonEfficiency,
      alpha: sub.alpha ?? 0,
      attributes: attrs,
      stats: mapSubsystemStats(sub),
    };
  }

  if (sub.kind === "hanger") {
    // Three flavors: aircraft (Small/Medium/Large Fighter, Corvette), repair UAV
    // (has `repair`), or misc UAV (has flat targetPriority via uavPriorities).
    const isAircraft =
      sub.hanger === "Small Fighter" ||
      sub.hanger === "Medium Fighter" ||
      sub.hanger === "Large Fighter" ||
      sub.hanger === "Corvette";

    if (isAircraft) {
      return {
        id: sub.id,
        type: "hanger",
        count: sub.count,
        title: sub.title,
        name: sub.name,
        hanger: sub.hanger,
        capacity: sub.capacity ?? 0,
        attributes: attrs,
      };
    }

    if (sub.repair !== null) {
      return {
        id: sub.id,
        type: "hanger",
        count: sub.count,
        title: sub.title,
        name: sub.name,
        hanger: sub.hanger,
        capacity: sub.capacity ?? 0,
        repair: sub.repair,
        attributes: attrs,
      };
    }

    // Attack UAV vs misc UAV: attack UAVs have damageType + target + alpha,
    // misc UAVs (Spotter/Shield/Info/Recon) have just stats with the flat
    // targetPriority array.
    if (sub.damageType !== null) {
      return {
        id: sub.id,
        type: "hanger",
        count: sub.count,
        title: sub.title,
        name: sub.name,
        hanger: sub.hanger,
        capacity: sub.capacity ?? 0,
        damageType: sub.damageType,
        target: sub.target ? targetToDisplay(sub.target) : null,
        lockonEfficiency: sub.lockonEfficiency,
        alpha: sub.alpha ?? 0,
        attributes: attrs,
        stats: mapSubsystemStats(sub),
      };
    }

    return {
      id: sub.id,
      type: "hanger",
      count: sub.count,
      title: sub.title,
      name: sub.name,
      hanger: sub.hanger,
      capacity: sub.capacity ?? 0,
      attributes: attrs,
      stats: mapSubsystemStats(sub),
    };
  }

  // misc subsystem
  return {
    id: sub.id,
    type: "misc",
    count: sub.count,
    title: sub.title,
    name: sub.name,
    attributes: attrs,
  };
}

// ============================================================================
// Module mapper
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapModule(mod: DbModule): any {
  if (mod.isUnknown || mod.kind === "unknown") {
    return {
      id: mod.id,
      type: "unknown",
      unknown: true,
      img: mod.img ?? "",
      system: mod.system,
      ...(mod.isDefault && { default: true }),
    };
  }

  const sourcedFrom = mod.sources.length > 0 ? mod.sources.map((s) => s.name) : null;
  const subsystems = mod.subsystems.map(mapSubsystem);

  if (mod.kind === "weapon") {
    return {
      id: mod.id,
      type: "known",
      img: mod.img ?? "",
      system: mod.system,
      ...(mod.isDefault && { default: true }),
      sourcedFrom,
      name: mod.name ?? "",
      stats: {
        type: "weapon",
        antiship: mod.antiship,
        antiair: mod.antiair,
        siege: mod.siege,
        hp: mod.hp ?? 0,
      },
      subsystems,
    };
  }

  if (mod.kind === "propulsion") {
    return {
      id: mod.id,
      type: "known",
      img: mod.img ?? "",
      system: mod.system,
      ...(mod.isDefault && { default: true }),
      sourcedFrom,
      name: mod.name ?? "",
      stats: {
        type: "propulsion",
        cruise: mod.cruise,
        warp: mod.warp,
        hp: mod.hp ?? 0,
      },
      subsystems,
    };
  }

  // armor (misc) module
  return {
    id: mod.id,
    type: "known",
    img: mod.img ?? "",
    system: mod.system,
    ...(mod.isDefault && { default: true }),
    sourcedFrom,
    name: mod.name ?? "",
    stats: {
      type: "armor",
      armor: mod.armor,
      extraHP: mod.extraHp,
      energyShield: mod.energyShield,
      ...(mod.hpRecovery !== null && { hpRecovery: mod.hpRecovery }),
      ...(mod.storage !== null && { storage: mod.storage }),
      hp: mod.hp ?? 0,
    },
    subsystems,
  };
}

// ============================================================================
// Ship mapper
// ============================================================================

export function mapShip(ship: DbShip, siblings?: Map<string, string>): AllShip {
  // Apply the image fallback chain so every consumer (single-ship and full
  // catalogue routes) sees a non-empty img. `siblings` is optional — without
  // it the resolver still falls back to the per-type generic icon.
  const resolvedImg = resolveShipImage(
    { img: ship.img, name: ship.name, type: shipTypeToDisplay(ship.type), hasVariants: ship.hasVariants },
    siblings,
  );

  const base = {
    id: ship.id,
    name: ship.name,
    title: ship.title,
    img: resolvedImg,
    variant: ship.variant,
    variantName: ship.variantName,
    hasVariants: ship.hasVariants,
    manufacturer: ship.manufacturer.name,
    row: ship.row,
    commandPoints: ship.commandPoints,
    serviceLimit: ship.serviceLimit,
  };

  const displayType = shipTypeToDisplay(ship.type);

  if (ship.type === "Fighter") {
    return {
      ...base,
      type: "Fighter",
      fighterType: ship.fighterType ?? "Small",
      fightersPerSquadron: ship.fightersPerSquadron ?? 0,
    } as AllShip;
  }

  if (ship.type === "Corvette") {
    return { ...base, type: "Corvette" } as AllShip;
  }

  if (ship.type === "Frigate" || ship.type === "Destroyer" || ship.type === "Cruiser") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap: any = { ...base, type: displayType };
    if (ship.smallFighterCapacity !== null) cap.smallFighterCapacity = ship.smallFighterCapacity;
    if (ship.mediumFighterCapacity !== null) cap.mediumFighterCapacity = ship.mediumFighterCapacity;
    if (ship.largeFighterCapacity !== null) cap.largeFighterCapacity = ship.largeFighterCapacity;
    if (ship.corvetteCapacity !== null) cap.corvetteCapacity = ship.corvetteCapacity;
    return cap as AllShip;
  }

  // Supercapital — has modules.
  return {
    ...base,
    type: displayType,
    modules: ship.modules.map(mapModule),
  } as AllShip;
}

export function mapShips(ships: DbShip[]): AllShip[] {
  // Pre-build a `${name}::${variantUpper}` → img map so resolveShipImage can
  // walk it without an O(n²) per-ship scan. Empty img strings are skipped so
  // an A variant without an image doesn't shadow the type-icon fallback.
  const siblings = new Map<string, string>();
  for (const s of ships) {
    if (s.img && s.img.length > 0) {
      siblings.set(`${s.name}::${s.variant.toUpperCase()}`, s.img);
    }
  }
  return ships.map((s) => mapShip(s, siblings));
}
