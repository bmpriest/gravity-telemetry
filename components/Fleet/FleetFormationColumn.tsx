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

const dragOverColors: Record<string, string> = {
  back: "ring-2 ring-blue-400 dark:ring-blue-500",
  middle: "ring-2 ring-yellow-400 dark:ring-yellow-500",
  front: "ring-2 ring-red-400 dark:ring-red-500",
  reinforcements: "ring-2 ring-emerald-400 dark:ring-emerald-500",
};

export default function FleetFormationColumn({ row, label, description, instances, ships, carrierLoads, moduleConfig, onDrop, onMoveShips, onAddShip, onRemoveOne, onModules }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);

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

  return (
    <div
      className={`flex flex-1 flex-col rounded-2xl border p-3 transition-all duration-200 ${borderColors[row] ?? ""} ${isDragOver ? dragOverColors[row] ?? "" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-black dark:text-white">{label}</h3>
        <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[0.6rem] font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
          {instances.length}
        </span>
      </div>
      <p className="mb-3 text-[0.6rem] text-neutral-600 dark:text-neutral-300">{description}</p>

      {stacks.length > 0 ? (
        <div className="flex flex-col gap-2">
          {stacks.map((stack) => (
            <FleetFormationStack
              key={`${stack.shipId}-${stack.variant}`}
              stack={stack}
              row={row}
              carrierLoads={carrierLoads}
              moduleConfig={moduleConfig}
              onIncrement={() => onAddShip(stack.ship)}
              onDecrement={() => onRemoveOne(stack.instances[stack.instances.length - 1].id)}
              onModules={() => onModules(stack.instances)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-neutral-300 py-6 dark:border-neutral-600">
          <p className="text-[0.65rem] text-neutral-600 dark:text-neutral-300">Drop ships here</p>
        </div>
      )}
    </div>
  );
}
