"use client";

import type { Fleet, FleetValidationError } from "@/utils/fleet";

interface Props {
  fleet: Fleet;
  currentCP: number;
  savedCount: number;
  validationErrors?: FleetValidationError[];
  onUpdateName: (name: string) => void;
  onUpdateMaxCP: (cp: number) => void;
  onSave: () => void;
  onNewFleet: () => void;
  onToggleSaved: () => void;
  onToggleAngulum: (enabled: boolean) => void;
}

export default function FleetToolbar({ 
  fleet, 
  currentCP, 
  savedCount, 
  validationErrors = [],
  onUpdateName, 
  onUpdateMaxCP, 
  onSave, 
  onNewFleet, 
  onToggleSaved,
  onToggleAngulum
}: Props) {
  const cpPercent = Math.min(100, (currentCP / Math.max(1, fleet.maxCommandPoints)) * 100);
  const isOver = currentCP > fleet.maxCommandPoints;
  const isWarning = cpPercent >= 75 && !isOver;

  const cpColorClass = isOver
    ? "text-red-500"
    : isWarning
    ? "text-yellow-600 dark:text-yellow-400"
    : "text-black dark:text-white";

  const cpBarClass = isOver ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 transition duration-500 shadow-sm ${
      fleet.isAngulum 
        ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20" 
        : "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
    }`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <input
            value={fleet.name}
            type="text"
            className={`fo-input w-full text-left text-lg font-bold transition-colors ${
              fleet.isAngulum
                ? "border-red-200 bg-white/80 text-red-900 focus:border-red-400 dark:border-red-800 dark:bg-red-900/40 dark:text-red-100"
                : "border-neutral-200 bg-white text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            }`}
            placeholder="Fleet Name"
            onChange={(e) => onUpdateName(e.target.value)}
          />
          {validationErrors.length > 0 && (
            <div className="group absolute -right-2 -top-2 z-10">
              <div className="flex size-5 cursor-help items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-neutral-900">
                !
              </div>
              <div className="invisible absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-lg bg-black p-2 text-[10px] text-white opacity-0 transition group-hover:visible group-hover:opacity-100">
                {validationErrors.map((err, i) => (
                  <div key={i} className="mb-1 last:mb-0">• {err.message}</div>
                ))}
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-black" />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${fleet.isAngulum ? "text-red-500" : "text-neutral-400"}`}>
              Angulum
            </span>
            <input 
              type="checkbox" 
              className="fo-checkbox fo-checkbox-sm fo-checkbox-error" 
              checked={fleet.isAngulum}
              onChange={(e) => onToggleAngulum(e.target.checked)}
            />
          </div>
          <button
            className="fo-btn fo-btn-sm border-green-300 bg-green-200 text-green-800 transition hover:bg-green-300 dark:border-green-700 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
            type="button"
            onClick={onSave}
          >
            <img className="size-3.5 select-none" src="/ui/save.svg" aria-hidden="true" />
            Save
          </button>
          <button
            className="fo-btn fo-btn-sm border-blue-300 bg-blue-200 text-blue-800 transition hover:bg-blue-300 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
            type="button"
            onClick={onNewFleet}
          >
            New
          </button>
          <button
            className="fo-btn fo-btn-sm border-neutral-300 bg-neutral-200 text-neutral-700 transition hover:bg-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
            type="button"
            onClick={onToggleSaved}
          >
            <img className="size-3.5 select-none dark:invert" src="/ui/load.svg" aria-hidden="true" />
            Fleets
            {savedCount > 0 && (
              <span className="rounded-full bg-blue-100 px-1.5 text-[0.6rem] font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`fo-input-group max-w-[8rem] transition ${
          fleet.isAngulum ? "bg-red-100/50 dark:bg-red-900/30" : "bg-white dark:bg-neutral-800"
        }`}>
          <label className="fo-input-group-text text-xs" htmlFor="fleet-cp-max">Max CP</label>
          <input
            id="fleet-cp-max"
            value={fleet.maxCommandPoints}
            type="number"
            disabled={fleet.isAngulum}
            min="1"
            className={`fo-input w-16 border-neutral-200 text-left text-sm transition ${
              fleet.isAngulum 
                ? "bg-transparent text-red-900 dark:text-red-200 border-transparent cursor-not-allowed" 
                : "text-black dark:border-neutral-700 dark:text-white"
            }`}
            onChange={(e) => onUpdateMaxCP(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className={fleet.isAngulum ? "text-red-600/70 dark:text-red-400/70" : "text-neutral-500 dark:text-neutral-400"}>
              Command Points
            </span>
            <span className={`font-bold ${cpColorClass}`}>{currentCP} / {fleet.maxCommandPoints}</span>
          </div>
          <div className={`h-1.5 w-full overflow-hidden rounded-full ${
            fleet.isAngulum ? "bg-red-200 dark:bg-red-900/50" : "bg-neutral-200 dark:bg-neutral-700"
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-300 ${cpBarClass}`}
              style={{ width: `${cpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
