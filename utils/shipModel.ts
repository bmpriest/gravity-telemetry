/**
 * "Rich" ship view model — the faithful, normalized representation of a ship as
 * stored in the v4.0 schema and served by /api/ships/rich. The System Library,
 * Blueprint Library, the shared System View, and the admin panel all consume
 * these types. (The fleet builder and blueprint tracker still consume the
 * trimmed legacy `AllShip` shape from utils/ships.ts, produced by the legacy
 * mapper — see lib/shipMapper.ts.)
 */

import { DPM_META } from "@/utils/icons";

// ----------------------------------------------------------------------------
// Type vocabularies
// ----------------------------------------------------------------------------

/** The nine player-buildable combat types, in canonical (ascending) order. */
export const COMBAT_SHIP_TYPES = [
  "Fighter", "Corvette", "Frigate", "Destroyer", "Cruiser",
  "Battlecruiser", "Auxiliary Ship", "Carrier", "Battleship",
] as const;

/** Supercapital types — these get system codes and appear in the System Library. */
export const SUPERCAPITAL_TYPES = ["Battlecruiser", "Auxiliary Ship", "Carrier", "Battleship"] as const;

/** Blueprint Library grouping order, descending (Battleship at the top). */
export const BLUEPRINT_TYPE_ORDER = [
  "Battleship", "Carrier", "Auxiliary Ship", "Battlecruiser",
  "Cruiser", "Destroyer", "Frigate", "Corvette", "Fighter",
] as const;

export function isSupercapital(type: string): boolean {
  return (SUPERCAPITAL_TYPES as readonly string[]).includes(type);
}

export function isCombatType(type: string): boolean {
  return (COMBAT_SHIP_TYPES as readonly string[]).includes(type);
}

// ----------------------------------------------------------------------------
// Rich model interfaces (the serialized shape of /api/ships/rich)
// ----------------------------------------------------------------------------

export interface Dpm {
  antiShip: number;
  antiAir: number;
  siege: number;
  hpRecovery: number;
  operationEfficiency: number;
}

export interface RichTargetType {
  targetType: string;
  targetHitRate: number;
}

export interface RichTargetPriority {
  priorityRank: number;
  shipTypes: RichTargetType[];
}

export interface RichWeapon {
  intervalSeconds: number | null;
  cdTimeSeconds: number | null;
  lockOnTimeSeconds: number | null;
  roundsPerCycle: number | null;
  ammoCount: number | null;
  operationCount: number | null;
  operationValue: number | null;
  operationStrength: number | null;
  weaponLevel: number | null;
  weaponTypeName: string | null;
  damageTypeName: string | null;
  damagePerHit: number | null;
  healingValue: number | null;
  durationSeconds: number | null;
  aircraftRangeName: string | null;
  attackRangeName: string | null;
  specialTargetLogicName: string | null;
  earlyWarningEfficiency: number | null;
  dpm: Dpm;
  aaCooldownReductionPercent: number | null;
  aaDamagePerHitDelta: number | null;
  aaDurationReductionPercent: number | null;
  buff: {
    effectId: number | null;
    desc: string | null;
    attrName: string | null;
    attrDescTemplate: string | null;
    attrDesc: string | null;
  } | null;
  targetPriorities: RichTargetPriority[];
}

export interface RichModuleEffect {
  name: string;
  value: number | null;
  attrName: string | null;
  attrDesc: string | null;
  desc: string | null;
  descSimp: string | null;
}

export interface RichCarriedCraft {
  name: string;
  quantity: number;
  dpm: Dpm;
  systems: RichSystem[];
}

export interface RichModule {
  id: number;
  /** slot.quantity — how many of this module the slot mounts (x1, x2, …). */
  quantity: number;
  antiAircraftCooperativeEfficiency: number | null;
  /** slot.antimissileprotect_ratio — anti-missile protection efficiency for this slot. */
  antiMissileProtectRatio: number | null;
  name: string;
  shortName: string;
  typeName: string;
  description: string;
  prioritizedTargetLabel: string | null;
  trajectory: string | null;
  hangarCapacity: number | null;
  hangarCraftType: string | null;
  carriedCraftDpm: Dpm;
  weapon: RichWeapon | null;
  moduleEffects: RichModuleEffect[];
  carriedCraft: RichCarriedCraft[];
}

export interface RichSystem {
  id: number;
  index: number;
  code: string | null;
  name: string;
  label: string | null;
  iconKey: string | null;
  systemTypeName: string;
  hp: number;
  armor: number;
  energyShield: number;
  slotCount: number;
  mainSystem: boolean;
  attackable: boolean;
  group: number | null;
  includedWithBlueprint: boolean | null;
  pointRequiredForUnlockGroup: number | null;
  unlockRequired: boolean | null;
  dpm: Dpm;
  /** Modules flattened across slots, each carrying its slot's quantity. */
  modules: RichModule[];
}

export interface RichHangarStat {
  craftType: string;
  capacity: number;
  carriesDualPurpose: boolean;
  slotQuantity: number;
  systemName: string | null;
  moduleName: string | null;
  moduleShortName: string | null;
}

export interface RichFragment {
  fragmentId: number;
  name: string;
  desc: string | null;
  imagePath: string | null;
  common: boolean;
  exchangeCost: number;
  quantityRequired: number;
  group: number | null;
  index: number | null;
}

export interface RichShip {
  id: number;
  gameId: number | null;
  name: string;
  shortName: string;
  title: string;
  description: string;
  img: string;
  variant: string;
  variantName: string;
  type: string;
  manufacturer: { id: number; name: string; logo: string | null };
  rowPosition: string;
  commandPoints: number;
  serviceLimit: number;
  hp: number;
  armor: number;
  energyShield: number;
  armorRepairRate: number;
  cruisingSpeed: number;
  warpSpeed: number;
  viewRadius: number;
  storage: number;
  aircraftType: string | null;
  aircraftDualPurpose: boolean;
  battleMoveTypeName: string | null;
  aircraftFormationSize: number | null;
  production: { metal: number; crystal: number; deuterium: number; buildTimeSeconds: number };
  dpm: Dpm;
  ratings: {
    antiShip: string | null;
    antiAir: string | null;
    siege: string | null;
    support: string | null;
    survivability: string | null;
    strategic: string | null;
  };
  isSp: number;
  bpType: number;
  isRe: number;
  features: string[];
  visible: boolean;
  hangarStats: RichHangarStat[];
  affixes: { name: string; desc: string | null }[];
  fragments: RichFragment[];
  systems: RichSystem[];
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Maps the game's aircraft_type to the carrier-slot size vocabulary. */
export function aircraftSize(aircraftType: string | null | undefined): "Small" | "Medium" | "Large" | null {
  switch (aircraftType) {
    case "Light": return "Small";
    case "Mid": return "Medium";
    case "Heavy": return "Large";
    default: return null;
  }
}

/**
 * Hangar / aircraft module_effects carry a malformed `value` whose last two
 * digits encode the carried quantity (e.g. 1210104 → 4). Decodes that.
 */
export function decodeHangarQuantity(value: number | null | undefined): number {
  if (value == null) return 0;
  return Math.abs(value) % 100;
}

/** Sort rank for a system code: M first, then A, B, C … ; uncoded last by index. */
function codeRank(system: RichSystem): [number, number, number] {
  if (!system.code) return [2, system.index, 0];
  const letter = system.code[0].toUpperCase();
  const num = parseInt(system.code.slice(1), 10) || 0;
  const letterOrder = letter === "M" ? -1 : letter.charCodeAt(0) - 65; // A=0, B=1, …
  return [0, letterOrder, num];
}

/** Orders systems for the library: M, then A, B, C … then the uncoded bases. */
export function sortSystemsForLibrary(systems: RichSystem[]): RichSystem[] {
  return [...systems].sort((a, b) => {
    const ra = codeRank(a);
    const rb = codeRank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
  });
}

export function formatBuildTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}

export interface PrimaryStat {
  key: string;
  label: string;
  value: string;
  icon: string;
}

/**
 * The headline stats for a system, chosen by its type:
 *  - Weapon         → non-zero DPM categories
 *  - Armor          → HP / armor / energy shield it adds
 *  - Hangar         → carried capacity
 *  - everything else → whatever non-zero stats it has (HP, DPM, …)
 */
export function getSystemPrimaryStats(system: RichSystem): PrimaryStat[] {
  const stats: PrimaryStat[] = [];
  const pushDpm = () => {
    (["antiShip", "antiAir", "siege", "hpRecovery", "operationEfficiency"] as const).forEach((k) => {
      const v = system.dpm[k];
      if (v) stats.push({ key: k, label: `${DPM_META[k].label} DPM`, value: Math.round(v).toLocaleString(), icon: DPM_META[k].icon });
    });
  };

  switch (system.systemTypeName) {
    case "Weapon":
      pushDpm();
      break;
    case "Armor":
      if (system.hp) stats.push({ key: "hp", label: "HP", value: system.hp.toLocaleString(), icon: "/weapons/stats/extraHp.svg" });
      if (system.armor) stats.push({ key: "armor", label: "Armor", value: system.armor.toLocaleString(), icon: "/weapons/stats/armor.svg" });
      if (system.energyShield) stats.push({ key: "shield", label: "Energy Shield", value: system.energyShield.toLocaleString(), icon: "/weapons/stats/energyShield.svg" });
      break;
    case "Hangar": {
      const capacity = system.modules.reduce((sum, m) => sum + (m.hangarCapacity ?? 0) * m.quantity, 0);
      if (capacity) stats.push({ key: "capacity", label: "Hangar Capacity", value: capacity.toLocaleString(), icon: "/weapons/icons/aircraft.png" });
      pushDpm();
      break;
    }
    default:
      pushDpm();
      if (system.hp) stats.push({ key: "hp", label: "HP", value: system.hp.toLocaleString(), icon: "/weapons/stats/extraHp.svg" });
      break;
  }

  // Fallback: a UAV/support system with no headline stat still shows its HP.
  if (stats.length === 0 && system.hp) {
    stats.push({ key: "hp", label: "HP", value: system.hp.toLocaleString(), icon: "/weapons/stats/extraHp.svg" });
  }
  return stats;
}

/**
 * The single most-important DPM value for a module card, picked from its
 * prioritized_target_label (or weapon damage type), per the v4.0 spec:
 *   Large/Small Ship → Anti-Ship | Aircraft → Anti-Air | Building → Siege |
 *   Control → Operation Efficiency | Healing → HP Recovery
 */
export function getModulePrimaryDpm(module: RichModule): { key: keyof Dpm; label: string; icon: string; value: number } | null {
  const dpm = module.weapon?.dpm;
  if (!dpm) return null;

  let key: keyof Dpm | null = null;
  const label = module.prioritizedTargetLabel;
  const dmgType = module.weapon?.damageTypeName;

  if (label === "Large Ship" || label === "Small Ship") key = "antiShip";
  else if (label === "Aircraft") key = "antiAir";
  else if (label === "Building") key = "siege";
  else if (dmgType === "Control") key = "operationEfficiency";
  else if (dmgType === "Healing") key = "hpRecovery";
  else {
    // No explicit prioritized target — fall back to the largest non-zero DPM.
    const entries = (Object.keys(dpm) as (keyof Dpm)[]).filter((k) => dpm[k] > 0);
    if (entries.length === 0) return null;
    key = entries.sort((a, b) => dpm[b] - dpm[a])[0];
  }

  const v = dpm[key];
  if (!v) return null;
  return { key, label: DPM_META[key].label, icon: DPM_META[key].icon, value: v };
}

/** Group ships into one entry per (type, shortName), preferring the "A" variant. */
export function groupVariants(ships: RichShip[]): { primary: RichShip; variants: RichShip[] }[] {
  const groups = new Map<string, RichShip[]>();
  for (const s of ships) {
    const key = `${s.type}::${s.shortName}`;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  const out: { primary: RichShip; variants: RichShip[] }[] = [];
  for (const arr of groups.values()) {
    const variants = [...arr].sort((a, b) => a.variant.localeCompare(b.variant));
    const primary = variants.find((v) => v.variant === "A") ?? variants[0];
    out.push({ primary, variants });
  }
  return out;
}
