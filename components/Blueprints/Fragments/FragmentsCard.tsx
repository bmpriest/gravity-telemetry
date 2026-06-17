"use client";

import BlueprintsCard from "@/components/Blueprints/BlueprintsCard";
import type { BlueprintAllShip } from "@/utils/blueprints";

interface UserFragment {
  fragmentId: number;
  quantityOwned: number;
}

interface Props {
  ship: BlueprintAllShip;
  allVariants: BlueprintAllShip[];
  fragmentNames: Map<number, string>;
  userFragments: UserFragment[];
  onSetOwned: (fragmentId: number, qty: number) => void;
  onUnlock: () => void;
  onChange: () => void;
}

/**
 * Fragment page adapter for the shared Blueprint Tracker ship card. Keeping the
 * page on BlueprintsCard avoids a second ship-card layout with divergent drawer
 * behavior, while this wrapper preserves the fragment-page callback names.
 */
export default function FragmentsCard({ ship, allVariants, fragmentNames, userFragments, onSetOwned, onUnlock, onChange }: Props) {
  return (
    <BlueprintsCard
      ship={ship}
      layout="grid"
      variants
      allVariants={allVariants}
      owner
      onChange={onChange}
      fragmentNames={fragmentNames}
      userFragments={userFragments}
      onSetOwned={onSetOwned}
      onUnlockFragment={onUnlock}
    />
  );
}
