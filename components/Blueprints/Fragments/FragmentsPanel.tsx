"use client";

import type { BlueprintAllShip } from "@/utils/blueprints";

interface UserFragment {
  fragmentId: number;
  quantityOwned: number;
}

interface Props {
  ship: BlueprintAllShip;
  /** id → display name, from the public /api/fragments dictionary. */
  fragmentNames: Map<number, string>;
  /** Account-level fragment inventory (fragments are a shared currency). */
  userFragments: UserFragment[];
  onSetOwned: (fragmentId: number, qty: number) => void;
  /** Consume the required fragments and mark the blueprint owned. */
  onUnlock: () => void;
}

/**
 * Body of the fragment-tracking drawer: a grid of fragment mini-cards plus the
 * Unlock Blueprint action. Rendered inside a {@link SlideOver} on both the
 * Blueprint Fragments page and the Blueprint Tracker.
 */
export default function FragmentsPanel({ ship, fragmentNames, userFragments, onSetOwned, onUnlock }: Props) {
  const nameOf = (id: number) => fragmentNames.get(id) ?? `Fragment ${id}`;

  // Order alphabetically then ordinally ("Data 2" before "Data 10").
  const required = [...(ship.fragments ?? [])].sort((a, b) =>
    nameOf(a.fragmentId).localeCompare(nameOf(b.fragmentId), undefined, { numeric: true, sensitivity: "base" }),
  );

  const ownedOf = (id: number) => userFragments.find((f) => f.fragmentId === id)?.quantityOwned ?? 0;
  const completed = required.filter((r) => ownedOf(r.fragmentId) >= r.quantityRequired).length;
  const allSatisfied = required.length > 0 && completed === required.length;

  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm text-neutral-500 transition duration-500 dark:text-neutral-400">
        {completed}/{required.length} fragments collected
      </span>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {required.map((req) => {
          const owned = ownedOf(req.fragmentId);
          const done = owned >= req.quantityRequired;
          return (
            <div
              key={req.fragmentId}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition duration-500 ${
                done
                  ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/40"
                  : "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"
              }`}
            >
              <span className="line-clamp-2 text-sm font-semibold transition duration-500" title={nameOf(req.fragmentId)}>
                {nameOf(req.fragmentId)}
              </span>
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={owned}
                  onChange={(e) => onSetOwned(req.fragmentId, Math.max(0, Number(e.target.value) || 0))}
                  className="input h-8 w-16 rounded-lg border-neutral-300 text-center text-black dark:border-neutral-600 dark:text-white"
                  aria-label={`${nameOf(req.fragmentId)} owned`}
                />
                <span className="text-sm text-neutral-500 transition duration-500">/ {req.quantityRequired}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        {ship.unlocked ? (
          <span className="text-sm font-medium text-green-700 transition duration-500 dark:text-green-300">Blueprint owned</span>
        ) : (
          <button
            type="button"
            disabled={!allSatisfied}
            onClick={onUnlock}
            className="btn rounded-full border-blue-300 bg-blue-100 px-6 font-semibold text-black transition duration-500 hover:scale-105 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:brightness-75 disabled:hover:scale-100 dark:border-blue-500 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
            title={allSatisfied ? "Consume the required fragments and unlock" : "Collect all required fragments first"}
          >
            Unlock Blueprint
          </button>
        )}
      </div>
    </div>
  );
}
