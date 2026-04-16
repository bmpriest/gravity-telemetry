"use client";

import { useState, useMemo } from "react";
import FleetFormationStack, { type ShipStack } from "./FleetFormationStack";
import type { AllShip } from "@/utils/ships";
import type { FleetShipInstance, FleetRow } from "@/utils/fleet";

interface Props {
  row: FleetRow;
  label: string;
  description: string;
  instances: FleetShipInstance[];
  ships: AllShip[];
  carrierLoads: Record<string, FleetShipInstance[]>;
  moduleConfig: Record<string, Record<string, number>>;
  isAngulum?: boolean;
  onDrop: (data: { shipId: number; variant: string }) => void;
  onMoveShips: (data: { instanceIds: string[]; sourceRow: string }) => void;
  onAddShip: (ship: AllShip) => void;
  onRemoveOne: (instanceId: string) => void;
  onModules: (instances: FleetShipInstance[]) => void;
}

const borderColors: Record<string, string> = {
  back: "border-blue-200 bg-blue-100/50 dark:border-blue-900/60 dark:bg-neutral-900",
  middle: "border-yellow-200 bg-yellow-100/50 dark:border-yellow-900/60 dark:bg-neutral-900",
  front: "border-red-200 bg-red-100/50 dark:border-red-900/60 dark:bg-neutral-900",
  reinforcements: "border-emerald-200 bg-emerald-100/50 dark:border-emerald-900/60 dark:bg-emerald",
};

const angulumBorderColors: Record<string, string> = {
  back: "border-red-300 bg-red-100/30 dark:border-red-800/40 dark:bg-neutral-900",
  middle: "border-red-300 bg-red-100/30 dark:border-red-800/40 dark:bg-neutral-900",
  front: "border-red-300 bg-red-100/30 dark:border-red-800/40 dark:bg-neutral-900",
  reinforcements: "border-red-300 bg-red-100/30 dark:border-red-800/40 dark:bg-neutral-900",
};

const dragOverColors: Record<string, string> = {
  back: "ring-2 ring-blue-400 dark:ring-blue-500",
  middle: "ring-2 ring-yellow-400 dark:ring-yellow-500",
  front: "ring-2 ring-red-400 dark:ring-red-500",
  reinforcements: "ring-2 ring-emerald-400 dark:ring-emerald-500",
};

export default function FleetFormationColumn({ row, label, description, instances, ships, carrierLoads, moduleConfig, isAngulum, onDrop, onMoveShips, onAddShip, onRemoveOne, onModules }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);

  const displayLabel = isAngulum && row === "reinforcements" ? "My Port" : label;

  const stacks = useMemo<ShipStack[]>(() => {
    const map = new Map<string, ShipStack>();
    for (const instance of instances) {
      const key = `${instance.shipId}-${instance.variant}`;
      const ship = ships.find((s) => s.id === instance.shipId && s.variant === instance.variant);
      if (!ship) continue;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.instances.push(instance);
      } else {
        map.set(key, { shipId: instance.shipId, variant: instance.variant, ship, count: 1, instances: [instance] });
      }
    }
    return Array.from(map.values());
  }, [instances, ships]);

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(event.dataTransfer?.getData("application/json") ?? "{}");
      if (data.isMove) {
        onMoveShips({ instanceIds: data.instanceIds, sourceRow: data.sourceRow });
      } else {
        onDrop(data);
      }
    } catch {
      // Invalid drag data
    }
  }

  const columnBgClass = isAngulum ? (angulumBorderColors[row] ?? "") : (borderColors[row] ?? "");
  const dragOverClass = isDragOver ? (isAngulum ? "ring-2 ring-red-500" : (dragOverColors[row] ?? "")) : "";

  return (
    <div
      className={`flex flex-1 flex-col rounded-2xl border p-3 transition-all duration-200 ${columnBgClass} ${dragOverClass}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className={`text-sm font-bold ${isAngulum ? "text-red-700 dark:text-red-400" : "text-black dark:text-white"}`}>
          {displayLabel}
        </h3>
        <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold ${
          isAngulum 
            ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200" 
            : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
        }`}>
          {instances.length}
        </span>
      </div>
      <p className={`mb-3 text-[0.6rem] ${isAngulum ? "text-red-600/70 dark:text-red-300/60" : "text-neutral-600 dark:text-neutral-300"}`}>
        {description}
      </p>

      {stacks.length > 0 ? (
        <div className="flex flex-col gap-2">
          {stacks.map((stack) => (
            <FleetFormationStack
              key={`${stack.shipId}-${stack.variant}`}
              stack={stack}
              row={row}
              carrierLoads={carrierLoads}
              moduleConfig={moduleConfig}
              isAngulum={isAngulum}
              onIncrement={() => onAddShip(stack.ship)}
              onDecrement={() => onRemoveOne(stack.instances[stack.instances.length - 1].id)}
              onModules={() => onModules(stack.instances)}
            />
          ))}
        </div>
      ) : (
        <div className={`flex flex-1 items-center justify-center rounded-xl border border-dashed py-6 ${
          isAngulum ? "border-red-300/50 dark:border-red-800/30" : "border-neutral-300 dark:border-neutral-600"
        }`}>
          <p className={`text-[0.65rem] ${isAngulum ? "text-red-400/80" : "text-neutral-600 dark:text-neutral-300"}`}>
            Drop ships here
          </p>
        </div>
      )}
    </div>
  );
}
