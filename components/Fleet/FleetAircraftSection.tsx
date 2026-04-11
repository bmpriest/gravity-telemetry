"use client";

import { useState, useMemo } from "react";
import type { AllShip } from "@/utils/ships";
import type { Fleet, FleetShipInstance } from "@/utils/fleet";
import { getCarrierCapacity, getCarriableType, getFleetAircraftStats, getShipClassIcon, canHangarHoldAircraft, getHangarAssignments } from "@/utils/fleet";

interface Props {
  fleet: Fleet;
  ships: AllShip[];
  onLoad: (carrierInstanceId: string, ship: AllShip) => void;
  onUnload: (carrierInstanceId: string, instanceId: string) => void;
}

export default function FleetAircraftSection({ fleet, ships, onLoad, onUnload }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  const stats = useMemo(() => getFleetAircraftStats(fleet, ships), [fleet, ships]);

  const allShipsInFleet = useMemo(() => {
    return [
      ...fleet.rows.front,
      ...fleet.rows.middle,
      ...fleet.rows.back,
      ...fleet.rows.reinforcements,
    ];
  }, [fleet.rows]);

  // Filter only ships that have aircraft capacity with their current module configuration
  const carriersInFleet = useMemo(() => {
    return allShipsInFleet.filter(inst => {
      const ship = ships.find(s => s.id === inst.shipId && s.variant === inst.variant);
      if (!ship) return false;
      const activeModuleIds = fleet.moduleConfig?.[inst.id] ? Object.values(fleet.moduleConfig[inst.id]) : undefined;
      return getCarrierCapacity(ship, activeModuleIds).length > 0;
    });
  }, [allShipsInFleet, ships, fleet.moduleConfig]);

  const shipGroups = useMemo(() => {
    const groups: { ship: AllShip; instances: FleetShipInstance[] }[] = [];
    for (const inst of carriersInFleet) {
      const ship = ships.find((s) => s.id === inst.shipId && s.variant === inst.variant);
      if (!ship) continue;

      const existing = groups.find((g) => g.ship.id === ship.id && g.ship.variant === ship.variant);
      if (existing) {
        existing.instances.push(inst);
      } else {
        groups.push({ ship, instances: [inst] });
      }
    }
    return groups;
  }, [carriersInFleet, ships]);

  return (
    <div className="flex w-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 transition duration-500 dark:border-neutral-700 dark:bg-neutral-900 overflow-hidden">
      <button
        className="flex w-full items-center justify-between p-4 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
            <img className="size-5 dark:invert" src="/fleet/aircraft.svg" alt="" aria-hidden="true" />
            Aircraft Management
          </h3>
          <div className="flex items-center gap-3 text-[0.7rem] font-semibold">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
              <span className="opacity-70">Fighters:</span>
              <span>{stats.fighters.current} / {stats.fighters.total}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200 border border-pink-200 dark:border-pink-800">
              <span className="opacity-70">Corvettes:</span>
              <span>{stats.corvettes.current} / {stats.corvettes.total}</span>
            </div>
          </div>
        </div>
        <svg
          className={`size-4 transition-transform duration-300 dark:text-white ${isExpanded ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {shipGroups.map((group) => (
              <ShipAircraftCard
                key={`${group.ship.id}-${group.ship.variant}`}
                ship={group.ship}
                instances={group.instances}
                fleet={fleet}
                ships={ships}
                onLoad={onLoad}
                onUnload={onUnload}
              />
            ))}
          </div>
          {shipGroups.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Add carriers to the fleet to manage aircraft.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShipAircraftCard({
  ship,
  instances,
  fleet,
  ships,
  onLoad,
  onUnload,
}: {
  ship: AllShip;
  instances: FleetShipInstance[];
  fleet: Fleet;
  ships: AllShip[];
  onLoad: (carrierInstanceId: string, ship: AllShip) => void;
  onUnload: (carrierInstanceId: string, instanceId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <img className="size-5 dark:invert" src={getShipClassIcon(ship.type)} alt="" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-black dark:text-white">{ship.name}</span>
            <span className="text-[0.6rem] text-neutral-500">{ship.variantName}</span>
          </div>
        </div>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
          x{instances.length}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {instances.map((inst, idx) => {
          const activeModuleIds = fleet.moduleConfig?.[inst.id] ? Object.values(fleet.moduleConfig[inst.id]) : undefined;
          const capacity = getCarrierCapacity(ship, activeModuleIds);
          
          return (
            <UnitAircraftSlots
              key={inst.id}
              index={idx}
              instance={inst}
              capacity={capacity}
              carrierLoads={fleet.carrierLoads}
              ships={ships}
              onLoad={onLoad}
              onUnload={onUnload}
              showIndex={instances.length > 1}
            />
          );
        })}
      </div>
    </div>
  );
}

function UnitAircraftSlots({
  index,
  instance,
  capacity,
  carrierLoads,
  ships,
  onLoad,
  onUnload,
  showIndex,
}: {
  index: number;
  instance: FleetShipInstance;
  capacity: ReturnType<typeof getCarrierCapacity>;
  carrierLoads: Record<string, FleetShipInstance[]>;
  ships: AllShip[];
  onLoad: (carrierInstanceId: string, ship: AllShip) => void;
  onUnload: (carrierInstanceId: string, instanceId: string) => void;
  showIndex: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const assignments = useMemo(() => 
    getHangarAssignments(capacity, carrierLoads[instance.id] ?? [], ships),
  [capacity, carrierLoads, instance.id, ships]);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      const ship = ships.find((s) => s.id === data.shipId && s.variant === data.variant);
      if (!ship) return;

      const aircraftType = getCarriableType(ship);
      if (!aircraftType) return;

      const canFit = assignments.some(a => a.ships.length < a.capacity && canHangarHoldAircraft(a.hangarType, aircraftType));
      if (!canFit) return;

      if (data.isMoveAircraft) {
        onUnload(data.sourceCarrierId, data.aircraftInstanceId);
        onLoad(instance.id, ship);
      } else {
        onLoad(instance.id, ship);
      }
    } catch (err) {
      // Invalid drag data
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg p-2 transition-all ${
        isDragOver ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {showIndex && (
        <span className="text-[0.6rem] font-bold text-neutral-400 uppercase tracking-wider">
          Unit #{index + 1}
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        {assignments.map((asgn) => (
          <div key={asgn.hangarType} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[0.6rem]">
              <span className="font-medium text-neutral-500 dark:text-neutral-400">{asgn.hangarType} Hangar</span>
              <span
                className={`${
                  asgn.ships.length === asgn.capacity ? "text-red-500 font-bold" : "text-blue-500"
                }`}
              >
                {asgn.ships.length} / {asgn.capacity}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {asgn.instances.map((l, i) => (
                <AircraftItem
                  key={l.id}
                  instanceId={l.id}
                  shipId={l.shipId}
                  variant={l.variant}
                  carrierId={instance.id}
                  ships={ships}
                  onUnload={onUnload}
                />
              ))}
              {asgn.ships.length < asgn.capacity && (
                <div className="flex h-6 w-full items-center justify-center rounded border border-dashed border-neutral-300 text-[0.55rem] text-neutral-400 dark:border-neutral-600">
                  Empty Slot
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AircraftItem({
  instanceId,
  shipId,
  variant,
  carrierId,
  ships,
  onUnload,
}: {
  instanceId: string;
  shipId: number;
  variant: string;
  carrierId: string;
  ships: AllShip[];
  onUnload: (carrierId: string, id: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const ship = ships.find((s) => s.id === shipId && s.variant === variant);
  if (!ship) return null;

  function handleDragStart(e: React.DragEvent) {
    setIsDragging(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        shipId,
        variant,
        aircraftInstanceId: instanceId,
        sourceCarrierId: carrierId,
        isMoveAircraft: true,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      className={`group relative flex cursor-grab items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 dark:border-neutral-600 dark:bg-neutral-700 hover:border-blue-400 transition-colors ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <img className="h-4 object-contain" src={ship.img} alt={ship.name} />
      <span className="text-[0.6rem] text-black dark:text-white truncate max-w-[60px]">
        {ship.name}
      </span>
      <button
        className="text-red-500 hover:text-red-700 ml-1 font-bold"
        onClick={() => onUnload(carrierId, instanceId)}
        title="Unload"
      >
        &times;
      </button>
    </div>
  );
}
