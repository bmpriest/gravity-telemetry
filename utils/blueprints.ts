import type {
  Fighter,
  Corvette,
  CapitalShip,
  MediumFighterCapitalShip,
  LargeFighterCapitalShip,
  CorvetteCapitalShip,
  SuperCapitalShip,
  UnknownModule,
  WeaponModule,
  PropulsionModule,
  MiscModule,
  AllShip,
  AllModule,
} from "@/utils/ships";
import type { BlueprintAccountDTO, BlueprintShipEntry } from "@/stores/blueprintStore";

export interface BlueprintFighter extends Fighter {
  unlocked: boolean;
  techPoints: number;
  mirrorTechPoints: boolean;
}

export interface BlueprintCorvette extends Corvette {
  unlocked: boolean;
  techPoints: number;
  mirrorTechPoints: boolean;
}

export interface BlueprintCapitalShip extends CapitalShip {
  unlocked: boolean;
  techPoints: number;
  mirrorTechPoints: boolean;
}

export interface BlueprintMediumFighterCapitalShip extends MediumFighterCapitalShip {
  unlocked: boolean;
  techPoints: number;
  mirrorTechPoints: boolean;
}

export interface BlueprintLargeFighterCapitalShip extends LargeFighterCapitalShip {
  unlocked: boolean;
  techPoints: number;
  mirrorTechPoints: boolean;
}

export interface BlueprintCorvetteCapitalShip extends CorvetteCapitalShip {
  unlocked: boolean;
  techPoints: number;
  mirrorTechPoints: boolean;
}

export interface BlueprintUnknownModule extends UnknownModule {
  unlocked: boolean;
}

export interface BlueprintWeaponModule extends WeaponModule {
  unlocked: boolean;
}

export interface BlueprintPropulsionModule extends PropulsionModule {
  unlocked: boolean;
}

export interface BlueprintMiscModule extends MiscModule {
  unlocked: boolean;
}

export interface BlueprintSuperCapitalShip extends SuperCapitalShip {
  unlocked: boolean;
  techPoints: number;
  mirrorTechPoints: boolean;
  modules: (BlueprintUnknownModule | BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule)[];
}

export type BlueprintAllShip =
  | BlueprintFighter
  | BlueprintCorvette
  | BlueprintCapitalShip
  | BlueprintMediumFighterCapitalShip
  | BlueprintLargeFighterCapitalShip
  | BlueprintCorvetteCapitalShip
  | BlueprintSuperCapitalShip;

export type ShipSorter = (shipA: BlueprintAllShip, shipB: BlueprintAllShip) => number;
export type ShipFilter = (ship: BlueprintAllShip) => boolean;

type AnyBlueprintModule = BlueprintUnknownModule | BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule;

/**
 * Build the editable `BlueprintAllShip[]` view by joining the ship catalogue
 * with a saved account's unlock state. Shared by the Blueprint Tracker and
 * Blueprint Fragments pages so both project the same shape from the same DTO.
 */
export function buildView(ships: AllShip[], account: BlueprintAccountDTO | undefined): BlueprintAllShip[] {
  const shipMap = new Map(account?.ships.map((s) => [s.shipId, s]) ?? []);
  return ships.map((ship): BlueprintAllShip => {
    const owned = shipMap.get(ship.id);
    const moduleMap = new Map(owned?.modules.map((m) => [m.moduleId, m.unlocked]) ?? []);

    if ("modules" in ship) {
      return {
        ...ship,
        unlocked: owned?.unlocked ?? false,
        techPoints: owned?.techPoints ?? 0,
        mirrorTechPoints: owned?.mirrorTechPoints ?? ship.hasVariants,
        modules: ship.modules.map((mod: AllModule) => ({
          ...mod,
          unlocked: moduleMap.get(mod.id) ?? Boolean(mod.default),
        })),
      } as BlueprintSuperCapitalShip;
    }

    return {
      ...ship,
      unlocked: owned?.unlocked ?? false,
      techPoints: owned?.techPoints ?? 0,
      mirrorTechPoints: owned?.mirrorTechPoints ?? ship.hasVariants,
    } as BlueprintAllShip;
  });
}

/** Inverse of {@link buildView} — collapses the editable view back to the persistence DTO. */
export function viewToShipEntries(view: BlueprintAllShip[]): BlueprintShipEntry[] {
  return view
    .filter((s) => s.unlocked || s.techPoints > 0 || ("modules" in s && s.modules.some((m) => (m as AnyBlueprintModule).unlocked && !m.default)))
    .map((s): BlueprintShipEntry => ({
      shipId: s.id,
      unlocked: s.unlocked,
      techPoints: s.techPoints,
      mirrorTechPoints: s.mirrorTechPoints,
      modules: "modules" in s
        ? s.modules.map((m) => ({ moduleId: m.id, unlocked: (m as AnyBlueprintModule).unlocked }))
        : [],
    }));
}
