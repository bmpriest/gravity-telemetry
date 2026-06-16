"use client";

import { useState } from "react";
import DrawerTab from "./DrawerTab";
import LockToggle from "./LockToggle";
import BlueprintsModules from "./BlueprintsModules";
import FragmentsPanel from "./Fragments/FragmentsPanel";
import type { BlueprintAllShip, BlueprintSuperCapitalShip, BlueprintUnknownModule, BlueprintWeaponModule, BlueprintPropulsionModule, BlueprintMiscModule } from "@/utils/blueprints";

type BlueprintModule = BlueprintUnknownModule | BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule;

interface UserFragment {
  fragmentId: number;
  quantityOwned: number;
}

interface Props {
  ship: BlueprintAllShip;
  layout: "list" | "grid";
  variants: boolean;
  allVariants: BlueprintAllShip[];
  owner: boolean | undefined;
  onChange: () => void;
  // Fragment drawer wiring (account-level inventory lives on the page).
  fragmentNames: Map<number, string>;
  userFragments: UserFragment[];
  onSetOwned: (fragmentId: number, qty: number) => void;
  onUnlockFragment: () => void;
}

/**
 * Blueprint Tracker ship card. Owned state is a top-left lock toggle (no tech
 * points). Supercapital modules and fragment tracking each expand a drawer
 * *out to the right of the card* via a 90°-rotated edge tab; both can be open
 * at once and each card is independent.
 */
export default function BlueprintsCard({ ship, layout, variants, allVariants, owner, onChange, fragmentNames, userFragments, onSetOwned, onUnlockFragment }: Props) {
  const [modOpen, setModOpen] = useState(false);
  const [fragOpen, setFragOpen] = useState(false);

  const showVariant = !ship.hasVariants || (ship.hasVariants && ship.variant === "A");
  const showVariantUnique = ship.hasVariants && ship.variant === "A";
  const isListLayout = layout === "list";
  const isSuperCap = "modules" in ship;
  const isFragment = Boolean(ship.isFragmentUnlocked);

  if (!variants && !showVariant) return null;

  function toggleOwned() {
    if (!owner) return;
    if (ship.unlocked) {
      ship.unlocked = false;
    } else {
      ship.unlocked = true;
      if (isSuperCap) {
        (ship as BlueprintSuperCapitalShip).modules.forEach((mod) => {
          (mod as BlueprintModule).unlocked = Boolean(mod.default);
        });
      }
    }
    onChange();
  }

  function unlockVariant(variant: BlueprintAllShip) {
    if (!owner) return;
    variant.unlocked = true;
    onChange();
  }

  function removeVariant(variant: BlueprintAllShip) {
    if (!owner) return;
    variant.unlocked = false;
    onChange();
  }

  const moduleUnlocked = isSuperCap ? (ship as BlueprintSuperCapitalShip).modules.filter((m) => (m as BlueprintModule).unlocked).length : 0;
  const moduleTotal = isSuperCap ? (ship as BlueprintSuperCapitalShip).modules.length : 0;

  const ownedFrag = (id: number) => userFragments.find((f) => f.fragmentId === id)?.quantityOwned ?? 0;
  const fragTotal = ship.fragments?.length ?? 0;
  const fragDone = (ship.fragments ?? []).filter((r) => ownedFrag(r.fragmentId) >= r.quantityRequired).length;

  return (
    <div
      className={`flex w-fit h-56 items-stretch overflow-hidden rounded-2xl text-left transition duration-500 ${
        ship.unlocked
          ? "bg-green-50 dark:bg-green-900/40"
          : "bg-neutral-100/75 dark:bg-neutral-900"
      }`}
    >
      {/* Card body */}
      <div className={`relative flex shrink-0 flex-col p-2 ${isListLayout ? "w-[88vw] sm:w-96" : "w-[88vw] sm:w-72"}`}>

        <div className="flex items-center gap-2">
          <LockToggle unlocked={ship.unlocked} logo={ship.manufacturerLogo} shipName={ship.name} owner={owner} onToggle={toggleOwned} />
          <h4 className="text-left text-xl font-bold transition duration-500">{ship.name}</h4>
          {variants ? (
            <div className="text-sm transition duration-500">
              {ship.variantName}{ship.hasVariants && <span className="text-sm transition duration-500"> ({ship.variant})</span>}
            </div>
          ) : !variants && ship.hasVariants ? (
            <div className="text-xs transition duration-500">{ship.variant}</div>
          ) : null}
        </div>

        <div className="flex grow items-center justify-center">
          <img
            className="max-h-32 w-auto object-contain"
            src={ship.img || `/ships/classes/${ship.type.toLowerCase()}.svg`}
            alt={ship.variant}
            loading="lazy"
            onError={(e) => ((e.target as HTMLImageElement).src = `/ships/classes/${ship.type.toLowerCase()}.svg`)}
          />
        </div>

        {!variants && showVariantUnique && (
          <div className="flex w-full items-center justify-center gap-2">
            {allVariants.slice(1).map((variant) => (
              <button
                key={variant.id}
                className={`btn relative w-1/4 grow overflow-hidden border-red-300 bg-red-300 text-black transition duration-500 dark:border-red-600 dark:bg-red-600 dark:text-white ${variant.unlocked ? "hover:border-red-500 hover:bg-red-500 dark:hover:border-red-700 dark:hover:bg-red-700" : ""}`}
                type="button"
                onClick={() => removeVariant(variant)}
              >
                {!variant.unlocked && (
                  <div
                    className={`overlay group absolute left-1/2 top-1/2 z-[1] flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-start bg-black/50 transition duration-200 hover:bg-black/60 dark:border dark:border-neutral-600 ${!owner ? "cursor-auto" : ""}`}
                    onClick={(e) => { e.stopPropagation(); unlockVariant(variant); }}
                  >
                    <img className="message size-8 select-none transition group-hover:brightness-110" src="/ui/lock.svg" aria-hidden="true" />
                  </div>
                )}
                {variant.variant}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edge tabs */}
      {(isSuperCap || isFragment) && (
        <div className="flex flex-col">
          {isSuperCap && (
            <DrawerTab label={`Modules`} open={modOpen} onToggle={() => setModOpen((v) => !v)} />
          )}
          {isFragment && (
            <DrawerTab label={`Fragments`} open={fragOpen} onToggle={() => setFragOpen((v) => !v)} />
          )}
        </div>
      )}

      {/* Drawer panel(s) — to the right of the card */}
      {(modOpen || fragOpen) && (
        <div className="flex w-[88vw] transition duration-500 flex-col gap-4 overflow-y-auto border-l border-neutral-300 p-4 sm:w-[30rem] dark:border-neutral-700" style={{ maxHeight: "32rem" }}>
          {isSuperCap && modOpen && (
            <BlueprintsModules ship={ship as BlueprintSuperCapitalShip} owner={owner} onChange={onChange} />
          )}
          {isFragment && fragOpen && (
            <FragmentsPanel
              ship={ship}
              fragmentNames={fragmentNames}
              userFragments={userFragments}
              onSetOwned={onSetOwned}
              onUnlock={onUnlockFragment}
            />
          )}
        </div>
      )}
    </div>
  );
}
