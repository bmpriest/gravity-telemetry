"use client";

import BlueprintsModuleCard from "./BlueprintsModuleCard";
import type { BlueprintSuperCapitalShip, BlueprintUnknownModule, BlueprintWeaponModule, BlueprintPropulsionModule, BlueprintMiscModule } from "@/utils/blueprints";

type BlueprintModule = BlueprintUnknownModule | BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule;

interface Props {
  ship: BlueprintSuperCapitalShip;
  owner: boolean | undefined;
  onChange: () => void;
}

const categories = ["M", "A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * Supercapital module editor — rendered as the body of a right-sliding
 * {@link SlideOver} drawer (the chrome/title/close live on the drawer).
 */
export default function BlueprintsModules({ ship, owner, onChange }: Props) {
  const unlockedCount = ship.modules.filter((mod) => (mod as BlueprintModule).unlocked).length;

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-xs font-medium text-neutral-500 transition duration-500 dark:text-neutral-400">
        {unlockedCount}/{ship.modules.length} modules unlocked
      </p>
      {categories.map((category) => {
        const mods = ship.modules.filter((mod) => mod.system.includes(category));
        if (mods.length === 0) return null;
        return (
          <section key={category} className="w-full">
            <h4 className="mb-1 text-xs font-bold uppercase text-neutral-500 transition duration-500 dark:text-neutral-400">
              {category} Modules
            </h4>
            <div className="grid w-full grid-cols-1 items-stretch gap-1.5 ">
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
          </section>
        );
      })}
    </div>
  );
}
