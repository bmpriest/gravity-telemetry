"use client";

import { useState, useEffect } from "react";
import type { ShipFilter, BlueprintAllShip } from "@/utils/blueprints";

interface Props {
  close: boolean;
  onFilter: (filter: ShipFilter) => void;
}

const shipTypes = ["fighters", "corvettes", "frigates", "destroyers", "cruisers", "battlecruisers", "auxiliary ships", "carriers", "battleships"];

const filters: Readonly<Record<string, ShipFilter>> = {
  unlocked: (ship) => ship.unlocked,
  "not unlocked": (ship) => !ship.unlocked,
  "v2+": (ship) => (ship.techPoints ?? 0) >= 100,
  fighters: (ship) => ship.type === "Fighter",
  corvettes: (ship) => ship.type === "Corvette",
  frigates: (ship) => ship.type === "Frigate",
  destroyers: (ship) => ship.type === "Destroyer",
  cruisers: (ship) => ship.type === "Cruiser",
  battlecruisers: (ship) => ship.type === "Battlecruiser",
  "auxiliary ships": (ship) => ship.type === "Auxiliary Ship",
  carriers: (ship) => ship.type === "Carrier",
  battleships: (ship) => ship.type === "Battleship",
};

const defaultFilters = ["fighters", "corvettes", "frigates", "destroyers", "cruisers", "battlecruisers", "auxiliary ships", "carriers", "battleships"];

function buildFilter(activeFilters: string[]): ShipFilter {
  const nonShipFilters = activeFilters.filter((f) => !shipTypes.includes(f));
  const shipFilters = activeFilters.filter((f) => shipTypes.includes(f));
  return (ship: BlueprintAllShip) =>
    nonShipFilters.every((f) => filters[f](ship)) && shipFilters.some((f) => filters[f](ship));
}

export default function BlueprintsFilter({ close, onFilter }: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<string[]>(defaultFilters);

  useEffect(() => {
    if (close) setShowFilters(false);
  }, [close]);

  useEffect(() => {
    onFilter(buildFilter(currentFilters));
  }, [currentFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onFilter(buildFilter(currentFilters));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectFilter(name: string) {
    setCurrentFilters((prev) => {
      let next: string[];
      if (!prev.includes(name)) {
        next = [...prev, name];
      } else {
        next = prev.filter((f) => f !== name);
      }
      if (name === "unlocked") next = next.filter((f) => f !== "not unlocked");
      if (name === "not unlocked") next = next.filter((f) => f !== "unlocked");
      return next;
    });
  }

  return (
    <div className="relative flex flex-col items-start justify-start rounded-xl">
      <button
        className={`flex h-9 w-9 select-none items-center justify-center rounded-full border bg-white p-0 transition duration-500 lg:w-32 lg:justify-start lg:p-2 lg:px-4 dark:bg-neutral-800 ${
          showFilters
            ? "border-2 border-[#794dff] shadow-sm shadow-[#794dff38] ring-0 ring-[#794dff]"
            : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-700"
        }`}
        type="button"
        onClick={() => setShowFilters(!showFilters)}
      >
        <img className="size-5 transition duration-500 dark:invert" src="/ui/filter.svg" aria-hidden="true" />
        <p className="hidden grow transition duration-500 lg:block">Filter</p>
      </button>

      {showFilters && (
        <div className="absolute top-10 z-[2] flex w-52 flex-col items-start justify-center gap-1 rounded-xl border-2 border-neutral-200 bg-white p-3 shadow-md transition duration-500 dark:border-neutral-700 dark:bg-neutral-800">
          {Object.keys(filters).map((key) => (
            <button key={key} className="du-label flex w-full cursor-pointer items-center justify-start gap-2" type="button" onClick={() => selectFilter(key)}>
              <input
                type="checkbox"
                className="du-checkbox pointer-events-none"
                style={{ backgroundSize: "cover", backgroundColor: currentFilters.includes(key) ? "inherit" : "" }}
                checked={currentFilters.includes(key)}
                readOnly
              />
              <span className="text-left capitalize transition duration-500">{key}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
