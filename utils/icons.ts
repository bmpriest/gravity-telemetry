/**
 * Icon resolution for ship systems and damage-per-minute categories.
 *
 * Systems carry an `iconKey` from ships.json (e.g. "icon_system_type_battle").
 * When present we map it to one of the pre-existing assets under
 * /public/weapons/icons; otherwise we fall back to the `systemTypeName`
 * ("Weapon", "Armor", …). Either way the result is a path that resolves, so
 * the System View never shows a broken icon.
 */

const ICON_BASE = "/weapons/icons";

const ICON_KEY_MAP: Readonly<Record<string, string>> = {
  icon_system_type_battle: "cannon.png",
  icon_system_armor: "armor.png",
  icon_system_type_command: "command.png",
  icon_system_dynamic: "speed.png",
  icon_system_hangar: "aircraft.png",
  icon_system_engineering: "storage.png",
  icon_system_type_subsystem: "jamming.png",
};

const SYSTEM_TYPE_MAP: Readonly<Record<string, string>> = {
  Weapon: "cannon.png",
  Armor: "armor.png",
  Command: "command.png",
  Power: "speed.png",
  Hangar: "aircraft.png",
  Subsystem: "jamming.png",
};

/** Returns the icon path for a system, preferring its iconKey. */
export function resolveSystemIcon(iconKey: string | null | undefined, systemTypeName: string | null | undefined): string {
  if (iconKey && ICON_KEY_MAP[iconKey]) return `${ICON_BASE}/${ICON_KEY_MAP[iconKey]}`;
  if (systemTypeName && SYSTEM_TYPE_MAP[systemTypeName]) return `${ICON_BASE}/${SYSTEM_TYPE_MAP[systemTypeName]}`;
  return `${ICON_BASE}/unknown.png`;
}

/** [label, icon path] for each damage-per-minute category. */
export const DPM_META: Readonly<Record<string, { label: string; icon: string }>> = {
  antiShip: { label: "Anti-Ship", icon: "/weapons/stats/antiship.svg" },
  antiAir: { label: "Anti-Air", icon: "/weapons/stats/antiair.svg" },
  siege: { label: "Siege", icon: "/weapons/stats/siege.svg" },
  hpRecovery: { label: "HP Recovery", icon: "/weapons/stats/hpRecovery.svg" },
  operationEfficiency: { label: "Operation Efficiency", icon: "/weapons/types/operationCount.svg" },
};
