"use client";

import { useState, useEffect } from "react";
import type { BlueprintAllShip } from "@/utils/blueprints";

interface Props {
  ship: BlueprintAllShip;
  userFragments: { fragmentId: number; quantityOwned: number }[];
  onUpdate: (fragments: { fragmentId: number; quantityOwned: number }[]) => void;
  onDone: () => void;
  onChange: () => void;
}

interface FragmentDefinition {
  id: number;
  name: string;
}

export default function BlueprintsFragments({ ship, userFragments, onUpdate, onDone, onChange }: Props) {
  const [fragmentDefs, setFragmentDefs] = useState<FragmentDefinition[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/fragments");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setFragmentDefs(json.data);
          }
        }
      } catch (error) {
        console.error("Failed to load fragments", error);
      }
    }
    void load();
  }, []);

  const requiredFrags = ship.fragments ?? [];

  function handleQuantityChange(fragId: number, qty: number) {
    const existing = userFragments.find((f) => f.fragmentId === fragId);
    let next: { fragmentId: number; quantityOwned: number }[];
    if (existing) {
      next = userFragments.map((f) => f.fragmentId === fragId ? { ...f, quantityOwned: qty } : f);
    } else {
      next = [...userFragments, { fragmentId: fragId, quantityOwned: qty }];
    }
    onUpdate(next);
    onChange();
  }

  return (
    <div
      id="menu"
      className="flex max-h-full w-11/12 flex-col items-center justify-start overflow-y-auto rounded-3xl bg-body p-6 xl:w-2/5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex w-full items-center justify-between border-b border-neutral-300 pb-4 dark:border-neutral-700">
        <h2 className="text-xl font-bold">{ship.name} Fragments</h2>
        <button
          className="fo-btn size-10 rounded-full border-neutral-300 bg-neutral-100 p-0 transition duration-500 hover:bg-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-500"
          type="button"
          onClick={onDone}
        >
          <img className="size-6 transition duration-500 dark:invert" src="/ui/x.svg" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex w-full flex-col gap-4">
        {requiredFrags.map((req) => {
          const def = fragmentDefs.find((d) => d.id === req.fragmentId);
          const owned = userFragments.find((f) => f.fragmentId === req.fragmentId)?.quantityOwned ?? 0;
          return (
            <div key={req.fragmentId} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex flex-col">
                <span className="font-bold">{def?.name ?? `Fragment ${req.fragmentId}`}</span>
                <span className="text-sm text-neutral-500">Required: {req.quantityRequired}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Owned:</label>
                <input
                  type="number"
                  min={0}
                  className="fo-input w-24 rounded-lg border-neutral-300 text-center text-black dark:border-neutral-600 dark:text-white"
                  value={owned}
                  onChange={(e) => handleQuantityChange(req.fragmentId, Number(e.target.value))}
                />
              </div>
            </div>
          );
        })}
        {requiredFrags.length === 0 && (
          <p className="text-center text-neutral-500">This ship does not require any fragments.</p>
        )}
      </div>

      <button
        className="du-btn mt-6 w-full rounded-full border-blue-300 bg-blue-100 py-3 font-bold transition duration-500 hover:scale-[1.02] hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        type="button"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}
