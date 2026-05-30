/**
 * Legacy compatibility mapper. Produces the v3 `AllShip` shape (utils/ships.ts)
 * from the v4.0 normalized schema so the fleet builder and blueprint tracker —
 * which still consume `useUserStore.shipData` as `AllShip[]` — keep working
 * without a rewrite.
 *
 * What the legacy consumers actually read:
 *   - identity: id, name, title, variant, variantName, hasVariants, manufacturer, img
 *   - fleet:    type, row, commandPoints, serviceLimit, fighterType, dualPurpose,
 *               carrier capacities (direct fields + supercap module hangars)
 *   - tracker:  fragments / isFragmentUnlocked, and per-supercap "modules"
 *               (one per coded system) with { id, system, name, img, default }.
 *
 * The richer rendering (System/Blueprint Library) uses the RichShip model
 * instead — see lib/richShipMapper.ts.
 */

import type { Prisma } from "@prisma/client";
import type { AllShip } from "@/utils/ships";
import { resolveShipImage } from "@/utils/ships";
import { resolveSystemIcon } from "@/utils/icons";
import { aircraftSize, isSupercapital } from "@/utils/shipModel";

export const legacyShipInclude = {
  manufacturer: true,
  hangarStats: true,
  fragments: { select: { fragmentId: true, quantityRequired: true } },
  systems: {
    orderBy: { index: "asc" as const },
    select: {
      id: true,
      code: true,
      name: true,
      iconKey: true,
      systemTypeName: true,
      includedWithBlueprint: true,
      hp: true,
      armor: true,
      energyShield: true,
      dpmAntiShip: true,
      dpmAntiAir: true,
      dpmSiege: true,
      slots: {
        orderBy: { slotIndex: "asc" as const },
        select: {
          quantity: true,
          modules: { select: { id: true, hangarCraftType: true, hangarCapacity: true } },
        },
      },
    },
  },
} satisfies Prisma.ShipInclude;

type DbShipLegacy = Prisma.ShipGetPayload<{ include: typeof legacyShipInclude }>;

const HANGER_BY_CRAFT: Readonly<Record<string, "Small Fighter" | "Medium Fighter" | "Large Fighter" | "Corvette">> = {
  small_fighter: "Small Fighter",
  medium_fighter: "Medium Fighter",
  large_fighter: "Large Fighter",
  corvette: "Corvette",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function supercapModules(ship: DbShipLegacy): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modules: any[] = [];
  for (const sys of ship.systems) {
    if (!sys.code) continue; // only the coded, swappable systems are "modules"

    // Hanger subsystems (fighter / corvette only — UAV hangars aren't carrier slots).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subsystems: any[] = [];
    for (const slot of sys.slots) {
      for (const m of slot.modules) {
        const hanger = m.hangarCraftType ? HANGER_BY_CRAFT[m.hangarCraftType] : undefined;
        if (!hanger) continue;
        subsystems.push({
          id: m.id,
          type: "hanger",
          count: slot.quantity,
          title: "",
          name: hanger,
          hanger,
          capacity: m.hangarCapacity ?? 0,
          onlyCarriesDualPurpose: false,
          attributes: null,
        });
      }
    }

    const stats =
      sys.systemTypeName === "Armor"
        ? { type: "armor", armor: sys.armor || null, extraHP: sys.hp || null, energyShield: sys.energyShield || null, hp: sys.hp }
        : sys.systemTypeName === "Power"
          ? { type: "propulsion", cruise: null, warp: null, hp: sys.hp }
          : { type: "weapon", antiship: sys.dpmAntiShip || null, antiair: sys.dpmAntiAir || null, siege: sys.dpmSiege || null, hp: sys.hp };

    modules.push({
      id: sys.id,
      type: "known",
      system: sys.code,
      name: sys.name,
      img: resolveSystemIcon(sys.iconKey, sys.systemTypeName),
      sourcedFrom: null,
      ...(sys.includedWithBlueprint ? { default: true } : {}),
      stats,
      subsystems,
    });
  }
  return modules;
}

interface CapacityAcc {
  small: number;
  medium: number;
  large: number;
  corvette: number;
  onlyDP: boolean;
  any: boolean;
}

function shipCapacities(ship: DbShipLegacy): CapacityAcc {
  const acc: CapacityAcc = { small: 0, medium: 0, large: 0, corvette: 0, onlyDP: false, any: false };
  // Dedupe exact-duplicate hangar_stats rows the source occasionally emits.
  const seen = new Set<string>();
  for (const h of ship.hangarStats) {
    const key = `${h.craftType}|${h.capacity}|${h.systemName}|${h.moduleName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cap = h.capacity;
    if (h.carriesDualPurpose) acc.onlyDP = true;
    switch (h.craftType) {
      case "small_fighter": acc.small += cap; acc.any = true; break;
      case "medium_fighter": acc.medium += cap; acc.any = true; break;
      case "large_fighter": acc.large += cap; acc.any = true; break;
      case "corvette": acc.corvette += cap; acc.any = true; break;
      default: break; // uav etc. — not a carrier slot
    }
  }
  return acc;
}

export function mapLegacyShip(ship: DbShipLegacy, siblings: Map<string, string> | undefined, hasVariants: boolean): AllShip {
  const img = resolveShipImage({ img: ship.img, name: ship.name, type: ship.type, hasVariants }, siblings);

  const base = {
    id: ship.id,
    name: ship.shortName || ship.name,
    title: ship.title,
    img,
    variant: ship.variant,
    variantName: ship.variantName,
    hasVariants,
    manufacturer: ship.manufacturer.name,
    row: ship.rowPosition,
    commandPoints: ship.commandPoints,
    serviceLimit: ship.serviceLimit,
    isFragmentUnlocked: ship.fragments.length > 0,
    fragments: ship.fragments.map((f) => ({ fragmentId: f.fragmentId, quantityRequired: f.quantityRequired })),
  };

  if (ship.type === "Fighter") {
    return {
      ...base,
      type: "Fighter",
      fighterType: aircraftSize(ship.aircraftType) ?? "Small",
      fightersPerSquadron: ship.aircraftFormationSize ?? 0,
      dualPurpose: ship.aircraftDualPurpose,
    } as unknown as AllShip;
  }

  if (ship.type === "Corvette") {
    return { ...base, type: "Corvette" } as unknown as AllShip;
  }

  if (isSupercapital(ship.type)) {
    return {
      ...base,
      type: ship.type,
      onlyCarriesDualPurpose: false,
      modules: supercapModules(ship),
    } as unknown as AllShip;
  }

  // Frigate / Destroyer / Cruiser (+ Base / Utility, which the public site hides).
  const cap = shipCapacities(ship);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = { ...base, type: ship.type };
  if (cap.small) out.smallFighterCapacity = cap.small;
  if (cap.medium) { out.mediumFighterCapacity = cap.medium; out.onlyCarriesDualPurpose = cap.onlyDP; }
  if (cap.large) { out.largeFighterCapacity = cap.large; out.onlyCarriesDualPurpose = cap.onlyDP; }
  if (cap.corvette) out.corvetteCapacity = cap.corvette;
  return out as AllShip;
}

export function mapLegacyShips(ships: DbShipLegacy[]): AllShip[] {
  // hasVariants = more than one ship shares this (type, shortName).
  const counts = new Map<string, number>();
  for (const s of ships) {
    const key = `${s.type}::${s.shortName}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const siblings = new Map<string, string>();
  for (const s of ships) {
    if (s.img) siblings.set(`${s.name}::${s.variant.toUpperCase()}`, s.img);
  }
  return ships.map((s) => mapLegacyShip(s, siblings, (counts.get(`${s.type}::${s.shortName}`) ?? 1) > 1));
}
