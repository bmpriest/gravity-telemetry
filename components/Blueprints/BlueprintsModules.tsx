"use client";

import BlueprintsModuleCard from "./BlueprintsModuleCard";
import type { BlueprintSuperCapitalShip, BlueprintUnknownModule, BlueprintWeaponModule, BlueprintPropulsionModule, BlueprintMiscModule } from "@/utils/blueprints";

type BlueprintModule = BlueprintUnknownModule | BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule;

interface Props {
  ship: BlueprintSuperCapitalShip;
  owner: boolean | undefined;
  onDone: () => void;
  onChange: () => void;
}

const categories = ["M", "A", "B", "C", "D", "E", "F", "G", "H"];

export default function BlueprintsModules({ ship, owner, onDone, onChange }: Props) {
  return (
    <div
      id="menu"
      className="flex w-[80vw] flex-col items-center justify-center rounded-2xl bg-white p-4 md:w-[40rem] md:p-10 lg:w-[50rem] xl:w-[60rem] dark:bg-neutral-800"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-2xl font-bold">
        {ship.name} ({ship.modules.filter((mod) => (mod as BlueprintModule).unlocked).length}/{ship.modules.length})
      </h2>
      <p>{ship.variantName}</p>
      <div className="my-4 flex h-80 w-full flex-col items-center justify-start gap-2 overflow-y-scroll p-4 sm:h-[30rem]">
        {categories.map((category) => {
          const mods = ship.modules.filter((mod) => mod.system.includes(category));
          if (mods.length === 0) return null;
          return (
            <div key={category} className="w-full">
              <div className="flex w-full flex-col items-center justify-center">
                <h4 className="my-2 text-xl font-bold">{category} Modules</h4>
                <div className="flex w-full flex-wrap items-stretch justify-center gap-3">
                  {mods.map((mod) => (
                    <BlueprintsModuleCard
                      key={mod.system}
                      ship={ship}
                      mod={mod as BlueprintModule}
                      owner={owner}
                      onChange={onChange}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="fo-btn w-full grow border-green-100 bg-green-100 text-black transition duration-500 hover:border-green-300 hover:bg-green-300 dark:border-green-600 dark:bg-green-600 dark:text-white dark:hover:border-green-700 dark:hover:bg-green-700"
        type="button"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}
