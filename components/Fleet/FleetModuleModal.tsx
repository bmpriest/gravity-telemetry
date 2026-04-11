"use client";

import { useMemo } from "react";
import type { AllShip, AllModule, AircraftSubsystem } from "@/utils/ships";
import type { FleetShipInstance } from "@/utils/fleet";

interface Props {
  instances: FleetShipInstance[];
  ships: AllShip[];
  moduleConfig: Record<string, Record<string, number>>;
  ownedModuleIds: Set<number> | null;
  showOwnedOnly: boolean;
  onClose: () => void;
  onSetModule: (instanceId: string, category: string, moduleId: number, ships: AllShip[]) => void;
}

export default function FleetModuleModal({
  instances,
  ships,
  moduleConfig,
  ownedModuleIds,
  showOwnedOnly,
  onClose,
  onSetModule,
}: Props) {
  const shipInfo = useMemo(() => {
    const first = instances[0];
    return first ? ships.find((s) => s.id === first.shipId && s.variant === first.variant) : undefined;
  }, [instances, ships]);

  const stackCount = instances.length;

  const categories = useMemo(() => {
    if (!shipInfo || !("modules" in shipInfo) || !shipInfo.modules) return new Map<string, AllModule[]>();
    const map = new Map<string, AllModule[]>();
    for (const mod of shipInfo.modules as AllModule[]) {
      const cat = mod.system.charAt(0);
      const existing = map.get(cat) || [];
      existing.push(mod);
      map.set(cat, existing);
    }
    const sortedMap = new Map<string, AllModule[]>();
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === "M") return -1;
      if (b === "M") return 1;
      return a.localeCompare(b);
    });
    for (const k of keys) sortedMap.set(k, map.get(k)!);
    return sortedMap;
  }, [shipInfo]);

  function isModuleAvailable(mod: AllModule) {
    if (!showOwnedOnly) return true;
    if (mod.default) return true;
    if (ownedModuleIds && ownedModuleIds.has(mod.id)) return true;
    return false;
  }

  function getHangarInfo(mod: AllModule) {
    if (mod.type === "unknown" || !("subsystems" in mod)) return null;
    const hangars = mod.subsystems.filter(s => s.type === "hanger") as AircraftSubsystem[];
    if (hangars.length === 0) return null;
    
    return hangars.map(h => ({
      type: h.hanger,
      capacity: h.capacity
    }));
  }

  return (
    <div
      id="module-menu"
      className="flex max-h-[85vh] w-[90vw] max-w-4xl flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl transition duration-500 dark:border-neutral-700 dark:bg-neutral-900"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          {shipInfo && <img className="h-16 object-contain" src={shipInfo.img} alt={shipInfo.name} />}
          <div className="text-left">
            <h3 className="text-lg font-bold transition duration-500 text-black dark:text-white">
              {shipInfo?.name}
              {stackCount > 1 && <span className="ml-1 text-sm font-normal text-neutral-500 dark:text-neutral-400">(x{stackCount})</span>}
            </h3>
            <p className="text-sm text-neutral-500 transition duration-500 dark:text-neutral-400">
              {shipInfo?.variantName} — Module Configuration
            </p>
          </div>
        </div>
        <button className="fo-btn fo-btn-circle fo-btn-text" type="button" onClick={onClose}>
          <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/close.svg" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {instances.map((inst, index) => {
          const config = moduleConfig[inst.id] || {};

          const getActiveModuleId = (cat: string, mods: AllModule[]) => {
            if (config[cat] !== undefined) return config[cat];
            const defaultMod = mods.find(m => m.default);
            return defaultMod?.id;
          };

          return (
            <div key={inst.id} className="mb-6 last:mb-0 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
              {instances.length > 1 && (
                <h4 className="mb-3 text-sm font-bold text-neutral-700 dark:text-neutral-300">
                  Unit #{index + 1}
                </h4>
              )}

              <div className="flex flex-col gap-4">
                {Array.from(categories.entries()).map(([cat, mods]) => {
                  const activeId = getActiveModuleId(cat, mods);

                  return (
                    <div key={cat} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                          {cat}
                        </span>
                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Slot</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {mods.map((mod) => {
                          const isActive = activeId === mod.id;
                          const available = isModuleAvailable(mod);
                          const hangarInfo = getHangarInfo(mod);

                          return (
                            <button
                              key={mod.id}
                              type="button"
                              disabled={!available}
                              onClick={() => onSetModule(inst.id, cat, mod.id, ships)}
                              className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition-all duration-200 ${
                                isActive
                                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-600 dark:bg-blue-900/30"
                                  : available
                                  ? "border-neutral-200 bg-white hover:border-blue-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500"
                                  : "border-neutral-200 bg-neutral-100 opacity-50 cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900"
                              }`}
                            >
                              <div className="flex w-full items-start justify-between gap-2">
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{mod.system}</span>
                                  <span className="text-[0.7rem] font-semibold text-black dark:text-white line-clamp-2">
                                    {"name" in mod ? mod.name : "Unknown Module"}
                                  </span>
                                </div>
                                {mod.img && (
                                  <img className="h-6 w-6 object-contain dark:invert" src={mod.img} alt="" />
                                )}
                              </div>
                              
                              {hangarInfo && (
                                <div className="flex flex-wrap gap-1">
                                  {hangarInfo.map((h, i) => (
                                    <span key={i} className="rounded bg-pink-100 px-1 py-0.5 text-[0.55rem] font-bold text-pink-800 dark:bg-pink-900/40 dark:text-pink-200 border border-pink-200 dark:border-pink-800">
                                      {h.capacity}x {h.type}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {!available && (
                                <span className="text-[0.6rem] text-red-500 font-medium">Not owned</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
