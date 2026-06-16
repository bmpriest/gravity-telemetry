"use client";

import { useState } from "react";
import DrawerTab from "@/components/Blueprints/DrawerTab";
import LockToggle from "@/components/Blueprints/LockToggle";
import FragmentsPanel from "./FragmentsPanel";
import type { BlueprintAllShip } from "@/utils/blueprints";

interface UserFragment {
  fragmentId: number;
  quantityOwned: number;
}

interface Props {
  ship: BlueprintAllShip;
  fragmentNames: Map<number, string>;
  userFragments: UserFragment[];
  onSetOwned: (fragmentId: number, qty: number) => void;
  onUnlock: () => void;
  /** Flip owned state manually, without touching fragment counts. */
  onToggleOwned: () => void;
}

/**
 * Card for a fragment-unlocked blueprint. A 90°-rotated tab on the right edge
 * expands the fragment drawer *out to the right of the card*. Each card owns its
 * open state, so several can be expanded at once to compare progress. Owned
 * state is the top-left lock toggle.
 */
export default function FragmentsCard({ ship, fragmentNames, userFragments, onSetOwned, onUnlock, onToggleOwned }: Props) {
  const [open, setOpen] = useState(false);

  const ownedOf = (id: number) => userFragments.find((f) => f.fragmentId === id)?.quantityOwned ?? 0;
  const required = ship.fragments ?? [];
  const completed = required.filter((r) => ownedOf(r.fragmentId) >= r.quantityRequired).length;

  return (
    <div
      className={`flex w-fit items-stretch overflow-hidden rounded-2xl border transition duration-500 ${
        ship.unlocked
          ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/40"
          : "border-neutral-300 bg-neutral-100/75 dark:border-neutral-700 dark:bg-neutral-900"
      }`}
    >
      <div className="relative flex w-[88vw] shrink-0 items-center gap-3 p-3 pl-12 sm:w-80">
        <LockToggle unlocked={ship.unlocked} logo={ship.manufacturerLogo} shipName={ship.name} owner onToggle={onToggleOwned} />
        <img className="h-14 w-14 shrink-0 object-contain" src={ship.img} alt={ship.name} loading="lazy" />
        <div className="flex flex-col">
          <h4 className="text-lg font-bold leading-tight transition duration-500">{ship.name}</h4>
          {ship.hasVariants && (
            <span className="text-sm text-neutral-500 transition duration-500">
              {ship.variantName} ({ship.variant})
            </span>
          )}
        </div>
      </div>

      <DrawerTab label={`Track Fragments (${completed}/${required.length})`} open={open} onToggle={() => setOpen((v) => !v)} />

      {open && (
        <div className="flex w-[88vw] flex-col overflow-y-auto border-l border-neutral-300 p-4 sm:w-[30rem] dark:border-neutral-700" style={{ maxHeight: "32rem" }}>
          <FragmentsPanel
            ship={ship}
            fragmentNames={fragmentNames}
            userFragments={userFragments}
            onSetOwned={onSetOwned}
            onUnlock={onUnlock}
          />
        </div>
      )}
    </div>
  );
}
