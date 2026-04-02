"use client";

import { useState, useEffect } from "react";
import type { ShipSorter } from "@/utils/blueprints";

interface Props {
  close: boolean;
  onSort: (sorter: ShipSorter | undefined) => void;
}

const enCollator = new Intl.Collator(undefined, { sensitivity: "base" });
const sorters: Record<string, ShipSorter> = {
  "a-z": (a, b) => enCollator.compare(a.name, b.name),
  "z-a": (a, b) => enCollator.compare(b.name, a.name),
  "most TP": (a, b) => (a.unlocked ? 0 : 1) - (b.unlocked ? 0 : 1) || b.techPoints - a.techPoints,
  "least TP": (a, b) => (a.unlocked ? 0 : 1) - (b.unlocked ? 0 : 1) || a.techPoints - b.techPoints,
};

export default function BlueprintsSort({ close, onSort }: Props) {
  const [showSorters, setShowSorters] = useState(false);
  const [currentSorter, setCurrentSorter] = useState("a-z");

  useEffect(() => {
    if (close) setShowSorters(false);
  }, [close]);

  useEffect(() => {
    onSort(sorters[currentSorter]);
  }, [currentSorter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onSort(sorters[currentSorter]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative flex flex-col items-start justify-start rounded-xl">
      <button
        className={`flex h-9 w-9 select-none items-center justify-center rounded-full border bg-white p-0 transition duration-500 lg:w-32 lg:justify-start lg:p-2 lg:px-4 dark:bg-neutral-800 ${
          showSorters
            ? "border-2 border-[#794dff] shadow-sm shadow-[#794dff38] ring-0 ring-[#794dff]"
            : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-700"
        }`}
        type="button"
        onClick={() => setShowSorters(!showSorters)}
      >
        <img className="size-5 transition duration-500 dark:invert" src="/ui/sort.svg" aria-hidden="true" />
        <p className="hidden grow transition duration-500 lg:block">Sort</p>
      </button>

      {showSorters && (
        <div className="absolute top-10 z-[2] flex w-44 flex-col items-start justify-center gap-1 rounded-xl border-2 border-neutral-200 bg-white p-3 shadow-md transition duration-500 dark:border-neutral-700 dark:bg-neutral-800">
          {Object.keys(sorters).map((key) => (
            <button key={key} className="du-label flex w-full cursor-pointer items-center justify-start gap-2" type="button" onClick={() => setCurrentSorter(key)}>
              <input
                type="checkbox"
                className="du-checkbox pointer-events-none"
                style={{ backgroundSize: "cover", backgroundColor: currentSorter === key ? "inherit" : "" }}
                checked={currentSorter === key}
                readOnly
              />
              <span className="text-left capitalize transition duration-500">{key}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
