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
  function unlock() {
    if (!owner) return;
    mod.unlocked = true;
    onChange();
  }

  function remove() {
    if (!owner) return;
    mod.unlocked = false;
    onChange();
  }

  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center rounded-2xl border-neutral-300 bg-neutral-100/75 p-4 transition duration-500 sm:w-56 dark:border-neutral-700 dark:bg-neutral-900 ${
        mod.unlocked ? "overflow-hidden hover:bg-neutral-200/75 dark:hover:bg-neutral-800" : ""
      }`}
    >
      {!mod.unlocked && (
        <button
          className={`overlay group absolute left-1/2 top-1/2 z-[1] h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/50 transition duration-200 hover:bg-black/60 dark:border dark:border-neutral-600`}
          type="button"
          onClick={unlock}
        >
          <div className="message flex w-full flex-col items-center justify-center gap-3 transition group-hover:brightness-110">
            <p className="font-medium text-white">{owner ? "Click to mark as unlocked" : "Not unlocked"}</p>
            <img className="size-12" src="/ui/lock.svg" aria-hidden="true" />
          </div>
        </button>
      )}

      <h5 className="text-lg font-medium">{mod.system}</h5>
      <p className="text-sm">{mod.type === "known" ? (mod as BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule).name : "Unknown Module"}</p>

      <img className="my-3 size-16" src={mod.img} alt={mod.system} loading="lazy" />

      <div className={`flex w-full flex-col gap-2 transition duration-500 ${!mod.unlocked ? "pointer-events-none opacity-50 brightness-50" : ""}`}>
        {owner && (
          <button
            className="fo-btn grow border-red-300 bg-red-300 text-sm text-black transition duration-500 hover:border-red-500 hover:bg-red-500 dark:border-red-600 dark:bg-red-600 dark:text-white dark:hover:border-red-700 dark:hover:bg-red-700"
            type="button"
            onClick={remove}
          >
            Remove
          </button>
        )}
        <Link
          className="fo-btn grow border-blue-300 bg-blue-300 text-sm text-black transition duration-500 hover:border-blue-400 hover:bg-blue-400 dark:border-blue-600 dark:bg-blue-600 dark:text-white dark:hover:border-blue-700 dark:hover:bg-blue-700"
          href={`/modules/module-library?s=${encodeURIComponent(ship.name)}&m=${encodeURIComponent(mod.system)}`}
          target="_blank"
        >
          View in Module Library
        </Link>
      </div>
    </div>
  );
}
