import type { AllShip, Fighter, AircraftSubsystem } from "./ships";

export interface FleetShipInstance {
  id: string;
  shipId: number;
  variant: string;
}

export type FleetRow = "front" | "middle" | "back" | "reinforcements";

export interface Fleet {
  id: string;
  name: string;
  maxCommandPoints: number;
  rows: {
    front: FleetShipInstance[];
    middle: FleetShipInstance[];
    back: FleetShipInstance[];
    reinforcements: FleetShipInstance[];
  };
  /** Maps carrier instance ID → array of loaded fighter/corvette instances */
  carrierLoads: Record<string, FleetShipInstance[]>;
}

export interface CarrierCapacity {
  type: "Small Fighter" | "Medium Fighter" | "Large Fighter" | "Corvette";
  capacity: number;
}

export const shipTypeOrder = ["Fighter", "Corvette", "Frigate", "Destroyer", "Cruiser", "Battlecruiser", "Auxiliary Ship", "Carrier", "Battleship"] as const;

export const shipTypeColors: Record<string, string> = {
  Fighter: "rgb(139, 92, 246)",
  Corvette: "rgb(236, 72, 153)",
  Frigate: "rgb(6, 182, 212)",
  Destroyer: "rgb(245, 158, 11)",
  Cruiser: "rgb(59, 130, 246)",
  Battlecruiser: "rgb(244, 63, 94)",
  "Auxiliary Ship": "rgb(168, 85, 247)",
  Carrier: "rgb(16, 185, 129)",
  Battleship: "rgb(239, 68, 68)"
};

export function generateFleetId(): string {
  return `fl-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateInstanceId(): string {
  return `si-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyFleet(): Fleet {
  return {
    id: generateFleetId(),
    name: "New Fleet",
    maxCommandPoints: 400,
    rows: { front: [], middle: [], back: [], reinforcements: [] },
    carrierLoads: {}
  };
}

export function createFleetInstance(ship: AllShip): FleetShipInstance {
  return {
    id: generateInstanceId(),
    shipId: ship.id,
    variant: ship.variant
  };
}

export function getCarrierCapacity(ship: AllShip): CarrierCapacity[] {
  const capacities: CarrierCapacity[] = [];

  if ("mediumFighterCapacity" in ship) {
    const cap = (ship as { mediumFighterCapacity: number }).mediumFighterCapacity;
    if (cap > 0) capacities.push({ type: "Medium Fighter", capacity: cap });
  }
  if ("largeFighterCapacity" in ship) {
    const cap = (ship as { largeFighterCapacity: number }).largeFighterCapacity;
    if (cap > 0) capacities.push({ type: "Large Fighter", capacity: cap });
  }
  if ("corvetteCapacity" in ship) {
    const cap = (ship as { corvetteCapacity: number }).corvetteCapacity;
    if (cap > 0) capacities.push({ type: "Corvette", capacity: cap });
  }

  if ("modules" in ship) {
    for (const mod of ship.modules) {
      if (mod.type === "unknown") continue;
      if (!("subsystems" in mod)) continue;
      for (const sub of mod.subsystems) {
        if (sub.type !== "hanger") continue;
        const hangerSub = sub as AircraftSubsystem;
        if (!["Small Fighter", "Medium Fighter", "Large Fighter", "Corvette"].includes(hangerSub.hanger)) continue;
        const hangerType = hangerSub.hanger as CarrierCapacity["type"];
        const existing = capacities.find((c) => c.type === hangerType);
        if (existing) existing.capacity += hangerSub.capacity;
        else capacities.push({ type: hangerType, capacity: hangerSub.capacity });
      }
    }
  }

  return capacities;
}

export function isCarrierCapable(ship: AllShip): boolean {
  return getCarrierCapacity(ship).length > 0;
}

/** Returns the carrier slot type a fighter or corvette fills, or null if not carriable. */
export function getCarriableType(ship: AllShip): CarrierCapacity["type"] | null {
  if (ship.type === "Fighter") {
    return `${(ship as Fighter).fighterType} Fighter` as CarrierCapacity["type"];
  }
  if (ship.type === "Corvette") {
    return "Corvette";
  }
  return null;
}

export function getShipClassIcon(type: string): string {
  return `/ships/classes/${type.toLowerCase()}.svg`;
}

export function getRowLabel(row: string): string {
  const labels: Record<string, string> = {
    front: "Front Row",
    middle: "Middle Row",
    back: "Back Row",
    reinforcements: "Reinforcements"
  };
  return labels[row] ?? row;
}

export function getRowKey(row: string): FleetRow {
  return row.toLowerCase() as FleetRow;
}
