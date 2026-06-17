"use client";

import Link from "next/link";
import type { BlueprintSuperCapitalShip, BlueprintUnknownModule, BlueprintWeaponModule, BlueprintPropulsionModule, BlueprintMiscModule } from "@/utils/blueprints";

type BlueprintModule = BlueprintUnknownModule | BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule;

interface Props {
  ship: BlueprintSuperCapitalShip;
  mod: BlueprintModule;
  owner: boolean | undefined;
  onChange: () => void;
}

export default function BlueprintsModuleCard({ ship, mod, owner, onChange }: Props) {
  function toggleUnlocked() {
    if (!owner) return;
    mod.unlocked = !mod.unlocked;
    onChange();
  }

  const name = mod.type === "known" ? (mod as BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule).name : "Unknown Module";
  const actionLabel = mod.unlocked ? "Relock" : "Unlock";

  return (
    <div
      className={`flex min-h-14 w-full items-center gap-2 rounded-lg border px-2 py-1.5 transition duration-300 ${
        mod.unlocked
          ? "border-green-200 bg-green-50/80 dark:border-green-800 dark:bg-green-950/30"
          : "border-neutral-300 bg-neutral-100/75 dark:border-neutral-700 dark:bg-neutral-900"
      }`}
    >
      <Link
        className={`flex min-w-0 flex-1 items-center gap-2 text-left transition duration-300 hover:brightness-95 dark:hover:brightness-125 ${
          mod.unlocked ? "" : "opacity-60"
        }`}
        href={`/modules/system-library?ship=${ship.id}&sys=${mod.id}`}
        target="_blank"
      >
        <span className="w-10 shrink-0 rounded-md bg-neutral-800 px-1.5 py-1 text-center text-xs font-bold text-white transition duration-500 dark:bg-neutral-200 dark:text-neutral-900">
          {mod.system}
        </span>
        <img className="size-8 shrink-0 object-contain" src={mod.img} alt={mod.system} loading="lazy" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium leading-tight">{name}</span>
      </Link>

      {!mod.default && (
        <button
          className={`btn min-h-8 shrink-0 rounded-md px-2 py-1 text-xs font-semibold transition duration-300 disabled:cursor-auto disabled:opacity-60 ${
            mod.unlocked
              ? "border-red-300 bg-red-100 text-red-800 hover:bg-red-200 dark:border-red-700 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900"
              : "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-900"
          }`}
          type="button"
          onClick={toggleUnlocked}
          disabled={!owner}
          aria-pressed={mod.unlocked}
          title={owner ? `${actionLabel} ${mod.system}` : `${mod.system} is ${mod.unlocked ? "unlocked" : "locked"}`}
        >
          {owner ? actionLabel : mod.unlocked ? "Unlocked" : "Locked"}
        </button>
      )}
    </div>
  );
}
