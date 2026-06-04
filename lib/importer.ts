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

/**
 * Unrecognized fields detected during an import, grouped by the object type
 * they appeared on. Each entry records how many source objects contained the
 * field and one representative value so the caller can decide whether the
 * schema needs updating.
 */
export type UnknownFieldReport = Record<
  string,
  Record<string, { count: number; example: unknown }>
>;

export interface ImportResult {
  manufacturers: number;
  ships: number;
  systems: number;
  modules: number;
  fragments: number;
  /** Fields present in ships.json that have no corresponding DB column. */
  unknownFields: UnknownFieldReport;
}

// ----------------------------------------------------------------------------
// Known-key sets — every key we intentionally read from each object type.
// Any key present in the source but absent from the matching set is surfaced
// in the UnknownFieldReport so new game data does not get silently dropped.
// ----------------------------------------------------------------------------

const SHIP_KEYS = [
  "manufacturer", "manufacturer_id", "ship_id", "name", "short_name", "desc",
  "img", "variant", "variant_name", "type", "row_position", "command_points",
  "service_limit", "hp", "armor", "energy_shield", "armor_repair_rate",
  "cruising_speed", "warp_speed", "view_radius", "storage", "aircraft_stats",
  "aircraft_formation_size", "production_cost", "damage_per_minute", "ratings",
  "is_sp", "bp_type", "is_re", "features", "systems", "hangar_stats",
  "affixes", "fragments",
] as const;

const AIRCRAFT_STATS_KEYS = [
  "aircraft_type", "aircraft_dual_purpose", "battle_move_type_name",
] as const;

const PRODUCTION_COST_KEYS = [
  "metal", "crystal", "deuterium", "build_time_seconds",
] as const;

const RATINGS_KEYS = [
  "anti_ship", "anti_air", "siege", "support", "survivability", "strategic",
] as const;

// Shared by ship / system / slot / carried-craft DPM objects (integer rounding).
const DPM_KEYS = [
  "anti_ship", "anti_air", "siege", "hp_recovery", "operation_efficiency",
] as const;

const SYSTEM_KEYS = [
  "index", "code", "name", "label", "icon_key", "system_type_name",
  "hp", "armor", "energy_shield", "slot_count", "main_system", "attackable",
  "group", "included_with_blueprint", "point_required_for_unlock_group",
  "unlock_required", "damage_per_minute", "slots",
] as const;

const SLOT_KEYS = [
  "slot_index", "quantity", "anti_aircraft_cooperative_efficiency",
  "antimissileprotect_ratio", "damage_per_minute", "modules",
] as const;

const MODULE_KEYS = [
  "name", "short_name", "type_name", "desc", "prioritized_target_label",
  "trajectory", "hangar", "carried_craft_damage_per_minute",
  "module_effects", "carried_craft", "weapon",
] as const;

const MODULE_HANGAR_KEYS = ["capacity", "craft_type"] as const;

const MODULE_EFFECT_KEYS = [
  "name", "value", "attr_name", "attr_desc", "desc", "desc_simp",
] as const;

const CARRIED_CRAFT_KEYS = [
  "name", "quantity", "damage_per_minute", "systems",
] as const;

// weapon.damage_per_minute has an extra anti_aircraft_effects sub-object.
const WEAPON_DPM_KEYS = [
  "anti_ship", "anti_air", "siege", "hp_recovery", "operation_efficiency",
  "anti_aircraft_effects",
] as const;

const AA_EFFECTS_KEYS = [
  "cooldown_reduction_percent", "damage_per_hit_delta", "duration_reduction_percent",
] as const;

const BUFF_APPLIED_KEYS = [
  "buff_effect_id", "desc", "attr_name", "attr_desc_template", "attr_desc",
] as const;

const WEAPON_KEYS = [
  "interval_seconds", "cd_time_seconds", "lock_on_time_seconds",
  "rounds_per_cycle", "ammo_count", "operation_count", "operation_value",
  "operation_strength", "weapon_level", "weapon_type_name", "damage_type_name",
  "damage_per_hit", "healing_value", "duration_seconds", "aircraft_range_name",
  "attack_range_name", "special_target_logic_name", "early_warning_efficiency",
  "damage_per_minute", "buff_applied", "target_priorities",
] as const;

const TARGET_PRIORITY_KEYS = ["priority_rank", "ship_types"] as const;

const SHIP_TYPE_TARGET_KEYS = ["target_type", "target_hit_rate"] as const;

const HANGAR_STAT_KEYS = [
  "craft_type", "capacity", "carriesDualPurpose", "slot_quantity",
  "system_name", "module_name", "module_short_name",
] as const;

const AFFIX_KEYS = ["name", "desc"] as const;

const FRAGMENT_KEYS = [
  "quantity_required", "group", "index", "fragment_id", "name", "desc",
  "image_path", "common", "exchange_cost",
] as const;

// ----------------------------------------------------------------------------
// Field tracker — accumulates unrecognized keys during a single import run.
// ----------------------------------------------------------------------------

class FieldTracker {
  private readonly unknowns = new Map<
    string,
    Map<string, { count: number; example: unknown }>
  >();

  /**
   * Compare `obj`'s own keys against `knownKeys`. Any extra key is recorded
   * under `context` with a count and one example value. Null / non-object
   * values are ignored so callers can pass optional nested objects directly.
   */
  check(context: string, obj: Json, knownKeys: readonly string[]): void {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const known = new Set<string>(knownKeys);
    for (const [k, v] of Object.entries(obj as object)) {
      if (known.has(k)) continue;
      let ctx = this.unknowns.get(context);
      if (!ctx) { ctx = new Map(); this.unknowns.set(context, ctx); }
      const entry = ctx.get(k);
      if (entry) { entry.count++; }
      else { ctx.set(k, { count: 1, example: v }); }
    }
  }

  hasUnknowns(): boolean { return this.unknowns.size > 0; }

  report(): UnknownFieldReport {
    const out: UnknownFieldReport = {};
    for (const [ctx, fields] of this.unknowns) {
      out[ctx] = {};
      for (const [k, info] of fields) {
        out[ctx][k] = info;
      }
    }
    return out;
  }
}

// ----------------------------------------------------------------------------
// Company logos under /public/ships/companies, keyed by the game manufacturer_id.
// ----------------------------------------------------------------------------

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

function buildWeapon(w: Json, tracker?: FieldTracker) {
  tracker?.check("weapon", w, WEAPON_KEYS);
  tracker?.check("weapon.damage_per_minute", w.damage_per_minute, WEAPON_DPM_KEYS);
  tracker?.check("weapon.damage_per_minute.anti_aircraft_effects", w.damage_per_minute?.anti_aircraft_effects, AA_EFFECTS_KEYS);
  tracker?.check("weapon.buff_applied", w.buff_applied, BUFF_APPLIED_KEYS);

  const aa = w.damage_per_minute?.anti_aircraft_effects ?? null;
  const buff = w.buff_applied ?? null;
  return {
    intervalSeconds: numOrNull(w.interval_seconds),
    cdTimeSeconds: numOrNull(w.cd_time_seconds),
    lockOnTimeSeconds: numOrNull(w.lock_on_time_seconds),
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
    earlyWarningEfficiency: numOrNull(w.early_warning_efficiency),
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
      create: (w.target_priorities ?? []).map((tp: Json, i: number) => {
        tracker?.check("weapon.target_priority", tp, TARGET_PRIORITY_KEYS);
        return {
          priorityRank: num(tp.priority_rank),
          order: i,
          shipTypes: {
            create: (tp.ship_types ?? []).map((st: Json, j: number) => {
              tracker?.check("weapon.target_priority.ship_type", st, SHIP_TYPE_TARGET_KEYS);
              return {
                targetType: String(st.target_type ?? ""),
                targetHitRate: round(st.target_hit_rate),
                order: j,
              };
            }),
          },
        };
      }),
    },
  };
}

function buildModule(m: Json, tracker?: FieldTracker) {
  tracker?.check("module", m, MODULE_KEYS);
  tracker?.check("module.hangar", m.hangar, MODULE_HANGAR_KEYS);
  tracker?.check("module.carried_craft_damage_per_minute", m.carried_craft_damage_per_minute, DPM_KEYS);
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
      create: (m.module_effects ?? []).map((me: Json, i: number) => {
        tracker?.check("module.effect", me, MODULE_EFFECT_KEYS);
        return {
          name: String(me.name ?? ""),
          value: numOrNull(me.value),
          attrName: strOrNull(me.attr_name),
          attrDesc: strOrNull(me.attr_desc),
          desc: strOrNull(me.desc),
          descSimp: strOrNull(me.desc_simp),
          order: i,
        };
      }),
    },
    carriedCraft: {
      create: (m.carried_craft ?? []).map((c: Json, i: number) => {
        tracker?.check("module.carried_craft", c, CARRIED_CRAFT_KEYS);
        tracker?.check("module.carried_craft.damage_per_minute", c.damage_per_minute, DPM_KEYS);
        return {
          name: String(c.name ?? ""),
          quantity: round(c.quantity),
          order: i,
          ...intDpm(c.damage_per_minute),
          systems: Array.isArray(c.systems) && c.systems.length > 0
            ? { create: c.systems.map((sy: Json) => buildSystem(sy, tracker)) }
            : undefined,
        };
      }),
    },
    weapon: m.weapon ? { create: buildWeapon(m.weapon, tracker) } : undefined,
  };
}

function buildSlot(sl: Json, tracker?: FieldTracker) {
  tracker?.check("slot", sl, SLOT_KEYS);
  tracker?.check("slot.damage_per_minute", sl.damage_per_minute, DPM_KEYS);
  return {
    slotIndex: num(sl.slot_index),
    quantity: sl.quantity != null ? num(sl.quantity) : 1,
    antiAircraftCooperativeEfficiency: numOrNull(sl.anti_aircraft_cooperative_efficiency),
    antimissileprotectRatio: numOrNull(sl.antimissileprotect_ratio),
    ...intDpm(sl.damage_per_minute),
    modules: { create: (sl.modules ?? []).map((m: Json) => buildModule(m, tracker)) },
  };
}

function buildSystem(sy: Json, tracker?: FieldTracker) {
  tracker?.check("system", sy, SYSTEM_KEYS);
  tracker?.check("system.damage_per_minute", sy.damage_per_minute, DPM_KEYS);
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
    slots: { create: (sy.slots ?? []).map((sl: Json) => buildSlot(sl, tracker)) },
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
  const tracker = new FieldTracker();

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
    tracker.check("ship", s, SHIP_KEYS);
    tracker.check("ship.aircraft_stats", s.aircraft_stats, AIRCRAFT_STATS_KEYS);
    tracker.check("ship.production_cost", s.production_cost, PRODUCTION_COST_KEYS);
    tracker.check("ship.ratings", s.ratings, RATINGS_KEYS);
    tracker.check("ship.damage_per_minute", s.damage_per_minute, DPM_KEYS);

    const manufacturerId = manufacturerIdByName.get((s.manufacturer as string) || "Unknown")!;
    const systems: Json[] = Array.isArray(s.systems) ? s.systems : [];
    moduleCount += systems.reduce((acc, sy) => acc + (sy.slots ?? []).reduce((a: number, sl: Json) => a + (sl.modules ?? []).length, 0), 0);

    const name = String(s.name ?? s.short_name ?? `Ship ${s.ship_id}`);

    const childCreate = {
      systems: { create: systems.map((sy: Json) => buildSystem(sy, tracker)) },
      hangarStats: {
        create: (s.hangar_stats ?? []).map((h: Json) => {
          tracker.check("ship.hangar_stat", h, HANGAR_STAT_KEYS);
          return {
            craftType: String(h.craft_type ?? ""),
            capacity: num(h.capacity),
            carriesDualPurpose: h.carriesDualPurpose === true,
            slotQuantity: num(h.slot_quantity),
            systemName: strOrNull(h.system_name),
            moduleName: strOrNull(h.module_name),
            moduleShortName: strOrNull(h.module_short_name),
          };
        }),
      },
      affixes: {
        create: (s.affixes ?? []).map((a: Json, i: number) => {
          tracker.check("ship.affix", a, AFFIX_KEYS);
          return {
            name: String(a.name ?? ""),
            desc: strOrNull(a.desc),
            order: i,
          };
        }),
      },
      fragments: {
        create: (s.fragments ?? []).map((f: Json) => {
          tracker.check("ship.fragment", f, FRAGMENT_KEYS);
          return {
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
          };
        }),
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

  // 3. Report unrecognized fields.
  const unknownFields = tracker.report();
  if (tracker.hasUnknowns()) {
    log("WARNING: unrecognized fields in ships.json (possible new game data):");
    for (const [ctx, fields] of Object.entries(unknownFields)) {
      for (const [k, { count, example }] of Object.entries(fields)) {
        log(`  [${ctx}] "${k}" — ${count}× — e.g. ${JSON.stringify(example)}`);
      }
    }
  }

  return {
    manufacturers: manufacturerIdByName.size,
    ships: shipCount,
    systems: await prisma.system.count(),
    modules: moduleCount,
    fragments: fragmentCount,
    unknownFields,
  };
}
