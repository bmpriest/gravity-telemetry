"use client";

import { getSystemPrimaryStats, isSupercapital, type RichSystem } from "@/utils/shipModel";
import { resolveSystemIcon } from "@/utils/icons";
import ModuleInfoCard from "./ModuleInfoCard";

interface Props {
  system: RichSystem;
  /** The ship's type — controls whether the code / included badge appears. */
  shipType: string;
}

/**
 * The shared System View, reused by the System Library and the Blueprint
 * Library. Renders a header box (icon, code, name, included flag, primary
 * stats) followed by one ModuleInfoCard per module.
 */
export default function SystemView({ system, shipType }: Props) {
  const supercap = isSupercapital(shipType);
  const icon = resolveSystemIcon(system.iconKey, system.systemTypeName);
  const primaryStats = getSystemPrimaryStats(system);

  return (
    <div className="flex w-full flex-col items-stretch gap-4">
      {/* ---- Header box ---- */}
      <div className="flex w-full flex-col gap-4 rounded-2xl bg-neutral-100/40 p-5 transition duration-500 sm:flex-row sm:items-center dark:bg-neutral-900">
        <div className="flex items-center gap-4">
          <img className="size-14 shrink-0 select-none transition duration-500 dark:invert" src={icon} alt={system.systemTypeName} />
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              {supercap && system.code && (
                <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-sm font-bold text-white transition duration-500 dark:bg-neutral-200 dark:text-neutral-900">{system.code}</span>
              )}
              <h2 className="text-xl font-bold transition duration-500">{system.name}</h2>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-neutral-600 transition duration-500 dark:text-neutral-400">{system.systemTypeName}</span>
              {supercap && system.includedWithBlueprint != null && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium transition duration-500 ${system.includedWithBlueprint ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"}`}>
                  {system.includedWithBlueprint ? "Included" : "Not Included"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* primary stats */}
        {primaryStats.length > 0 && (
          <div className="flex flex-wrap gap-3 sm:ms-auto sm:justify-end">
            {primaryStats.map((s) => (
              <div key={s.key} className="flex min-w-[5.5rem] flex-col items-center rounded-xl bg-neutral-200/60 px-3 py-2 transition duration-500 dark:bg-neutral-800">
                <img className="size-5 select-none transition duration-500 dark:invert" src={s.icon} aria-hidden="true" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
                <span className="mt-1 text-lg font-bold leading-none text-yellow-600 transition duration-500 dark:text-yellow-400">{s.value}</span>
                <span className="mt-0.5 text-center text-[0.65rem] uppercase tracking-wide text-neutral-500 transition duration-500 dark:text-neutral-400">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Module cards ---- */}
      {system.modules.length === 0 ? (
        <div className="rounded-xl bg-neutral-100/40 p-6 text-center text-neutral-500 transition duration-500 dark:bg-neutral-900 dark:text-neutral-400">
          This system has no installable modules.
        </div>
      ) : (
        system.modules.map((m) => <ModuleInfoCard key={m.id} module={m} system={system} />)
      )}
    </div>
  );
}
