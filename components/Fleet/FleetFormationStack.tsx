"use client";

import { useState } from "react";
import type { AllShip } from "@/utils/ships";
import type { FleetShipInstance, FleetRow } from "@/utils/fleet";
import { getShipClassIcon, isCarrierCapable, shipTypeColors } from "@/utils/fleet";

export interface ShipStack {
  shipId: number;
  variant: string;
  ship: AllShip;
  count: number;
  instances: FleetShipInstance[];
}

interface Props {
  stack: ShipStack;
  row: FleetRow;
  carrierLoads: Record<string, FleetShipInstance[]>;
  onIncrement: () => void;
  onDecrement: () => void;
  onCarrier: () => void;
}

export default function FleetFormationStack({ stack, row, carrierLoads, onIncrement, onDecrement, onCarrier }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  function onDragStart(event: React.DragEvent) {
    setIsDragging(true);
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        shipId: stack.shipId,
        variant: stack.variant,
        sourceRow: row,
        instanceIds: stack.instances.map((i) => i.id),
        isMove: true,
      })
    );
    event.dataTransfer.effectAllowed = "move";
  }

  const canAdd = stack.count < stack.ship.serviceLimit;
  const hasCarrierCapacity = isCarrierCapable(stack.ship);
  const loadedCount = stack.instances.reduce((total, inst) => total + (carrierLoads[inst.id]?.length ?? 0), 0);
  const typeColor = shipTypeColors[stack.ship.type] ?? "transparent";

  return (
    <div
      className={`relative flex cursor-grab flex-col gap-1 rounded-xl border bg-white p-2.5 transition duration-200 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 ${isDragging ? "opacity-40" : ""}`}
      style={{ borderLeft: `3px solid ${typeColor}` }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setIsDragging(false)}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <img className="size-3.5 select-none opacity-50 dark:invert" src={getShipClassIcon(stack.ship.type)} alt={stack.ship.type} />
          <p className="text-left text-xs font-bold text-black dark:text-white">{stack.ship.name}</p>
        </div>
      </div>

      <img className="mx-auto h-10 object-contain" src={stack.ship.img} alt={stack.ship.name} loading="lazy" />

      <p className="text-[0.6rem] text-neutral-500 dark:text-neutral-400">
        {stack.ship.variantName}{stack.ship.hasVariants && ` (${stack.ship.variant})`}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            className="flex size-5 items-center justify-center rounded bg-neutral-200 text-xs font-bold text-black transition hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
            type="button"
            onClick={onDecrement}
          >
            &minus;
          </button>
          <span className="min-w-[1.5rem] text-center text-xs font-bold text-black dark:text-white">{stack.count}</span>
          <button
            className={`flex size-5 items-center justify-center rounded text-xs font-bold transition ${
              canAdd
                ? "bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700"
                : "cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
            }`}
            type="button"
            disabled={!canAdd}
            onClick={onIncrement}
          >
            +
          </button>
        </div>
        <span className="text-[0.65rem] font-semibold text-neutral-500 dark:text-neutral-400">
          {stack.count * stack.ship.commandPoints} CP
        </span>
      </div>

      {hasCarrierCapacity && (
        <button
          className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-0.5 text-[0.6rem] font-medium text-blue-800 transition hover:bg-blue-200 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          type="button"
          onClick={onCarrier}
        >
          Aircraft{loadedCount > 0 ? ` (${loadedCount})` : ""}
        </button>
      )}
    </div>
  );
}
