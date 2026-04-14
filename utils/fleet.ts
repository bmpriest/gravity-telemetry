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
  /** Maps ship instance ID → mapping of module slot (e.g. "M", "A") to module ID */
  moduleConfig: Record<string, Record<string, number>>;
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
    carrierLoads: {},
    moduleConfig: {}
  };
}

export function createFleetInstance(ship: AllShip): FleetShipInstance {
  return {
    id: generateInstanceId(),
    shipId: ship.id,
    variant: ship.variant
  };
}

export function getCarrierCapacity(ship: AllShip, activeModuleIds?: number[]): CarrierCapacity[] {
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
      
      if (activeModuleIds) {
        if (!activeModuleIds.includes(mod.id)) continue;
      } else {
        if (!mod.default) continue;
      }
      
      if (!("subsystems" in mod)) continue;
      for (const sub of mod.subsystems) {
        if (sub.type !== "hanger") continue;
        const hangerSub = sub as AircraftSubsystem;
        if (!["Small Fighter", "Medium Fighter", "Large Fighter", "Corvette"].includes(hangerSub.hanger)) continue;
        const hangerType = hangerSub.hanger as CarrierCapacity["type"];
        const totalHangerSlots = hangerSub.capacity * hangerSub.count;
        const existing = capacities.find((c) => c.type === hangerType);
        if (existing) existing.capacity += totalHangerSlots;
        else capacities.push({ type: hangerType, capacity: totalHangerSlots });
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

export function canHangarHoldAircraft(hangarType: CarrierCapacity["type"], aircraftType: CarrierCapacity["type"]): boolean {
  if (hangarType === aircraftType) return true;
  if (hangarType === "Large Fighter") {
    return aircraftType === "Medium Fighter" || aircraftType === "Small Fighter";
  }
  if (hangarType === "Medium Fighter") {
    return aircraftType === "Small Fighter";
  }
  return false;
}

export interface HangarAssignment {
  hangarType: CarrierCapacity["type"];
  capacity: number;
  ships: AllShip[];
  instances: FleetShipInstance[];
}

export function getHangarAssignments(capacities: CarrierCapacity[], loadedInstances: FleetShipInstance[], allShips: AllShip[]): HangarAssignment[] {
  const assignments: HangarAssignment[] = capacities.map(c => ({
    hangarType: c.type,
    capacity: c.capacity,
    ships: [],
    instances: []
  }));

  // Sort aircraft by size (Smallest to Largest) to fill smallest slots first
  const aircraft = loadedInstances.map(inst => {
    const ship = allShips.find(s => s.id === inst.shipId && s.variant === inst.variant);
    return { inst, ship, type: ship ? getCarriableType(ship) : null };
  }).filter((a): a is { inst: FleetShipInstance; ship: AllShip; type: CarrierCapacity["type"] } => a.type !== null);

  const order: Record<string, number> = { "Small Fighter": 0, "Medium Fighter": 1, "Large Fighter": 2, "Corvette": 3 };
  aircraft.sort((a, b) => order[a.type] - order[b.type]);

  for (const item of aircraft) {
    const compatibleAssignments = assignments
      .filter(a => a.ships.length < a.capacity && canHangarHoldAircraft(a.hangarType, item.type))
      .sort((a, b) => order[a.hangarType] - order[b.hangarType]);
    
    if (compatibleAssignments[0]) {
      compatibleAssignments[0].ships.push(item.ship);
      compatibleAssignments[0].instances.push(item.inst);
    }
  }

  return assignments;
}

export function getFleetAircraftStats(fleet: Fleet, ships: AllShip[]) {
  let totalFighterCapacity = 0;
  let totalCorvetteCapacity = 0;
  let currentFighters = 0;
  let currentCorvettes = 0;

  // Calculate total capacity from all ships in the fleet rows
  const allRowInstances = [...fleet.rows.front, ...fleet.rows.middle, ...fleet.rows.back, ...fleet.rows.reinforcements];
  
  for (const instance of allRowInstances) {
    const ship = ships.find((s) => s.id === instance.shipId && s.variant === instance.variant);
    if (!ship) continue;

    const activeModuleIds = fleet.moduleConfig?.[instance.id] ? Object.values(fleet.moduleConfig[instance.id]) : undefined;
    const capacities = getCarrierCapacity(ship, activeModuleIds);
    for (const cap of capacities) {
      if (cap.type === "Corvette") {
        totalCorvetteCapacity += cap.capacity;
      } else {
        totalFighterCapacity += cap.capacity;
      }
    }
  }

  // Calculate current loads
  for (const loads of Object.values(fleet.carrierLoads)) {
    for (const instance of loads) {
      const ship = ships.find((s) => s.id === instance.shipId && s.variant === instance.variant);
      if (!ship) continue;

      if (ship.type === "Corvette") {
        currentCorvettes++;
      } else if (ship.type === "Fighter") {
        currentFighters++;
      }
    }
  }

  return {
    fighters: { current: currentFighters, total: totalFighterCapacity },
    corvettes: { current: currentCorvettes, total: totalCorvetteCapacity },
  };
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
