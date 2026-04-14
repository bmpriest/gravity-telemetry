"use client";

import { useMemo } from "react";
import { attributes } from "@/utils/ships";
import type { WeaponSubsystem, AircraftSubsystem, AttackUAVSubsystem, RepairUAVSubsystem, MiscSubsytem, MiscUAVSubsystem } from "@/utils/ships";

type AnySubsystem = WeaponSubsystem | AircraftSubsystem | AttackUAVSubsystem | RepairUAVSubsystem | MiscSubsytem | MiscUAVSubsystem;

interface Props {
  subsystem: AnySubsystem;
}

/** [`displayed name`, `path to icon`] */
const propertyNames: Readonly<Record<string, [string, string]>> = {
  hanger: ["Hanger Type", "damageType"],
  capacity: ["Capacity", "alpha"],
  damageType: ["Damage Type", "damageType"],
  target: ["Prioritized Target", "target"],
  lockonEfficiency: ["Lock-on Efficiency", "lockonEfficiency"],
  alpha: ["Damage Per Hit", "alpha"],
  repair: ["HP Recovery", "hpRecovery"],
  attacksPerRound: ["Attacks Per Round", "attacksPerRound"],
  damageFrequency: ["Damage Frequency", "attacksPerRound"],
  cooldown: ["Cooldown", "lockonEfficiency"],
  lockOnTime: ["Lock-on Time", "lockonTime"],
  duration: ["Duration", "duration"],
  operationCount: ["Operation Count", "operationCount"],
};

const categoryNames: Readonly<Record<string, string>> = {
  antiship: "Anti-Ship Fire",
  antiair: "Air Defense",
  siege: "Siege Fire",
};

export default function LibraryShowcaseCardSubsystemCard({ subsystem }: Props) {
  const properties = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { attributes: _attrs, count, name, title, type, stats, ...rest } = subsystem as AnySubsystem & { stats?: unknown };
    return rest as Record<string, unknown>;
  }, [subsystem]);

  const stats = useMemo(() => {
    if (!("stats" in subsystem)) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { targetPriority, ...otherStats } = (subsystem as WeaponSubsystem).stats as unknown as Record<string, unknown> & { targetPriority: unknown };
    return otherStats as Record<string, unknown>;
  }, [subsystem]);

  const priority = useMemo<[string | null, [number, string][], number | null][] | undefined>(() => {
    if (!("stats" in subsystem)) return undefined;
    const { targetPriority } = (subsystem as WeaponSubsystem).stats as { targetPriority: unknown };

    if (Array.isArray(targetPriority)) {
      return [[null, targetPriority as [number, string][], null]];
    }

    return Object.entries(targetPriority as Record<string, { position: number; priorities?: [number, string][]; damage: number }>)
      .sort((a, b) => a[1].position - b[1].position)
      .map(([name, data]) => [name, "priorities" in data ? data.priorities! : [], data.damage]);
  }, [subsystem]);

  return (
    <div
      className={`flex flex-col items-stretch justify-between rounded-xl bg-neutral-100/25 p-4 transition duration-500 xl:flex-row dark:bg-neutral-900 ${priority ? "w-full" : "grow"}`}
    >
      <div className={`flex w-full flex-col items-start justify-start${priority ? " xl:w-[45%]" : ""}`}>
        <p className="text-left text-neutral-800 transition duration-500 dark:text-neutral-300">{subsystem.name}</p>
        <h5 className="text-lg font-medium transition duration-500">
          <span className="text-sm font-normal text-yellow-600 transition duration-500 dark:text-yellow-400">x{subsystem.count}</span>
          {" "}{subsystem.title}
        </h5>

        {priority && priority[0][0] && (
          <h4 className="mt-2 inline-flex items-center justify-center gap-1">
            <img className="size-4 select-none transition duration-500 dark:invert" src={`/weapons/stats/${priority[0][0]}.svg`} aria-hidden="true" />
            <span>
              <span className="text-lg font-medium text-yellow-600 transition duration-500 dark:text-yellow-400">
                {priority[0][2]?.toLocaleString()}
              </span>
              <span className="text-sm text-yellow-600 transition duration-500 dark:text-yellow-400">/min</span>
              <span className="ms-1 text-sm transition duration-500">({categoryNames[priority[0][0]!]})</span>
            </span>
          </h4>
        )}

        <div className="mt-3 flex w-full flex-col items-center justify-center gap-1">
          {Object.entries(properties).map(([name, property]) => (
            <>
            <div key={name} className="flex w-full items-center justify-between">
              <h5 className="inline-flex items-center justify-center gap-1 text-left font-medium transition duration-500">
                <img className="size-6 select-none transition duration-500 dark:invert" src={`/weapons/types/${propertyNames[name]?.[1] ?? name}.svg`} aria-hidden="true" />
                {propertyNames[name]?.[0] ?? name}
              </h5>
              <p className="text-right transition duration-500">
                {((property ?? 0) as number).toLocaleString() + (name === "lockonEfficiency" ? "%" : "")}
              </p>
            </div>
            {(name === "capacity") && 
             (subsystem.count > 1) && 
             (subsystem.type === "hanger") &&
             (subsystem.hanger === "Small Fighter" || subsystem.hanger === "Medium Fighter" || subsystem.hanger === "Large Fighter" || subsystem.hanger === "Corvette") &&
              <div key={name + "Cap"} className="w-full text-red-500 text-right">Total hangar capacity: {((property ?? 0) as number) * subsystem.count}</div>
            }
            </>
          ))}
        </div>

        {stats && (
          <div className="mt-3 flex w-full flex-col items-center justify-center gap-1">
            {Object.entries(stats).map(([name, property]) => (
              <div key={name} className="flex w-full items-center justify-between">
                <h5 className="inline-flex items-center justify-center gap-1 text-left font-medium transition duration-500">
                  <img className="size-6 select-none transition duration-500 dark:invert" src={`/weapons/types/${propertyNames[name]?.[1] ?? name}.svg`} aria-hidden="true" />
                  {propertyNames[name]?.[0] ?? name}
                </h5>
                {Array.isArray(property) ? (
                  <p className="text-right transition duration-500">{(property as number[])[0]} x {(property as number[])[1]}</p>
                ) : (
                  <p className="text-right transition duration-500">
                    {(property ?? 0) + (name === "damageFrequency" ? " time(s)" : "s")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {subsystem.attributes && (
          <div className="mt-4 flex w-full flex-col items-start justify-center gap-1">
            <h4 className="text-lg font-medium transition duration-500">Attributes</h4>
            {subsystem.attributes.map((attribute, index) => (
              <div key={index} className="tooltip-container flex items-start justify-center gap-0.5">
                <span className="select-none rounded-lg bg-neutral-200 px-2 py-px transition duration-500 dark:bg-neutral-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="ml-0.5 text-nowrap text-left transition duration-500">{attribute}</p>
                <span className="tooltip-nohover text-left text-xs text-neutral-800 transition duration-500 dark:text-neutral-300">
                  {attributes[attribute]}
                </span>
                <div className="du-tooltip inline-block shrink-0 cursor-help select-none" data-tip={attributes[attribute]}>
                  <img className="size-4 transition duration-500 dark:invert" src="/ui/info.svg" alt="Hover for attribute description" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {priority && (
        <>
          <aside className="my-3 min-h-1.5 w-full rounded-full bg-neutral-100 transition duration-500 xl:my-0 xl:w-1.5 dark:bg-neutral-800" />

          <div className="flex w-full flex-col items-start justify-start xl:w-[45%] xl:items-end">
            <h5 className="text-lg font-medium transition duration-500">
              {priority[0][0] ? "Attack" : "System"} Priority
            </h5>

            <div className="mt-3 flex w-full flex-col items-center justify-center gap-3">
              {priority.map(([name, priorities, damage], idx) => (
                <div key={idx} className="flex w-full flex-col items-center justify-center rounded-xl shadow">
                  {name && (
                    <div className="flex w-full items-center justify-between rounded-t-xl bg-neutral-200 px-3 py-1 transition duration-500 last:rounded-xl dark:bg-neutral-700">
                      <h6 className="inline-flex items-center justify-center gap-1 transition duration-500">
                        <img className="size-4 select-none transition duration-500 dark:invert" src={`/weapons/stats/${name}.svg`} aria-hidden="true" />
                        {categoryNames[name]}
                      </h6>
                      <p className="transition duration-500">{damage?.toLocaleString()}/min</p>
                    </div>
                  )}
                  {priorities.map((target, ti) => (
                    <div
                      key={ti}
                      className="flex w-full items-center justify-center gap-1 bg-neutral-200/25 px-3 transition duration-500 last:rounded-b-xl last:pb-1 dark:bg-neutral-700/50"
                    >
                      <h5 className="w-5 select-none text-neutral-700 transition duration-500 dark:text-neutral-300">
                        {String(target[0]).padStart(2, "0")}
                      </h5>
                      <img className="size-4 select-none transition duration-500 dark:invert" src={`/ships/classes/${target[1].toLowerCase()}.svg`} alt={target[1]} />
                      <p className="grow text-left transition duration-500">{target[1]}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
