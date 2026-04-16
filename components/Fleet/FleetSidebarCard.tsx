"use client";

import { useState } from "react";
import type { AllShip } from "@/utils/ships";
import { getShipClassIcon, shipTypeColors } from "@/utils/fleet";

interface Props {
  ship: AllShip;
  countInFleet: number;
  isRestricted?: boolean;
  isAngulum?: boolean;
  onAdd: () => void;
}

export default function FleetSidebarCard({ ship, countInFleet, isRestricted, isAngulum, onAdd }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  function onDragStart(event: React.DragEvent) {
    if (isRestricted) {
      event.preventDefault();
      return;
    }
    setIsDragging(true);
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ shipId: ship.id, variant: ship.variant })
    );
    event.dataTransfer.effectAllowed = "copy";
  }

  const typeColor = isAngulum ? "rgb(239, 68, 68)" : (shipTypeColors[ship.type] ?? "transparent");

  return (
    <div
      className={`group relative flex flex-col gap-1 rounded-xl border p-2.5 transition duration-200 ${
        isRestricted 
          ? "cursor-not-allowed opacity-50 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700" 
          : `cursor-grab hover:-translate-y-0.5 border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 ${isDragging ? "opacity-40" : ""}`
      }`}
      style={{ borderLeft: `3px solid ${typeColor}` }}
      draggable={!isRestricted}
      onDragStart={onDragStart}
      onDragEnd={() => setIsDragging(false)}
      onClick={isRestricted ? undefined : onAdd}
    >
      <img
        className={`absolute left-2.5 top-2.5 size-4 select-none opacity-50 ${isAngulum ? "sepia hue-rotate-[320deg] saturate-[200%]" : "dark:invert"}`}
        src={getShipClassIcon(ship.type)}
        alt={ship.type}
      />

      <div className="flex items-start justify-between gap-1 pl-6">
        <p className={`text-left text-xs font-bold ${isAngulum ? "text-red-900 dark:text-red-100" : "text-black dark:text-white"}`}>{ship.name}</p>
        <span className="shrink-0 text-[0.65rem] font-semibold text-neutral-500 dark:text-neutral-400">{ship.commandPoints} CP</span>
      </div>

      <img className="mx-auto h-10 object-contain" src={ship.img} alt={ship.name} loading="lazy" />

      <div className="flex items-center justify-between gap-1 text-[0.65rem]">
        <span className="truncate text-neutral-500 dark:text-neutral-400">
          {ship.variantName}{ship.hasVariants && ` (${ship.variant})`}
        </span>
        <span className="shrink-0 text-neutral-400 dark:text-neutral-500">{ship.row}</span>
      </div>

      <div className="flex items-center justify-between text-[0.6rem]">
        <span className={countInFleet > 0 ? "font-semibold text-blue-600 dark:text-blue-400" : "text-neutral-400 dark:text-neutral-500"}>
          {isRestricted ? "Restricted" : `In fleet: ${countInFleet}`}
        </span>
        <span className="text-neutral-400 dark:text-neutral-500">Limit: {ship.serviceLimit}</span>
      </div>

      {isRestricted && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/5">
          <span className="bg-black/80 text-[8px] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
            In Service
          </span>
        </div>
      )}
    </div>
  );
}
