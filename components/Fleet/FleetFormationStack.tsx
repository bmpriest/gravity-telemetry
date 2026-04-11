"use client";

import { useState } from "react";
import type { AllShip, AllModule } from "@/utils/ships";
import type { FleetShipInstance, FleetRow } from "@/utils/fleet";
import { getShipClassIcon, shipTypeColors } from "@/utils/fleet";

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
  moduleConfig: Record<string, Record<string, number>>;
  onIncrement: () => void;
  onDecrement: () => void;
  onModules: () => void;
}

const slotColors: Record<string, string> = {
  M: "bg-red-600",
  A: "bg-blue-600",
  B: "bg-purple-600",
  C: "bg-green-600",
  D: "bg-orange-600",
  E: "bg-yellow-600",
  F: "bg-pink-600",
  G: "bg-indigo-600",
  H: "bg-gray-600",
};

export default function FleetFormationStack({ stack, row, carrierLoads, moduleConfig, onIncrement, onDecrement, onModules }: Props) {
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
  const hasModules = "modules" in stack.ship && stack.ship.modules && stack.ship.modules.length > 0;
  const typeColor = shipTypeColors[stack.ship.type] ?? "transparent";

  // Gather active module systems to display
  let activeModuleBadges = null;
  if (hasModules && stack.instances.length > 0) {
    if (stack.instances.length === 1) {
      const config = moduleConfig[stack.instances[0].id] || {};
      const shipModules = (stack.ship as any).modules as AllModule[];
      
      // Slot logic: for every slot the ship has, find which module is active
      const slots = Array.from(new Set(shipModules.map(m => m.system.charAt(0)))).sort((a, b) => {
        if (a === "M") return -1;
        if (b === "M") return 1;
        return a.localeCompare(b);
      });
      const activeModules = slots.map(slot => {
        if (config[slot] !== undefined) {
          return shipModules.find(m => m.id === config[slot]);
        }
        return shipModules.find(m => m.system.startsWith(slot) && m.default);
      }).filter((m): m is AllModule => !!m);
      
      if (activeModules.length > 0) {
        activeModuleBadges = (
          <div className="flex flex-wrap gap-1 mt-1 justify-center">
            {activeModules.map((mod) => {
              const slot = mod.system.charAt(0);
              const colorClass = slotColors[slot] || "bg-neutral-600";
              return (
                <span key={mod.id} className={`px-1 text-[0.55rem] font-bold text-white rounded ${colorClass}`} title={("name" in mod ? mod.name : mod.system)}>
                  {mod.system}
                </span>
              );
            })}
          </div>
        );
      }
    } else {
      // Multiple instances: Check if any have configurations override
      const configuredCount = stack.instances.filter(inst => Object.keys(moduleConfig[inst.id] || {}).length > 0).length;
      if (configuredCount > 0) {
        activeModuleBadges = (
          <div className="flex flex-wrap gap-1 mt-1 justify-center">
            <span className="px-1 text-[0.55rem] font-bold text-white bg-blue-600 rounded">
              {configuredCount} Configured
            </span>
          </div>
        );
      }
    }
  }

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

      <div className="text-center">
        <p className="text-[0.6rem] text-neutral-500 dark:text-neutral-400">
          {stack.ship.variantName}{stack.ship.hasVariants && ` (${stack.ship.variant})`}
        </p>
        {activeModuleBadges}
      </div>

      <div className="flex items-center justify-between mt-1">
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

      {hasModules && (
        <button
          className="w-full mt-1 rounded-lg border border-purple-300 bg-purple-100 px-2 py-0.5 text-[0.6rem] font-medium text-purple-800 transition hover:bg-purple-200 dark:border-purple-700 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
          type="button"
          onClick={onModules}
        >
          Modules
        </button>
      )}
    </div>
  );
}
