/**
 * Ship importer — parses the structure of output/json/ships.json and writes it
 * into the v4.0 normalized schema. Shared by:
 *   - scripts/import-ships.ts (CLI; also copies ship images into public/ships)
 *   - prisma/seed.ts          (npm run db:seed)
 *   - the admin JSON importer  (app/api/admin/import)
 *
 * The DB write is idempotent: ships are upserted by gameId so Ship.id (and
 * therefore any saved-fleet / blueprint references) stays stable across
 * re-imports. A ship's system subtree, hangar stats, affixes and fragment
 * links are deleted and rebuilt each run so stale rows never linger.
 *
 * This module never touches the filesystem — image copying lives in the CLI.
 */

import type { PrismaClient } from "@prisma/client";
import { isCombatType } from "../utils/shipModel";

// ----------------------------------------------------------------------------
// Source JSON shapes (loose — we read defensively).
// ----------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export interface ImportOptions {
  /**
   * Filenames (basenames) of images known to exist. When provided, the importer
   * repairs `img` references that point at a missing file by trying the
   * `<base>_a.<ext>` sibling (the variant-less source omits the "_a" suffix).
   */
  availableImages?: Set<string>;
  log?: (msg: string) => void;
}

export interface ImportResult {
  manufacturers: number;
  ships: number;
  systems: number;
  modules: number;
  fragments: number;
}

// Company logos under /public/ships/companies, keyed by the game manufacturer_id.
const LOGO_BY_EXTERNAL_ID: Readonly<Record<number, string>> = {
  1: "/ships/companies/jupiter_industries.png",
  2: "/ships/companies/noma_shipping.png",
  3: "/ships/companies/antonios_consortium.png",
  5: "/ships/companies/pangaea_heavy_industries.png",
  6: "/ships/companies/thunderbolt_group.png",
  7: "/ships/companies/hayreddin_clan.png",
  10: "/ships/companies/dawn_accord.png", // "Standard" = the Dawn Accord tech tree
};

const round = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 0);
const num = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) ? n : 0);
const numOrNull = (n: unknown): number | null => (typeof n === "number" && Number.isFinite(n) ? n : null);
const strOrNull = (s: unknown): string | null => (typeof s === "string" && s.length > 0 ? s : null);

/** Integer damage_per_minute fields (ship / system / slot / carried craft). */
function intDpm(dpm: Json) {
  const d = dpm ?? {};
  return {
    dpmAntiShip: round(d.anti_ship),
    dpmAntiAir: round(d.anti_air),
    dpmSiege: round(d.siege),
    dpmHpRecovery: round(d.hp_recovery),
    dpmOperationEfficiency: round(d.operation_efficiency),
  };
}

/** Float damage_per_minute fields (weapons only). */
function floatDpm(dpm: Json) {
  const d = dpm ?? {};
  return {
    dpmAntiShip: num(d.anti_ship),
    dpmAntiAir: num(d.anti_air),
    dpmSiege: num(d.siege),
    dpmHpRecovery: round(d.hp_recovery),
    dpmOperationEfficiency: round(d.operation_efficiency),
  };
}

/** Splits "SC002 - Quantum Scout" → title "Quantum Scout". */
function deriveTitle(name: string): string {
  const idx = name.indexOf(" - ");
  return idx >= 0 ? name.slice(idx + 3) : "";
}

/**
 * Resolves an img path against the set of files that actually exist:
 *   - file present                 → keep
 *   - "<base>_a.<ext>" present     → use it (variant-less source omits "_a")
 *   - neither present              → "" so the UI's class-icon fallback engages
 * When `available` is omitted (e.g. the seed without copied images) the path is
 * kept verbatim.
 */
function resolveImg(img: string | undefined, available?: Set<string>): string {
  if (!img) return "";
  if (!available) return img;
  const base = img.split("/").pop() ?? "";
  if (available.has(base)) return img;
  const dot = base.lastIndexOf(".");
  if (dot > 0) {
    const candidate = `${base.slice(0, dot)}_a${base.slice(dot)}`;
    if (available.has(candidate)) return img.slice(0, img.length - base.length) + candidate;
  }
  return ""; // truly missing — let resolveShipImage fall back
}

// ----------------------------------------------------------------------------
// Subtree builders (deep nested Prisma create payloads)
// ----------------------------------------------------------------------------

function buildWeapon(w: Json) {
  const aa = w.damage_per_minute?.anti_aircraft_effects ?? null;
  const buff = w.buff_applied ?? null;
  return {
    intervalSeconds: numOrNull(w.interval_seconds),
    cdTimeSeconds: numOrNull(w.cd_time_seconds),
    roundsPerCycle: numOrNull(w.rounds_per_cycle),
    ammoCount: numOrNull(w.ammo_count),
    operationCount: numOrNull(w.operation_count),
    operationValue: numOrNull(w.operation_value),
    operationStrength: numOrNull(w.operation_strength),
    weaponLevel: numOrNull(w.weapon_level),
    weaponTypeName: strOrNull(w.weapon_type_name),
    damageTypeName: strOrNull(w.damage_type_name),
    damagePerHit: numOrNull(w.damage_per_hit),
    healingValue: numOrNull(w.healing_value),
    durationSeconds: numOrNull(w.duration_seconds),
    aircraftRangeName: strOrNull(w.aircraft_range_name),
    attackRangeName: strOrNull(w.attack_range_name),
    specialTargetLogicName: strOrNull(w.special_target_logic_name),
    ...floatDpm(w.damage_per_minute),
    aaCooldownReductionPercent: numOrNull(aa?.cooldown_reduction_percent),
    aaDamagePerHitDelta: numOrNull(aa?.damage_per_hit_delta),
    aaDurationReductionPercent: numOrNull(aa?.duration_reduction_percent),
    buffEffectId: numOrNull(buff?.buff_effect_id),
    buffDesc: strOrNull(buff?.desc),
    buffAttrName: strOrNull(buff?.attr_name),
    buffAttrDescTemplate: strOrNull(buff?.attr_desc_template),
    buffAttrDesc: strOrNull(buff?.attr_desc),
    targetPriorities: {
      create: (w.target_priorities ?? []).map((tp: Json, i: number) => ({
        priorityRank: num(tp.priority_rank),
        order: i,
        shipTypes: {
          create: (tp.ship_types ?? []).map((st: Json, j: number) => ({
            targetType: String(st.target_type ?? ""),
            targetHitRate: round(st.target_hit_rate),
            order: j,
          })),
        },
      })),
    },
  };
}

function buildModule(m: Json) {
  return {
    name: String(m.name ?? ""),
    shortName: String(m.short_name ?? ""),
    typeName: String(m.type_name ?? ""),
    description: String(m.desc ?? ""),
    prioritizedTargetLabel: strOrNull(m.prioritized_target_label),
    trajectory: strOrNull(m.trajectory),
    hangarCapacity: numOrNull(m.hangar?.capacity),
    hangarCraftType: strOrNull(m.hangar?.craft_type),
    ccDpmAntiShip: round(m.carried_craft_damage_per_minute?.anti_ship),
    ccDpmAntiAir: round(m.carried_craft_damage_per_minute?.anti_air),
    ccDpmSiege: round(m.carried_craft_damage_per_minute?.siege),
    ccDpmHpRecovery: round(m.carried_craft_damage_per_minute?.hp_recovery),
    ccDpmOperationEfficiency: round(m.carried_craft_damage_per_minute?.operation_efficiency),
    moduleEffects: {
      create: (m.module_effects ?? []).map((me: Json, i: number) => ({
        name: String(me.name ?? ""),
        value: numOrNull(me.value),
        attrName: strOrNull(me.attr_name),
        attrDesc: strOrNull(me.attr_desc),
        desc: strOrNull(me.desc),
        descSimp: strOrNull(me.desc_simp),
        order: i,
      })),
    },
    carriedCraft: {
      create: (m.carried_craft ?? []).map((c: Json, i: number) => ({
        name: String(c.name ?? ""),
        quantity: round(c.quantity),
        order: i,
        ...intDpm(c.damage_per_minute),
      })),
    },
    weapon: m.weapon ? { create: buildWeapon(m.weapon) } : undefined,
  };
}

function buildSlot(sl: Json) {
  return {
    slotIndex: num(sl.slot_index),
    quantity: sl.quantity != null ? num(sl.quantity) : 1,
    antiAircraftCooperativeEfficiency: numOrNull(sl.anti_aircraft_cooperative_efficiency),
    ...intDpm(sl.damage_per_minute),
    modules: { create: (sl.modules ?? []).map(buildModule) },
  };
}

function buildSystem(sy: Json) {
  return {
    index: num(sy.index),
    code: strOrNull(sy.code),
    name: String(sy.name ?? ""),
    label: strOrNull(sy.label),
    iconKey: strOrNull(sy.icon_key),
    systemTypeName: String(sy.system_type_name ?? ""),
    hp: round(sy.hp),
    armor: round(sy.armor),
    energyShield: round(sy.energy_shield),
    slotCount: num(sy.slot_count),
    mainSystem: sy.main_system === true,
    attackable: sy.attackable === true,
    group: numOrNull(sy.group),
    includedWithBlueprint: typeof sy.included_with_blueprint === "boolean" ? sy.included_with_blueprint : null,
    pointRequiredForUnlockGroup: numOrNull(sy.point_required_for_unlock_group),
    unlockRequired: typeof sy.unlock_required === "boolean" ? sy.unlock_required : null,
    ...intDpm(sy.damage_per_minute),
    slots: { create: (sy.slots ?? []).map(buildSlot) },
  };
}

// ----------------------------------------------------------------------------
// Driver
// ----------------------------------------------------------------------------

/**
 * Imports `shipsJson` (the parsed contents of ships.json — an object keyed by
 * ship id) into the database via the supplied Prisma client.
 */
export async function importShips(prisma: PrismaClient, shipsJson: Json, opts: ImportOptions = {}): Promise<ImportResult> {
  const log = opts.log ?? (() => undefined);
  const ships: Json[] = Array.isArray(shipsJson) ? shipsJson : Object.values(shipsJson);

  // 1. Manufacturers — upsert by name, record externalId + logo.
  const seen = new Map<string, { externalId: number | null }>();
  for (const s of ships) {
    const name = (s.manufacturer as string) || "Unknown";
    if (!seen.has(name)) seen.set(name, { externalId: numOrNull(s.manufacturer_id) });
  }
  const manufacturerIdByName = new Map<string, number>();
  for (const [name, { externalId }] of seen) {
    const logo = externalId != null ? (LOGO_BY_EXTERNAL_ID[externalId] ?? null) : null;
    const row = await prisma.manufacturer.upsert({
      where: { name },
      update: { externalId, logo },
      create: { name, externalId, logo },
    });
    manufacturerIdByName.set(name, row.id);
  }
  log(`Manufacturers: ${manufacturerIdByName.size}`);

  // 2. Ships.
  let moduleCount = 0;
  for (const s of ships) {
    const manufacturerId = manufacturerIdByName.get((s.manufacturer as string) || "Unknown")!;
    const systems: Json[] = Array.isArray(s.systems) ? s.systems : [];
    moduleCount += systems.reduce((acc, sy) => acc + (sy.slots ?? []).reduce((a: number, sl: Json) => a + (sl.modules ?? []).length, 0), 0);

    const name = String(s.name ?? s.short_name ?? `Ship ${s.ship_id}`);

    const childCreate = {
      systems: { create: systems.map(buildSystem) },
      hangarStats: {
        create: (s.hangar_stats ?? []).map((h: Json) => ({
          craftType: String(h.craft_type ?? ""),
          capacity: num(h.capacity),
          carriesDualPurpose: h.carriesDualPurpose === true,
          slotQuantity: num(h.slot_quantity),
          systemName: strOrNull(h.system_name),
          moduleName: strOrNull(h.module_name),
          moduleShortName: strOrNull(h.module_short_name),
        })),
      },
      affixes: {
        create: (s.affixes ?? []).map((a: Json, i: number) => ({
          name: String(a.name ?? ""),
          desc: strOrNull(a.desc),
          order: i,
        })),
      },
      fragments: {
        create: (s.fragments ?? []).map((f: Json) => ({
          quantityRequired: num(f.quantity_required),
          group: numOrNull(f.group),
          index: numOrNull(f.index),
          fragment: {
            connectOrCreate: {
              where: { gameId: num(f.fragment_id) },
              create: {
                gameId: num(f.fragment_id),
                name: String(f.name ?? ""),
                description: strOrNull(f.desc),
                imagePath: strOrNull(f.image_path),
                common: f.common === true,
                exchangeCost: num(f.exchange_cost),
              },
            },
          },
        })),
      },
    };

    const scalars = {
      name,
      shortName: String(s.short_name ?? ""),
      title: deriveTitle(name),
      description: String(s.desc ?? ""),
      img: resolveImg(s.img, opts.availableImages),
      variant: String(s.variant ?? "A"),
      variantName: String(s.variant_name ?? ""),
      type: String(s.type ?? "Unknown"),
      manufacturer: { connect: { id: manufacturerId } },
      rowPosition: String(s.row_position ?? "Front"),
      commandPoints: num(s.command_points),
      serviceLimit: num(s.service_limit),
      hp: round(s.hp),
      armor: round(s.armor),
      energyShield: round(s.energy_shield),
      armorRepairRate: num(s.armor_repair_rate),
      cruisingSpeed: round(s.cruising_speed),
      warpSpeed: round(s.warp_speed),
      viewRadius: round(s.view_radius),
      storage: round(s.storage),
      aircraftType: strOrNull(s.aircraft_stats?.aircraft_type),
      aircraftDualPurpose: s.aircraft_stats?.aircraft_dual_purpose === true,
      battleMoveTypeName: strOrNull(s.aircraft_stats?.battle_move_type_name),
      aircraftFormationSize: numOrNull(s.aircraft_formation_size),
      prodMetal: round(s.production_cost?.metal),
      prodCrystal: round(s.production_cost?.crystal),
      prodDeuterium: round(s.production_cost?.deuterium),
      buildTimeSeconds: round(s.production_cost?.build_time_seconds),
      ...intDpm(s.damage_per_minute),
      ratingAntiShip: strOrNull(s.ratings?.anti_ship),
      ratingAntiAir: strOrNull(s.ratings?.anti_air),
      ratingSiege: strOrNull(s.ratings?.siege),
      ratingSupport: strOrNull(s.ratings?.support),
      ratingSurvivability: strOrNull(s.ratings?.survivability),
      ratingStrategic: strOrNull(s.ratings?.strategic),
      isSp: num(s.is_sp),
      bpType: num(s.bp_type),
      isRe: num(s.is_re),
      features: Array.isArray(s.features) ? s.features.map((f: Json) => String(f)) : [],
      visible: isCombatType(String(s.type ?? "")),
    };

    const gameId = num(s.ship_id);
    const existing = gameId ? await prisma.ship.findUnique({ where: { gameId }, select: { id: true } }) : null;

    if (existing) {
      // Wipe the rebuilt subtree (systems cascade to slots/modules/weapons/etc.)
      await prisma.system.deleteMany({ where: { shipId: existing.id } });
      await prisma.shipHangarStat.deleteMany({ where: { shipId: existing.id } });
      await prisma.shipAffix.deleteMany({ where: { shipId: existing.id } });
      await prisma.shipFragment.deleteMany({ where: { shipId: existing.id } });
      await prisma.ship.update({ where: { id: existing.id }, data: { ...scalars, ...childCreate } });
    } else {
      await prisma.ship.create({ data: { gameId: gameId || null, ...scalars, ...childCreate } });
    }
  }

  const [shipCount, fragmentCount] = await Promise.all([prisma.ship.count(), prisma.blueprintFragment.count()]);
  log(`Ships: ${shipCount}, modules: ${moduleCount}, fragments: ${fragmentCount}`);

  return {
    manufacturers: manufacturerIdByName.size,
    ships: shipCount,
    systems: await prisma.system.count(),
    modules: moduleCount,
    fragments: fragmentCount,
  };
}
