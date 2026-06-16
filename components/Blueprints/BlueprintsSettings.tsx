"use client";

import { useState, useEffect } from "react";
import type { BlueprintAllShip } from "@/utils/blueprints";

interface Props {
  close: boolean;
  data: BlueprintAllShip[] | undefined;
  hasUnsavedChanges: boolean;
  onList: () => void;
  onVariants: () => void;
}

export default function BlueprintsSettings({
  close,
  onList,
  onVariants,
}: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [listOn, setListOn] = useState(false);
  const [variantsOff, setVariantsOff] = useState(false);

  useEffect(() => {
    setListOn(localStorage.getItem("layout") === "list");
    setVariantsOff(localStorage.getItem("variants") !== "true");
  }, []);

  useEffect(() => {
    if (close) setShowSettings(false);
  }, [close]);

  const switchStyle = {
    boxShadow: "var(--handleoffsetcalculator) 0 0 4px var(--bg-color) inset, 0 0 0 4px var(--bg-color) inset, var(--switchhandleborder)",
  };

  return (
    <div className="relative flex flex-col items-start justify-start rounded-xl">
      <button
        className={`flex h-9 w-9 select-none items-center justify-center rounded-full border bg-white p-0 transition duration-500 lg:w-32 lg:justify-start lg:p-2 lg:px-4 dark:bg-neutral-800 ${
          showSettings
            ? "border-2 border-[#794dff] shadow-sm shadow-[#794dff38] ring-0 ring-[#794dff]"
            : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-700"
        }`}
        type="button"
        onClick={() => setShowSettings(!showSettings)}
      >
        <img className="size-5 transition duration-500 dark:invert" src="/ui/settings.svg" aria-hidden="true" />
        <p className="hidden grow transition duration-500 lg:block">Options</p>
      </button>

      {showSettings && (
        <div className="absolute top-10 z-[2] flex w-72 flex-col items-start justify-center gap-3 rounded-xl border-2 border-neutral-200 bg-white p-3 shadow-md transition duration-500 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex w-full items-center justify-center gap-2">
            <label className="transition duration-500" htmlFor="layoutType">Grid View</label>
            <input
              id="layoutType"
              type="checkbox"
              className="switch switch-primary switch-outline border-neutral-200 bg-neutral-900 transition duration-500 hover:border-neutral-400 hover:duration-200 dark:border-neutral-700 dark:bg-neutral-100 dark:hover:border-neutral-600"
              checked={listOn}
              style={switchStyle}
              onChange={() => { setListOn((v) => !v); onList(); }}
            />
            <label className="transition duration-500" htmlFor="layoutType">List View</label>
          </div>

          <div className="flex w-full items-center justify-center gap-2">
            <label className="transition duration-500" htmlFor="variantsType">Show Variants</label>
            <input
              id="variantsType"
              type="checkbox"
              className="switch switch-primary switch-outline border-neutral-200 bg-neutral-900 transition duration-500 hover:border-neutral-400 hover:duration-200 dark:border-neutral-700 dark:bg-neutral-100 dark:hover:border-neutral-600"
              checked={variantsOff}
              style={switchStyle}
              onChange={() => { setVariantsOff((v) => !v); onVariants(); }}
            />
            <label className="transition duration-500" htmlFor="variantsType">Hide Variants</label>
          </div>
        </div>
      )}
    </div>
  );
}
