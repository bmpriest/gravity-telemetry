"use client";

import type { Fleet } from "@/utils/fleet";

interface Props {
  fleet: Fleet;
  currentCP: number;
  savedCount: number;
  onUpdateName: (name: string) => void;
  onUpdateMaxCP: (cp: number) => void;
  onSave: () => void;
  onNewFleet: () => void;
  onToggleSaved: () => void;
}

export default function FleetToolbar({ fleet, currentCP, savedCount, onUpdateName, onUpdateMaxCP, onSave, onNewFleet, onToggleSaved }: Props) {
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
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 transition duration-500 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={fleet.name}
          type="text"
          className="fo-input flex-1 border-neutral-200 bg-white text-left text-lg font-bold text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          placeholder="Fleet Name"
          onChange={(e) => onUpdateName(e.target.value)}
        />
        <div className="flex gap-2">
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
            Load
            {savedCount > 0 && (
              <span className="rounded-full bg-blue-100 px-1.5 text-[0.6rem] font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="fo-input-group max-w-[8rem] bg-white transition dark:bg-neutral-800">
          <label className="fo-input-group-text text-xs" htmlFor="fleet-cp-max">Max CP</label>
          <input
            id="fleet-cp-max"
            value={fleet.maxCommandPoints}
            type="number"
            min="1"
            className="fo-input w-16 border-neutral-200 text-left text-sm text-black dark:border-neutral-700 dark:text-white"
            onChange={(e) => onUpdateMaxCP(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500 dark:text-neutral-400">Command Points</span>
            <span className={`font-bold ${cpColorClass}`}>{currentCP} / {fleet.maxCommandPoints}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
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
