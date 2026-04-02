"use client";

import { useState } from "react";
import type { AllShip } from "@/utils/ships";
import { getShipClassIcon, shipTypeColors } from "@/utils/fleet";

interface Props {
  ship: AllShip;
  countInFleet: number;
  onAdd: () => void;
}

export default function FleetSidebarCard({ ship, countInFleet, onAdd }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  function onDragStart(event: React.DragEvent) {
    setIsDragging(true);
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ shipId: ship.id, variant: ship.variant })
    );
    event.dataTransfer.effectAllowed = "copy";
  }

  const typeColor = shipTypeColors[ship.type] ?? "transparent";

  return (
    <div
      className={`group relative flex cursor-grab flex-col gap-1 rounded-xl border p-2.5 transition duration-200 hover:-translate-y-0.5 border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 ${isDragging ? "opacity-40" : ""}`}
      style={{ borderLeft: `3px solid ${typeColor}` }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setIsDragging(false)}
      onClick={onAdd}
    >
      <img
        className="absolute left-2.5 top-2.5 size-4 select-none opacity-50 dark:invert"
        src={getShipClassIcon(ship.type)}
        alt={ship.type}
      />

      <div className="flex items-start justify-between gap-1 pl-6">
        <p className="text-left text-xs font-bold text-black dark:text-white">{ship.name}</p>
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
          In fleet: {countInFleet}
        </span>
        <span className="text-neutral-400 dark:text-neutral-500">Limit: {ship.serviceLimit}</span>
      </div>
    </div>
  );
}
