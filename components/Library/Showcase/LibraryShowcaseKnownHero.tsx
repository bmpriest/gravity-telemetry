"use client";

import type { WeaponModule, PropulsionModule, MiscModule } from "@/utils/ships";

interface Props {
  mod: WeaponModule | PropulsionModule | MiscModule;
}

const statNames: Record<string, string> = {
  antiship: "Anti-Ship Fire",
  antiair: "Air Defense",
  siege: "Siege Fire",
  extraHP: "HP",
  armor: "Armor",
  energyShield: "Energy Shield",
  hpRecovery: "Repair",
  storage: "Storage",
};

/** @returns a percentage from 0 to 100 */
function calculateBarFill(value: number): number {
  const thresholds: [number, number][] = [
    [900, 1000],
    [2300, 2500],
    [4500, 5000],
    [9000, 10000],
    [14000, 15000],
    [21500, 22500],
    [28000, 30000],
    [47000, 50000],
    [96000, 100000],
    [190000, 200000],
  ];

  const limit = thresholds.find(([threshold]) => value <= threshold)?.[1] ?? 400000;
  return Math.min(1, Math.max(0, value / limit)) * 100;
}

export default function LibraryShowcaseKnownHero({ mod }: Props) {
  const { type, hp, ...otherStats } = mod.stats;
  const stats = otherStats as Record<string, number | null>;

  return (
    <div className="mt-2 flex w-full flex-col items-center justify-center gap-2">
      <div className="flex w-full flex-col items-center justify-around xl:flex-row">
        <div className="mb-3 flex flex-col items-center justify-center px-10 xl:mb-0">
          <p className="text-lg transition duration-500">
            <span className="font-medium transition duration-500">{hp.toLocaleString()}</span> System HP
          </p>
          <div className="du-label flex w-full select-auto items-center justify-start gap-2">
            <span className="text-left transition duration-500">{mod.default ? "Default module" : "Not a default module"}</span>
            <input
              type="checkbox"
              className="du-checkbox disabled:cursor-auto disabled:border disabled:opacity-100"
              style={{ backgroundSize: "cover", backgroundColor: mod.default ? "inherit" : undefined }}
              checked={!!mod.default}
              readOnly
              disabled
            />
          </div>
        </div>

        <div className="flex w-full grow-0 flex-col items-center justify-center gap-2 xl:w-auto xl:grow xl:flex-row xl:pr-10">
          {Object.entries(stats).map(([name, stat]) => (
            <div key={name} className="flex w-full grow-0 items-center justify-around gap-2 xl:w-auto xl:grow xl:flex-col xl:justify-center">
              <div className="relative h-6 w-40 overflow-hidden rounded-full bg-neutral-300 transition duration-500 xl:h-40 xl:w-6 dark:bg-neutral-700">
                <aside
                  className="absolute left-0 top-0 block h-full rounded-r-lg bg-neutral-500 transition-all duration-1000 xl:hidden"
                  style={{ width: `${calculateBarFill(stat ?? 0)}%` }}
                />
                <aside
                  className="absolute bottom-0 left-0 hidden w-full rounded-t-lg bg-neutral-500 transition-all duration-1000 xl:block"
                  style={{ height: `${calculateBarFill(stat ?? 0)}%` }}
                />
              </div>
              <div className="flex-col items-center justify-center">
                <p className="text-sm transition duration-500">{statNames[name]}</p>
                <h5 className="inline-flex items-center justify-center gap-1 font-semibold transition duration-500">
                  {(stat?.toLocaleString() ?? "0") + (name === "energyShield" ? "%" : "")}
                  <img className="size-4 select-none transition duration-500 dark:invert" src={`/weapons/stats/${name}.svg`} aria-hidden="true" />
                </h5>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
