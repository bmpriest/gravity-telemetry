"use client";

import FleetSidebarCard from "./FleetSidebarCard";
import type { AllShip } from "@/utils/ships";
import { shipTypeOrder } from "@/utils/fleet";

interface Props {
  ships: AllShip[];
  showOwnedOnly: boolean;
  hasBlueprintData: boolean;
  filterType: string;
  searchQuery: string;
  getShipCount: (shipId: number, variant: string) => number;
  onToggleOwned: () => void;
  onFilterType: (type: string) => void;
  onSearch: (q: string) => void;
  onAdd: (ship: AllShip) => void;
}

const switchStyle = {
  boxShadow: "var(--handleoffsetcalculator) 0 0 4px var(--bg-color) inset, 0 0 0 4px var(--bg-color) inset, var(--switchhandleborder)",
};

export default function FleetSidebar({ ships, showOwnedOnly, hasBlueprintData, filterType, searchQuery, getShipCount, onToggleOwned, onFilterType, onSearch, onAdd }: Props) {
  return (
    <aside className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-4 transition duration-500 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="text-left text-base font-bold text-black dark:text-white">Ship Library</h2>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {ships.length} ships
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            id="fleet-owned-only"
            type="checkbox"
            className="fo-switch fo-switch-primary fo-switch-outline border-neutral-200 bg-neutral-900 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-100 dark:hover:border-neutral-600"
            checked={showOwnedOnly}
            disabled={!hasBlueprintData}
            style={switchStyle}
            onChange={onToggleOwned}
          />
          <label
            className={`text-xs text-black dark:text-white ${!hasBlueprintData ? "text-neutral-400 dark:text-neutral-600" : ""}`}
            htmlFor="fleet-owned-only"
          >
            Owned Only
          </label>
        </div>

        <select
          className="fo-input w-full border-neutral-200 bg-white text-xs text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          value={filterType}
          onChange={(e) => onFilterType(e.target.value)}
        >
          <option value="All">All Types</option>
          {shipTypeOrder.map((type) => (
            <option key={type} value={type}>{type}s</option>
          ))}
        </select>

        <div className="relative">
          <img
            className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 select-none opacity-40 dark:invert"
            src="/ui/search.svg"
            aria-hidden="true"
          />
          <input
            type="text"
            className="fo-input w-full border-neutral-200 bg-white pl-8 text-xs text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            placeholder="Search ships..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgb(212 212 212) transparent" }}
      >
        {ships.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {ships.map((ship) => (
              <FleetSidebarCard
                key={`${ship.id}-${ship.variant}`}
                ship={ship}
                countInFleet={getShipCount(ship.id, ship.variant)}
                onAdd={() => onAdd(ship)}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">No ships match your filters.</p>
        )}
      </div>
    </aside>
  );
}
