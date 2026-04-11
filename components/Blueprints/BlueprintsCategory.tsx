"use client";

import { useState } from "react";
import BlueprintsCard from "./BlueprintsCard";
import type { BlueprintAllShip, BlueprintSuperCapitalShip } from "@/utils/blueprints";

interface Props {
  shipType: string;
  isOwner: boolean | undefined;
  currentLayout: "list" | "grid";
  showVariants: boolean;
  exposeModules: boolean;
  data: BlueprintAllShip[] | undefined;
  displayedData: BlueprintAllShip[] | undefined;
  unassignedTp: number;
  onUnassignedTpChange: (tp: number) => void;
  onModules: (ship: BlueprintSuperCapitalShip) => void;
  onDataChange: () => void;
  onMarkUnsaved: () => void;
}

export default function BlueprintsCategory({
  shipType,
  isOwner,
  currentLayout,
  showVariants,
  exposeModules,
  data,
  displayedData,
  unassignedTp,
  onUnassignedTpChange,
  onModules,
  onDataChange,
  onMarkUnsaved,
}: Props) {
  const [showTPModal, setShowTPModal] = useState(false);

  const typeShips = displayedData?.filter((ship) => ship.type === shipType) ?? [];
  if (!data || !displayedData || typeShips.length === 0) return null;

  function handleTp(targetShip: BlueprintAllShip, tp: number) {
    if (!data) return;
    onMarkUnsaved();

    targetShip.techPoints = tp;
    if (!targetShip.hasVariants || !targetShip.mirrorTechPoints) {
      onDataChange();
      return;
    }

    const mirrorShips = data.filter((ship) => ship.name === targetShip.name && ship.variant !== targetShip.variant);
    for (const ship of mirrorShips) {
      ship.techPoints = tp;
    }
    onDataChange();
  }

  function toggleMirror(targetShip: BlueprintAllShip) {
    if (!targetShip.hasVariants || !data) return;
    onMarkUnsaved();

    const newValue = !targetShip.mirrorTechPoints;
    targetShip.mirrorTechPoints = newValue;
    const mirrorShips = data.filter((ship) => ship.name === targetShip.name && ship.variant !== targetShip.variant);
    for (const ship of mirrorShips) {
      ship.mirrorTechPoints = newValue;
    }
    onDataChange();
  }

  function getTotalTP(ships: BlueprintAllShip[]) {
    const usedShips: string[] = [];
    return ships.reduce((total, ship) => {
      if (ship.hasVariants) {
        if (usedShips.includes(ship.name)) return total;
        usedShips.push(ship.name);
      }
      return total + ship.techPoints;
    }, 0);
  }

  const totalTP = getTotalTP(typeShips) + (unassignedTp ?? 0);
  const unlockedCount = data.filter((s) => s.type === shipType && s.unlocked).length;
  const totalCount = data.filter((s) => s.type === shipType).length;

  return (
    <div className="flex w-full flex-col items-center justify-center">
      {showTPModal && isOwner && (
        <div
          className="fixed left-0 top-0 z-20 flex h-dvh w-dvw items-center justify-center bg-black/50"
          onClick={() => setShowTPModal(false)}
        >
          <div
            id="menu"
            className="flex flex-col items-center justify-center gap-6 rounded-xl bg-body px-20 py-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-medium">
              How many unassigned <span className="text-2xl font-bold">{shipType}</span> Tech Points do you have?
            </h2>
            <div className="fo-input-group max-w-sm">
              <label className="fo-input-group-text" htmlFor={`unassignedTechPoints${shipType}`}>TP</label>
              <div className="relative grow">
                <input
                  id={`unassignedTechPoints${shipType}`}
                  value={unassignedTp}
                  onChange={(e) => onUnassignedTpChange(Number(e.target.value))}
                  type="number"
                  className="peer fo-input grow border-neutral-300 bg-white text-left text-black hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
                  placeholder="Tech Points"
                />
              </div>
            </div>
            <button
              className="du-btn flex h-9 min-h-9 items-center justify-center gap-2 rounded-full border-green-300 bg-green-100 py-2 transition duration-500 hover:scale-105 hover:border-green-400 hover:bg-green-200 dark:border-green-500 dark:bg-green-800 dark:text-white dark:hover:bg-green-700"
              type="button"
              onClick={() => setShowTPModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-2">
        <h3 className="text-2xl font-bold transition duration-500">{shipType}s</h3>
        <button
          className={`du-tooltip z-[1] translate-y-0.5 ${!isOwner ? "cursor-help" : ""}`}
          data-tip={`${unassignedTp?.toLocaleString()} unassigned ${shipType} Tech Points`}
          type="button"
          disabled={!isOwner}
          onClick={() => setShowTPModal(true)}
        >
          <img
            className="size-7 transition duration-500 dark:invert"
            src={isOwner ? "/ui/plusCircle.svg" : `/ships/classes/${shipType.toLowerCase()}.svg`}
            alt={isOwner ? `Declare unassigned ${shipType} Tech Points` : ""}
          />
        </button>
      </div>

      <p className="transition duration-500">{unlockedCount}/{totalCount} unlocked</p>
      <p className="hidden transition duration-500">{unassignedTp?.toLocaleString()} unassigned TP</p>
      <p className="mb-4 transition duration-500">{totalTP.toLocaleString()} total Tech Points</p>

      <div className="flex flex-wrap items-stretch justify-center gap-3">
        {typeShips.map((ship) => (
          <BlueprintsCard
            key={ship.id}
            ship={ship}
            mirror={ship.mirrorTechPoints}
            layout={currentLayout}
            variants={showVariants}
            exposeModules={exposeModules}
            allVariants={displayedData.filter((s) => ship.name === s.name)}
            tp={ship.techPoints}
            owner={isOwner}
            onTp={(tp) => handleTp(ship, tp)}
            onMirror={() => toggleMirror(ship)}
            onModules={(s) => onModules(s)}
            onChange={() => { onMarkUnsaved(); onDataChange(); }}
          />
        ))}
      </div>
    </div>
  );
}
