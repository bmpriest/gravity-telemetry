"use client";

import { useState, useEffect, useRef } from "react";
import type { BlueprintAllShip, BlueprintSuperCapitalShip, BlueprintUnknownModule, BlueprintWeaponModule, BlueprintPropulsionModule, BlueprintMiscModule } from "@/utils/blueprints";

type BlueprintModule = BlueprintUnknownModule | BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule;

interface Props {
  ship: BlueprintAllShip;
  layout: "list" | "grid";
  variants: boolean;
  exposeModules: boolean;
  allVariants: BlueprintAllShip[];
  tp: number;
  mirror: boolean;
  owner: boolean | undefined;
  onTp: (tp: number) => void;
  onMirror: () => void;
  onModules: (ship: BlueprintSuperCapitalShip) => void;
  onChange: () => void;
}

function formatTp(tp: number) {
  const version = Number(String(Number(tp) + 100).padStart(5, "0").slice(0, 3));
  const points = String(tp).padStart(5, "0").slice(3);
  return `v${version}.${points}`;
}

export default function BlueprintsCard({ ship, layout, variants, exposeModules, allVariants, tp, mirror, owner, onTp, onMirror, onModules, onChange }: Props) {
  const [techPoints, setTechPoints] = useState(String(tp));
  const tpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTechPoints(String(tp));
  }, [tp]);

  const showVariant = !ship.hasVariants || (ship.hasVariants && ship.variant === "A");
  const showVariantUnique = ship.hasVariants && ship.variant === "A";
  const isListLayout = layout === "list";
  const isGolden = ship.techPoints >= ("modules" in ship ? 200 : 100);
  const isSuperCap = "modules" in ship;

  if (!variants && !showVariant) return null;

  function handleTpChange(value: string) {
    if (!ship.unlocked) return;
    let cleaned = value;
    if (cleaned.length > 4) cleaned = cleaned.slice(0, 4);
    setTechPoints(cleaned);
    const num = Number(cleaned.replace(".", ""));
    if (!isNaN(num)) onTp(num);
  }

  function updateTp() {
    if (!tpInputRef.current) return;
    const num = Number(tpInputRef.current.value.replace(".", ""));
    const clean = isNaN(num) ? 0 : num;
    setTechPoints(String(clean));
    onTp(clean);
  }

  function handleEnter(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    tpInputRef.current?.blur();
    updateTp();
  }

  function unlock() {
    if (!owner) return;
    ship.unlocked = true;
    if (isSuperCap) {
      (ship as BlueprintSuperCapitalShip).modules.forEach((mod) => {
        (mod as BlueprintModule).unlocked = Boolean(mod.default);
      });
    }
    onChange();
  }

  function remove() {
    if (!owner) return;
    ship.unlocked = false;
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

  function toggleMod(mod: BlueprintModule, override?: boolean) {
    if (!owner) return;
    mod.unlocked = override ?? !mod.unlocked;
    onChange();
  }

  const tpNum = Number(techPoints) || 0;
  const switchStyle = {
    boxShadow: "var(--handleoffsetcalculator) 0 0 4px var(--bg-color) inset, 0 0 0 4px var(--bg-color) inset, var(--switchhandleborder)",
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl p-4 transition duration-500 ${
        isGolden
          ? `border-yellow-100 bg-yellow-100/75 dark:border-yellow-700 dark:bg-yellow-900${ship.unlocked ? " overflow-hidden hover:bg-yellow-200/75 dark:hover:bg-yellow-800" : ""}`
          : `border-neutral-300 bg-neutral-100/75 dark:border-neutral-700 dark:bg-neutral-900${ship.unlocked ? " overflow-hidden hover:bg-neutral-200/75 dark:hover:bg-neutral-800" : ""}`
      } ${
        !isListLayout
          ? "w-[90vw] flex-col sm:w-72"
          : "h-auto w-[90vw] flex-col gap-2 sm:w-72 lg:h-36 lg:w-[35rem] lg:flex-row xl:w-[45rem]"
      }`}
    >
      {!ship.unlocked && (
        <button
          className={`overlay group absolute left-1/2 top-1/2 z-[1] h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/50 transition duration-200 hover:bg-black/60 dark:border dark:border-neutral-600 ${!owner ? "cursor-auto" : ""}`}
          type="button"
          onClick={unlock}
        >
          <div className={`message flex w-full items-center justify-center gap-3 transition group-hover:brightness-110 ${!isListLayout ? "flex-col" : "flex-col lg:flex-row"}`}>
            <p className="font-medium text-white">{owner ? "Click to mark as unlocked" : "Not unlocked"}</p>
            <img className="size-12 select-none" src="/ui/lock.svg" aria-hidden="true" />
          </div>
        </button>
      )}

      <div className={`flex flex-col items-center justify-center ${isListLayout ? "w-auto lg:w-96" : ""}`}>
        <h4 className="text-xl font-bold transition duration-500">{ship.name}</h4>
        {variants ? (
          <p className="text-sm transition duration-500">
            {ship.variantName}{ship.hasVariants && <span className="text-sm transition duration-500"> ({ship.variant})</span>}
          </p>
        ) : !variants && ship.hasVariants ? (
          <p className="text-sm transition duration-500">{ship.variant}</p>
        ) : null}
      </div>

      <img className="my-2 h-20 xl:h-32" src={ship.img} alt={ship.name} loading="lazy" />

      {owner ? (
        <div className={`flex w-full flex-col gap-2 transition duration-500 ${!ship.unlocked ? "pointer-events-none opacity-50 brightness-50" : ""}`}>
          <div className="flex w-full items-center justify-center gap-2">
            <div className="fo-input-group max-w-sm bg-body transition duration-500">
              <label className="fo-input-group-text" htmlFor={`techPoints${ship.name}${ship.variant}`}>TP</label>
              <div className="relative grow">
                <input
                  id={`techPoints${ship.name}${ship.variant}`}
                  ref={tpInputRef}
                  value={techPoints}
                  onChange={(e) => handleTpChange(e.target.value)}
                  onBlur={updateTp}
                  onKeyDown={handleEnter}
                  type="text"
                  className="peer fo-input grow border-neutral-300 text-left text-black opacity-0 hover:border-neutral-400 focus:opacity-100 dark:border-neutral-700 dark:text-white dark:hover:border-neutral-600"
                  placeholder="Tech Points"
                />
                <div className="pointer-events-none absolute left-0 top-0 flex h-full w-full items-center justify-center overflow-hidden peer-focus:invisible">
                  <p className="w-full px-3 text-left text-black transition duration-500 dark:text-white">{formatTp(tpNum)}</p>
                </div>
              </div>
            </div>
            <button
              className="fo-btn grow border-red-300 bg-red-300 text-black transition duration-500 hover:border-red-500 hover:bg-red-500 dark:border-red-600 dark:bg-red-600 dark:text-white dark:hover:border-red-700 dark:hover:bg-red-700"
              type="button"
              onClick={remove}
            >
              Remove
            </button>
          </div>

          {!variants && showVariantUnique && (
            <div className="flex w-full items-center justify-center gap-2">
              {allVariants.slice(1).map((variant) => (
                <button
                  key={variant.variant}
                  className={`fo-btn relative w-1/4 grow overflow-hidden border-red-300 bg-red-300 text-black transition duration-500 dark:border-red-600 dark:bg-red-600 dark:text-white ${variant.unlocked ? "hover:border-red-500 hover:bg-red-500 dark:hover:border-red-700 dark:hover:bg-red-700" : ""}`}
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

          {variants && ship.hasVariants && (
            <div className="flex items-center gap-2">
              <input
                id={ship.name + ship.variant}
                type="checkbox"
                className="fo-switch fo-switch-primary fo-switch-outline border-neutral-200 bg-neutral-900 transition duration-500 hover:border-neutral-400 hover:duration-200 dark:border-neutral-700 dark:bg-neutral-100 dark:hover:border-neutral-600"
                checked={mirror}
                onChange={onMirror}
                style={switchStyle}
              />
              <label className="text-left transition duration-500" htmlFor={ship.name + ship.variant}>Match TP with variants</label>
            </div>
          )}

          {isSuperCap && (
            exposeModules ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(ship as BlueprintSuperCapitalShip).modules.map((mod) => (
                  <div key={mod.system} className="relative w-[45%] grow" onClick={() => toggleMod(mod as BlueprintModule)}>
                    <button
                      className="fo-btn w-full border-blue-300 bg-blue-300 text-black transition duration-500 hover:border-blue-400 hover:bg-blue-400 dark:border-blue-600 dark:bg-blue-600 dark:text-white dark:hover:border-blue-700 dark:hover:bg-blue-700"
                      type="button"
                    >
                      {mod.system}
                    </button>
                    {!(mod as BlueprintModule).unlocked && (
                      <button
                        className={`overlay group absolute left-1/2 top-1/2 z-[1] flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-start rounded-lg bg-black/50 transition duration-200 hover:bg-black/60 dark:border dark:border-neutral-600 ${!owner ? "cursor-auto" : ""}`}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleMod(mod as BlueprintModule, true); }}
                      >
                        <img className="message size-8 select-none transition group-hover:brightness-110" src="/ui/lock.svg" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <button
                className="fo-btn grow border-blue-300 bg-blue-300 text-black transition duration-500 hover:border-blue-400 hover:bg-blue-400 dark:border-blue-600 dark:bg-blue-600 dark:text-white dark:hover:border-blue-700 dark:hover:bg-blue-700"
                type="button"
                onClick={() => onModules(ship as BlueprintSuperCapitalShip)}
              >
                Edit Modules ({(ship as BlueprintSuperCapitalShip).modules.filter((m) => (m as BlueprintModule).unlocked).length}/{(ship as BlueprintSuperCapitalShip).modules.length})
              </button>
            )
          )}
        </div>
      ) : (
        <div className={`flex w-full flex-col gap-2 transition duration-500 ${!ship.unlocked ? "pointer-events-none opacity-50 brightness-50" : ""}`}>
          <p className="px-3 text-xl font-semibold text-black dark:text-white">{formatTp(tpNum)}</p>

          {!variants && showVariantUnique && (
            <div className="flex w-full items-center justify-center gap-2">
              {allVariants.slice(1).map((variant) => (
                <div
                  key={variant.variant}
                  className="fo-btn relative w-1/4 grow overflow-hidden border-green-300 bg-green-300 text-black transition duration-500 hover:border-green-300 hover:bg-green-300 dark:border-green-600 dark:bg-green-600 dark:text-white dark:hover:border-green-600 dark:hover:bg-green-600"
                >
                  {!variant.unlocked && (
                    <div className="overlay group absolute left-1/2 top-1/2 z-[1] flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-start bg-black/50 transition duration-200 hover:bg-black/60 dark:border dark:border-neutral-600 cursor-auto">
                      <img className="message size-8 select-none transition group-hover:brightness-110" src="/ui/lock.svg" aria-hidden="true" />
                    </div>
                  )}
                  {variant.variant}
                </div>
              ))}
            </div>
          )}

          {isSuperCap && (
            <button
              className="fo-btn grow border-blue-300 bg-blue-300 text-black transition duration-500 hover:border-blue-400 hover:bg-blue-400 dark:border-blue-600 dark:bg-blue-600 dark:text-white dark:hover:border-blue-700 dark:hover:bg-blue-700"
              type="button"
              onClick={() => onModules(ship as BlueprintSuperCapitalShip)}
            >
              View Modules ({(ship as BlueprintSuperCapitalShip).modules.filter((m) => (m as BlueprintModule).unlocked).length}/{(ship as BlueprintSuperCapitalShip).modules.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
