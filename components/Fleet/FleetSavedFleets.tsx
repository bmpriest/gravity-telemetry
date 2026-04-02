"use client";

import type { Fleet } from "@/utils/fleet";

interface Props {
  savedFleets: Fleet[];
  onClose: () => void;
  onLoad: (fleetId: string) => void;
  onDelete: (fleetId: string) => void;
}

function totalShips(fleet: Fleet): number {
  const rowCount = fleet.rows.front.length + fleet.rows.middle.length + fleet.rows.back.length;
  const carriedCount = Object.values(fleet.carrierLoads).reduce((sum, loads) => sum + loads.length, 0);
  return rowCount + carriedCount;
}

export default function FleetSavedFleets({ savedFleets, onClose, onLoad, onDelete }: Props) {
  return (
    <div
      id="menu"
      className="flex max-h-[85vh] w-[90vw] max-w-lg flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl transition duration-500 dark:border-neutral-700 dark:bg-neutral-900"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold transition duration-500">Saved Fleets</h3>
        <button className="fo-btn fo-btn-circle fo-btn-text" type="button" onClick={onClose}>
          <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/close.svg" aria-hidden="true" />
        </button>
      </div>

      {savedFleets.length > 0 ? (
        <div className="flex flex-col gap-2 overflow-y-auto">
          {savedFleets.map((fleet) => (
            <div
              key={fleet.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3 transition duration-500 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <div className="text-left">
                <p className="font-medium transition duration-500">{fleet.name}</p>
                <p className="text-xs text-neutral-500 transition duration-500 dark:text-neutral-400">
                  {totalShips(fleet)} ships — {fleet.maxCommandPoints} max CP
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="fo-btn fo-btn-sm border-blue-300 bg-blue-100 text-blue-800 transition duration-500 hover:bg-blue-200 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                  type="button"
                  onClick={() => onLoad(fleet.id)}
                >
                  Load
                </button>
                <button
                  className="fo-btn fo-btn-sm border-red-300 bg-red-100 text-red-800 transition duration-500 hover:bg-red-200 dark:border-red-700 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                  type="button"
                  onClick={() => onDelete(fleet.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-sm text-neutral-400 transition duration-500 dark:text-neutral-500">
          No saved fleets yet. Save your current fleet to see it here.
        </p>
      )}
    </div>
  );
}
