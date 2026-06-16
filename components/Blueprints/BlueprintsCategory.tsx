"use client";

import BlueprintsCard from "./BlueprintsCard";
import type { BlueprintAllShip } from "@/utils/blueprints";

interface UserFragment {
  fragmentId: number;
  quantityOwned: number;
}

interface Props {
  shipType: string;
  isOwner: boolean | undefined;
  currentLayout: "list" | "grid";
  showVariants: boolean;
  data: BlueprintAllShip[] | undefined;
  displayedData: BlueprintAllShip[] | undefined;
  onDataChange: () => void;
  onMarkUnsaved: () => void;
  fragmentNames: Map<number, string>;
  userFragments: UserFragment[];
  onSetOwned: (fragmentId: number, qty: number) => void;
  onUnlockFragment: (ship: BlueprintAllShip) => void;
}

export default function BlueprintsCategory({
  shipType,
  isOwner,
  currentLayout,
  showVariants,
  data,
  displayedData,
  onDataChange,
  onMarkUnsaved,
  fragmentNames,
  userFragments,
  onSetOwned,
  onUnlockFragment,
}: Props) {
  const typeShips = displayedData?.filter((ship) => ship.type === shipType) ?? [];
  if (!data || !displayedData || typeShips.length === 0) return null;

  const unlockedCount = data.filter((s) => s.type === shipType && s.unlocked).length;
  const totalCount = data.filter((s) => s.type === shipType).length;

  return (
    <section className="mb-8 flex w-full flex-col">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold transition duration-500">
        <img className="size-7 select-none transition duration-500 dark:invert" src={`/ships/classes/${shipType.toLowerCase()}.svg`} alt="" />
        {shipType}s
        <span className="text-sm font-normal text-neutral-500 transition duration-500 dark:text-neutral-400">
          {unlockedCount}/{totalCount} unlocked
        </span>
      </h2>

      <div className="flex flex-wrap items-start justify-start gap-3">
        {typeShips.map((ship) => (
          <BlueprintsCard
            key={ship.id}
            ship={ship}
            layout={currentLayout}
            variants={showVariants}
            allVariants={displayedData.filter((s) => ship.name === s.name)}
            owner={isOwner}
            onChange={() => { onMarkUnsaved(); onDataChange(); }}
            fragmentNames={fragmentNames}
            userFragments={userFragments}
            onSetOwned={onSetOwned}
            onUnlockFragment={() => onUnlockFragment(ship)}
          />
        ))}
      </div>
    </section>
  );
}
