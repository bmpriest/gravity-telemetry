/**
 * Maps a deeply-included Prisma `Ship` into the `RichShip` view model consumed
 * by the System Library, Blueprint Library, the shared System View, and the
 * admin panel. This is the faithful representation of the v4.0 schema.
 *
 * `richShipInclude` is the single source of truth for the query shape so the
 * mapper and the queries can't drift.
 */

import type { Prisma } from "@prisma/client";
import { resolveShipImage } from "@/utils/ships";
import type {
  RichShip, RichSystem, RichModule, RichWeapon, Dpm, RichTargetPriority,
} from "@/utils/shipModel";

export const richShipInclude = {
  manufacturer: true,
  hangarStats: true,
  affixes: { orderBy: { order: "asc" as const } },
  fragments: { include: { fragment: true }, orderBy: { id: "asc" as const } },
  systems: {
    orderBy: { index: "asc" as const },
    include: {
      slots: {
        orderBy: { slotIndex: "asc" as const },
        include: {
          modules: {
            orderBy: { id: "asc" as const },
            include: {
              weapon: { include: { targetPriorities: { orderBy: { order: "asc" as const }, include: { shipTypes: { orderBy: { order: "asc" as const } } } } } },
              moduleEffects: { orderBy: { order: "asc" as const } },
              carriedCraft: {
                orderBy: { order: "asc" as const },
                include: {
                  systems: {
                    orderBy: { index: "asc" as const },
                    include: {
                      slots: {
                        orderBy: { slotIndex: "asc" as const },
                        include: {
                          modules: {
                            orderBy: { id: "asc" as const },
                            include: {
                              weapon: { include: { targetPriorities: { orderBy: { order: "asc" as const }, include: { shipTypes: { orderBy: { order: "asc" as const } } } } } },
                              moduleEffects: { orderBy: { order: "asc" as const } },
                              carriedCraft: { orderBy: { order: "asc" as const } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ShipInclude;

type DbShipRich = Prisma.ShipGetPayload<{ include: typeof richShipInclude }>;
type DbSystem = DbShipRich["systems"][number];
type DbSlot = DbSystem["slots"][number];
type DbModule = DbSlot["modules"][number];
type DbWeapon = NonNullable<DbModule["weapon"]>;
type DbCarriedCraft = DbModule["carriedCraft"][number];

function dpm(o: { dpmAntiShip: number; dpmAntiAir: number; dpmSiege: number; dpmHpRecovery: number; dpmOperationEfficiency: number }): Dpm {
  return {
    antiShip: o.dpmAntiShip,
    antiAir: o.dpmAntiAir,
    siege: o.dpmSiege,
    hpRecovery: o.dpmHpRecovery,
    operationEfficiency: o.dpmOperationEfficiency,
  };
}

function mapWeapon(w: DbWeapon): RichWeapon {
  return {
    intervalSeconds: w.intervalSeconds,
    cdTimeSeconds: w.cdTimeSeconds,
    lockOnTimeSeconds: w.lockOnTimeSeconds,
    roundsPerCycle: w.roundsPerCycle,
    ammoCount: w.ammoCount,
    operationCount: w.operationCount,
    operationValue: w.operationValue,
    operationStrength: w.operationStrength,
    weaponLevel: w.weaponLevel,
    weaponTypeName: w.weaponTypeName,
    damageTypeName: w.damageTypeName,
    damagePerHit: w.damagePerHit,
    healingValue: w.healingValue,
    durationSeconds: w.durationSeconds,
    aircraftRangeName: w.aircraftRangeName,
    attackRangeName: w.attackRangeName,
    specialTargetLogicName: w.specialTargetLogicName,
    earlyWarningEfficiency: w.earlyWarningEfficiency,
    dpm: dpm(w),
    aaCooldownReductionPercent: w.aaCooldownReductionPercent,
    aaDamagePerHitDelta: w.aaDamagePerHitDelta,
    aaDurationReductionPercent: w.aaDurationReductionPercent,
    buff: w.buffEffectId != null || w.buffAttrName || w.buffDesc
      ? {
          effectId: w.buffEffectId,
          desc: w.buffDesc,
          attrName: w.buffAttrName,
          attrDescTemplate: w.buffAttrDescTemplate,
          attrDesc: w.buffAttrDesc,
        }
      : null,
    targetPriorities: w.targetPriorities.map<RichTargetPriority>((tp) => ({
      priorityRank: tp.priorityRank,
      shipTypes: tp.shipTypes.map((st) => ({ targetType: st.targetType, targetHitRate: st.targetHitRate })),
    })),
  };
}

function mapModule(m: DbModule, slot: DbSlot): RichModule {
  return {
    id: m.id,
    quantity: slot.quantity,
    antiAircraftCooperativeEfficiency: slot.antiAircraftCooperativeEfficiency,
    antiMissileProtectRatio: slot.antimissileprotectRatio,
    name: m.name,
    shortName: m.shortName,
    typeName: m.typeName,
    description: m.description,
    prioritizedTargetLabel: m.prioritizedTargetLabel,
    trajectory: m.trajectory,
    hangarCapacity: m.hangarCapacity,
    hangarCraftType: m.hangarCraftType,
    carriedCraftDpm: {
      antiShip: m.ccDpmAntiShip,
      antiAir: m.ccDpmAntiAir,
      siege: m.ccDpmSiege,
      hpRecovery: m.ccDpmHpRecovery,
      operationEfficiency: m.ccDpmOperationEfficiency,
    },
    weapon: m.weapon ? mapWeapon(m.weapon) : null,
    moduleEffects: m.moduleEffects.map((e) => ({
      name: e.name, value: e.value, attrName: e.attrName, attrDesc: e.attrDesc, desc: e.desc, descSimp: e.descSimp,
    })),
    carriedCraft: m.carriedCraft.map((c: DbCarriedCraft) => ({
      name: c.name,
      quantity: c.quantity,
      dpm: { antiShip: c.dpmAntiShip, antiAir: c.dpmAntiAir, siege: c.dpmSiege, hpRecovery: c.dpmHpRecovery, operationEfficiency: c.dpmOperationEfficiency },
      // Cast: inner systems share the same DB shape as ship-level systems; UAVs
      // never carry further craft so the one-level recursion stop is safe.
      systems: c.systems.map((s) => mapSystem(s as unknown as DbSystem)),
    })),
  };
}

function mapSystem(s: DbSystem): RichSystem {
  // Flatten slots → modules, carrying each slot's quantity onto its module.
  const modules: RichModule[] = [];
  for (const slot of s.slots) {
    for (const m of slot.modules) modules.push(mapModule(m, slot));
  }
  return {
    id: s.id,
    index: s.index,
    code: s.code,
    name: s.name,
    label: s.label,
    iconKey: s.iconKey,
    systemTypeName: s.systemTypeName,
    hp: s.hp,
    armor: s.armor,
    energyShield: s.energyShield,
    slotCount: s.slotCount,
    mainSystem: s.mainSystem,
    attackable: s.attackable,
    group: s.group,
    includedWithBlueprint: s.includedWithBlueprint,
    pointRequiredForUnlockGroup: s.pointRequiredForUnlockGroup,
    unlockRequired: s.unlockRequired,
    dpm: dpm(s),
    modules,
  };
}

export function mapRichShip(ship: DbShipRich, siblings?: Map<string, string>): RichShip {
  const img = resolveShipImage(
    { img: ship.img, name: ship.name, type: ship.type, hasVariants: true },
    siblings,
  );
  return {
    id: ship.id,
    gameId: ship.gameId,
    name: ship.name,
    shortName: ship.shortName,
    title: ship.title,
    description: ship.description,
    img,
    variant: ship.variant,
    variantName: ship.variantName,
    type: ship.type,
    manufacturer: { id: ship.manufacturer.id, name: ship.manufacturer.name, logo: ship.manufacturer.logo },
    rowPosition: ship.rowPosition,
    commandPoints: ship.commandPoints,
    serviceLimit: ship.serviceLimit,
    hp: ship.hp,
    armor: ship.armor,
    energyShield: ship.energyShield,
    armorRepairRate: ship.armorRepairRate,
    cruisingSpeed: ship.cruisingSpeed,
    warpSpeed: ship.warpSpeed,
    viewRadius: ship.viewRadius,
    storage: ship.storage,
    aircraftType: ship.aircraftType,
    aircraftDualPurpose: ship.aircraftDualPurpose,
    battleMoveTypeName: ship.battleMoveTypeName,
    aircraftFormationSize: ship.aircraftFormationSize,
    production: {
      metal: ship.prodMetal, crystal: ship.prodCrystal, deuterium: ship.prodDeuterium, buildTimeSeconds: ship.buildTimeSeconds,
    },
    dpm: dpm(ship),
    ratings: {
      antiShip: ship.ratingAntiShip,
      antiAir: ship.ratingAntiAir,
      siege: ship.ratingSiege,
      support: ship.ratingSupport,
      survivability: ship.ratingSurvivability,
      strategic: ship.ratingStrategic,
    },
    isSp: ship.isSp,
    bpType: ship.bpType,
    isRe: ship.isRe,
    features: ship.features,
    visible: ship.visible,
    hangarStats: ship.hangarStats.map((h) => ({
      craftType: h.craftType, capacity: h.capacity, carriesDualPurpose: h.carriesDualPurpose,
      slotQuantity: h.slotQuantity, systemName: h.systemName, moduleName: h.moduleName, moduleShortName: h.moduleShortName,
    })),
    affixes: ship.affixes.map((a) => ({ name: a.name, desc: a.desc })),
    fragments: ship.fragments.map((f) => ({
      fragmentId: f.fragmentId,
      name: f.fragment.name,
      desc: f.fragment.description,
      imagePath: f.fragment.imagePath,
      common: f.fragment.common,
      exchangeCost: f.fragment.exchangeCost,
      quantityRequired: f.quantityRequired,
      group: f.group,
      index: f.index,
    })),
    systems: ship.systems.map(mapSystem),
  };
}

export function mapRichShips(ships: DbShipRich[]): RichShip[] {
  const siblings = new Map<string, string>();
  for (const s of ships) {
    if (s.img) siblings.set(`${s.name}::${s.variant.toUpperCase()}`, s.img);
  }
  return ships.map((s) => mapRichShip(s, siblings));
}
