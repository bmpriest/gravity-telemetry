"use client";

import { isSupercapital, type RichSystem } from "@/utils/shipModel";
import { resolveSystemIcon } from "@/utils/icons";
import { getEnabledCategories } from "trace_events";

interface Props {
  system: RichSystem;
  shipType: string;
  onClick: () => void;
}

function deriveIndex(systemCode: string) {
  const letter = systemCode[0];
  const letterOrder = letter === "M" ? 1 : letter.charCodeAt(0) - 63; // A=2, B=3, …
  return [Number(letterOrder), Number(systemCode[1])]
}

/** A system tile in the System Library list: icon top-left, code, name. */
export default function SystemListCard({ system, shipType, onClick }: Props) {
  const icon = resolveSystemIcon(system.iconKey, system.systemTypeName);
  const supercap = isSupercapital(shipType);
  const indexed = system.code ? deriveIndex(system.code) : [];
  const location = system.code ? `col-start-${indexed[1]} row-start-${indexed[0]} ` : 'hidden col-start-1 row-end-auto ';
  return (
    <button
      type="button"
      onClick={onClick}
      className={location + "group relative flex h-36 w-full flex-col justify-between rounded-xl bg-neutral-100/40 p-3 text-left transition duration-300 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800"}
    >
      <div className="flex items-center gap-2">
        <img className="size-8 shrink-0 select-none transition duration-500" src={icon} alt={system.systemTypeName} />
        {supercap && system.code && (
          <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-xs font-bold text-white transition duration-500 dark:bg-neutral-200 dark:text-neutral-900">{system.code}</span>
        )}
      </div>
      <div>
        <p className="line-clamp-2 font-semibold leading-tight transition duration-500">{system.name}</p>
        <p className="mt-1 text-xs text-neutral-500 transition duration-500 dark:text-neutral-400">{system.systemTypeName}</p>
      </div>
      {supercap && system.includedWithBlueprint && (
        <span className="absolute right-2 top-2 rounded-full bg-green-100 px-1.5 text-[0.6rem] font-medium text-green-800 transition duration-500 dark:bg-green-900 dark:text-green-200">incl.</span>
      )}
    </button>
  );
}
