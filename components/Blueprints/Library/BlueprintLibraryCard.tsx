"use client";

import type { RichShip } from "@/utils/shipModel";

interface Props {
  ship: RichShip;
  variantCount: number;
  onClick: () => void;
}

/** A ship tile on the Blueprint Library grid: image, short name, CP, RE, logo. */
export default function BlueprintLibraryCard({ ship, variantCount, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-56 w-full flex-col overflow-hidden rounded-2xl bg-neutral-100/40 p-3 text-left transition duration-300 hover:bg-neutral-200 hover:shadow-lg dark:bg-neutral-900 dark:hover:bg-neutral-800"
    >
      {/* CP + RE chips */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        {ship.isRe ? <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-sky-700 transition duration-500 dark:bg-sky-900 dark:text-sky-200">RE</span> : null}
        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-800 px-1.5 py-0.5 text-xs font-bold text-white transition duration-500 dark:bg-neutral-200 dark:text-neutral-900">
          <img className="size-3 dark:hidden" src="/fleet/command_point.svg" aria-hidden="true" />
          {ship.commandPoints} CP
        </span>
      </div>

      {variantCount > 1 && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-neutral-200/80 px-1.5 py-0.5 text-[0.65rem] font-medium text-neutral-700 transition duration-500 dark:bg-neutral-700/80 dark:text-neutral-200">
          {variantCount} variants
        </span>
      )}

      <div className="flex grow items-center justify-center">
        <img
          className="max-h-32 w-auto object-contain transition duration-300 group-hover:scale-105"
          src={ship.img || `/ships/classes/${ship.type.toLowerCase()}.svg`}
          alt={ship.shortName}
          onError={(e) => ((e.target as HTMLImageElement).src = `/ships/classes/${ship.type.toLowerCase()}.svg`)}
        />
      </div>

      <div className="flex items-end gap-2">
        {ship.manufacturer.logo && (
          <img className="size-8 shrink-0 select-none rounded object-contain" src={ship.manufacturer.logo} alt={ship.manufacturer.name} title={ship.manufacturer.name} />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight transition duration-500">{ship.shortName}</p>
          <p className="truncate text-xs text-neutral-500 transition duration-500 dark:text-neutral-400">{ship.title || ship.type}</p>
        </div>
      </div>
    </button>
  );
}
