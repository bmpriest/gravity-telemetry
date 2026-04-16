"use client";

import { useState, useMemo } from "react";
import type { Fleet } from "@/utils/fleet";
import { getFleetValidationErrors } from "@/utils/fleet";
import type { AllShip } from "@/utils/ships";

interface Props {
  savedFleets: Fleet[];
  currentFleetId: string;
  allShips: AllShip[];
  onLoad: (fleetId: string) => void;
  onDelete: (fleetId: string) => void;
  onUpdateFleet: (fleetId: string, updates: Partial<Fleet>) => void;
  onReorder: (fleetIds: string[]) => void;
}

function totalShips(fleet: Fleet): number {
  const rowCount = fleet.rows.front.length + fleet.rows.middle.length + fleet.rows.back.length + (fleet.rows.reinforcements?.length ?? 0);
  const carriedCount = Object.values(fleet.carrierLoads).reduce((sum, loads) => sum + loads.length, 0);
  return rowCount + carriedCount;
}

export default function FleetManager({ savedFleets, currentFleetId, allShips, onLoad, onDelete, onUpdateFleet, onReorder }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [draggedFleetId, setDraggedFleetId] = useState<string | null>(null);

  const fleetsWithErrors = useMemo(() => {
    return savedFleets.map(f => ({
      ...f,
      errors: getFleetValidationErrors(f.id, savedFleets, allShips)
    }));
  }, [savedFleets, allShips]);

  const activeFleets = fleetsWithErrors.filter(f => f.isActive);
  const angulumFleets = fleetsWithErrors.filter(f => f.isAngulum);

  function handleDragStart(id: string) {
    setDraggedFleetId(id);
  }

  function handleDropToStatus(e: React.DragEvent, status: "angulum" | "active" | "none") {
    e.preventDefault();
    if (!draggedFleetId) return;
    onUpdateFleet(draggedFleetId, {
      isAngulum: status === "angulum",
      isActive: status === "active"
    });
    setDraggedFleetId(null);
  }

  function handleReorder(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedFleetId || draggedFleetId === targetId) return;
    
    const ids = savedFleets.map(f => f.id);
    const oldIdx = ids.indexOf(draggedFleetId);
    const newIdx = ids.indexOf(targetId);
    
    const newIds = [...ids];
    newIds.splice(oldIdx, 1);
    newIds.splice(newIdx, 0, draggedFleetId);
    
    onReorder(newIds);
    setDraggedFleetId(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 transition duration-500 dark:border-neutral-700 dark:bg-neutral-900 shadow-sm">
      <button 
        className="flex items-center justify-between w-full"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <img className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""} dark:invert`} src="/ui/chevron-right.svg" alt="" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Fleet Management
          </h3>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[0.65rem] font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {savedFleets.length} Saved
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-4 mt-2">
          {/* Droppable areas */}
          <div className="grid grid-cols-2 gap-3">
            <div 
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors ${
                draggedFleetId ? "border-red-400 bg-red-100/50 dark:border-red-700 dark:bg-red-900/20" : "border-neutral-200 dark:border-neutral-800"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropToStatus(e, "angulum")}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">Angulum</span>
              <p className="text-[9px] text-neutral-400 text-center leading-tight">Capped CP, Aux Req, Exclusive BPs</p>
              <div className="flex flex-wrap gap-1 mt-2 justify-center">
                {angulumFleets.map(f => (
                  <div key={f.id} className="size-2 rounded-full bg-red-500 shadow-sm" title={f.name} />
                ))}
              </div>
            </div>
            <div 
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors ${
                draggedFleetId ? "border-blue-400 bg-blue-100/50 dark:border-blue-700 dark:bg-blue-900/20" : "border-neutral-200 dark:border-neutral-800"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropToStatus(e, "active")}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Active</span>
              <p className="text-[9px] text-neutral-400 text-center leading-tight">Shared Build Limits, Exclusive BPs</p>
              <div className="flex flex-wrap gap-1 mt-2 justify-center">
                {activeFleets.map(f => (
                  <div key={f.id} className="size-2 rounded-full bg-blue-500 shadow-sm" title={f.name} />
                ))}
              </div>
            </div>
          </div>

          {/* List of fleets */}
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-64 pr-1 custom-scrollbar">
            {savedFleets.length > 0 ? (
              savedFleets.map((fleet) => {
                const errors = getFleetValidationErrors(fleet.id, savedFleets, allShips);
                const hasErrors = errors.length > 0;
                const isCurrent = fleet.id === currentFleetId;
                
                return (
                  <div
                    key={fleet.id}
                    draggable
                    onDragStart={() => handleDragStart(fleet.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleReorder(e, fleet.id)}
                    className={`group flex items-center justify-between rounded-xl border p-2 transition-all hover:shadow-sm cursor-grab active:cursor-grabbing ${
                      hasErrors 
                        ? "border-red-500 bg-red-50 dark:bg-red-950/20 ring-1 ring-red-500" 
                        : isCurrent
                          ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
                          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex flex-col gap-1 opacity-30 group-hover:opacity-60 transition-opacity">
                        <div className="w-3 h-0.5 bg-neutral-500 rounded-full" />
                        <div className="w-3 h-0.5 bg-neutral-500 rounded-full" />
                        <div className="w-3 h-0.5 bg-neutral-500 rounded-full" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-bold truncate ${isCurrent ? "text-blue-600 dark:text-blue-400" : ""}`}>
                            {fleet.name}
                          </p>
                          {fleet.isAngulum && (
                            <span className="bg-red-500 text-[8px] font-black text-white px-1 rounded uppercase">Angulum</span>
                          )}
                          {fleet.isActive && (
                            <span className="bg-blue-500 text-[8px] font-black text-white px-1 rounded uppercase">Active</span>
                          )}
                        </div>
                        <p className="text-[9px] text-neutral-500 dark:text-neutral-500 truncate">
                          {totalShips(fleet)} ships • {fleet.maxCommandPoints} CP
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {hasErrors && (
                        <div className="group/err relative">
                          <div className="flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white cursor-help">!</div>
                          <div className="invisible absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-black p-2 text-[9px] text-white opacity-0 transition group-hover/err:visible group-hover/err:opacity-100 z-10 shadow-xl">
                            {errors.map((err, i) => (
                              <div key={i} className="mb-1 last:mb-0">• {err.message}</div>
                            ))}
                            <div className="absolute right-1 top-full border-4 border-transparent border-t-black" />
                          </div>
                        </div>
                      )}
                      <button
                        className="fo-btn fo-btn-xs fo-btn-primary"
                        onClick={() => onLoad(fleet.id)}
                      >
                        Load
                      </button>
                      <button
                        className="fo-btn fo-btn-xs fo-btn-text text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => onDelete(fleet.id)}
                      >
                        <img className="size-3 dark:invert sepia hue-rotate-[300deg] saturate-[200%]" src="/ui/close.svg" alt="Delete" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-4 text-center text-[10px] text-neutral-400 dark:text-neutral-600 italic">
                No saved fleets yet.
              </p>
            )}
          </div>
          
          <button 
            className="w-full py-1.5 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-[10px] font-bold text-neutral-400 hover:border-neutral-300 hover:text-neutral-500 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropToStatus(e, "none")}
          >
            Drop here to clear status
          </button>
        </div>
      )}
    </div>
  );
}
