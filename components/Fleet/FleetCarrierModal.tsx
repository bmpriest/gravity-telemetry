"use client";

import { useMemo } from "react";
import type { AllShip } from "@/utils/ships";
import type { FleetShipInstance, CarrierCapacity } from "@/utils/fleet";
import { getCarrierCapacity, getCarriableType, getShipClassIcon, canHangarHoldAircraft, getHangarAssignments } from "@/utils/fleet";

interface Props {
  carrierInstances: FleetShipInstance[];
  currentLoads: FleetShipInstance[];
  ships: AllShip[];
  availableShipsPool: AllShip[];
  showOwnedOnly: boolean;
  getShipFleetCount: (ship: AllShip) => number;
  onClose: () => void;
  onLoad: (ship: AllShip) => void;
  onUnload: (instanceId: string) => void;
}

function getSlotIcon(type: CarrierCapacity["type"]): string {
  if (type === "Corvette") return getShipClassIcon("Corvette");
  return getShipClassIcon("Fighter");
}

export default function FleetCarrierModal({ carrierInstances, currentLoads, ships, availableShipsPool, showOwnedOnly, getShipFleetCount, onClose, onLoad, onUnload }: Props) {
  const carrierShip = useMemo(() => {
    const first = carrierInstances[0];
    return first ? ships.find((s) => s.id === first.shipId && s.variant === first.variant) : undefined;
  }, [carrierInstances, ships]);

  const stackCount = carrierInstances.length;

  const capacity = useMemo(() => carrierShip ? getCarrierCapacity(carrierShip) : [], [carrierShip]);

  const assignments = useMemo(() => {
    // Total capacity for the stack
    const totalCapacities = capacity.map(c => ({ ...c, capacity: c.capacity * stackCount }));
    return getHangarAssignments(totalCapacities, currentLoads, ships);
  }, [capacity, stackCount, currentLoads, ships]);

  const availableShips = useMemo(() =>
    availableShipsPool.filter((ship) => {
      const carriableType = getCarriableType(ship);
      if (!carriableType) return false;
      return capacity.some((slot) => canHangarHoldAircraft(slot.type, carriableType));
    }),
  [availableShipsPool, capacity]);

  function canLoad(ship: AllShip): boolean {
    const carriableType = getCarriableType(ship);
    if (!carriableType) return false;
    const canFit = assignments.some(a => a.ships.length < a.capacity && canHangarHoldAircraft(a.hangarType, carriableType));
    if (!canFit) return false;
    if (getShipFleetCount(ship) >= ship.serviceLimit) return false;
    return true;
  }

  return (
    <div
      id="menu"
      className="flex max-h-[85vh] w-[90vw] max-w-2xl flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl transition duration-500 dark:border-neutral-700 dark:bg-neutral-900"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {carrierShip && <img className="h-16 object-contain" src={carrierShip.img} alt={carrierShip.name} />}
          <div className="text-left">
            <h3 className="text-lg font-bold transition duration-500">
              {carrierShip?.name}
              {stackCount > 1 && <span className="ml-1 text-sm font-normal text-neutral-500 dark:text-neutral-400">(x{stackCount})</span>}
            </h3>
            <p className="text-sm text-neutral-500 transition duration-500 dark:text-neutral-400">
              {carrierShip?.variantName} — Aircraft Management
            </p>
          </div>
        </div>
        <button className="fo-btn fo-btn-circle fo-btn-text" type="button" onClick={onClose}>
          <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/close.svg" aria-hidden="true" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {assignments.map((asgn) => (
          <div
            key={asgn.hangarType}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition duration-500 ${
              asgn.ships.length >= asgn.capacity
                ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950"
                : "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"
            }`}
          >
            <img className="size-4 select-none opacity-60 transition duration-500 dark:invert" src={getSlotIcon(asgn.hangarType)} alt={asgn.hangarType} />
            <span className="text-sm font-medium transition duration-500">{asgn.hangarType}: {asgn.ships.length}/{asgn.capacity}</span>
          </div>
        ))}
      </div>

      {currentLoads.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-left text-sm font-semibold transition duration-500">Loaded Aircraft</h4>
          <div className="flex flex-wrap gap-2">
            {assignments.flatMap(asgn => asgn.instances.map((load, idx) => {
              const loadedShip = asgn.ships[idx];
              return (
                <div
                  key={load.id}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 transition duration-500 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <img className="h-8 object-contain" src={loadedShip.img} alt={loadedShip.name} />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold transition duration-500">{loadedShip.name}</span>
                    <span className="text-[0.6rem] text-neutral-500">{asgn.hangarType}</span>
                  </div>
                  <button className="text-red-500 transition hover:text-red-700 ml-1 font-bold" type="button" onClick={() => onUnload(load.id)}>&times;</button>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      <div className="overflow-y-auto">
        <h4 className="mb-2 text-left text-sm font-semibold transition duration-500">Available to Load</h4>
        {availableShips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableShips.map((ship) => (
              <button
                key={`${ship.id}-${ship.variant}`}
                className={`flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 transition duration-500 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 ${!canLoad(ship) ? "cursor-not-allowed opacity-50" : ""}`}
                type="button"
                disabled={!canLoad(ship)}
                onClick={() => onLoad(ship)}
              >
                <img className="h-8 object-contain" src={ship.img} alt={ship.name} />
                <div className="text-left">
                  <p className="text-xs font-medium transition duration-500">{ship.name}</p>
                  <p className="text-[0.6rem] text-neutral-500 transition duration-500 dark:text-neutral-400">
                    {ship.variantName} — {ship.commandPoints} CP
                    {getShipFleetCount(ship) >= ship.serviceLimit && <span className="text-red-500"> (limit reached)</span>}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-4 text-sm text-neutral-400 transition duration-500 dark:text-neutral-500">
            No compatible fighters or corvettes available.{showOwnedOnly ? ' Try disabling "Owned Only".' : ""}
          </p>
        )}
      </div>
    </div>
  );
}
