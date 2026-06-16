"use client";

import { useState, useEffect } from "react";
import BlueprintsSettings from "./BlueprintsSettings";
import BlueprintsSort from "./BlueprintsSort";
import BlueprintsFilter from "./BlueprintsFilter";
import type { ShipSorter, ShipFilter, BlueprintAllShip } from "@/utils/blueprints";

interface Props {
  closeToolbar: boolean;
  data: BlueprintAllShip[] | undefined;
  hasUnsavedChanges: boolean;
  onList: () => void;
  onVariants: () => void;
  onSort: (sorter: ShipSorter | undefined) => void;
  onFilter: (filter: ShipFilter) => void;
  onSearch: (term: string) => void;
  onSave: () => Promise<boolean>;
}

/**
 * Blueprint Tracker top bar, styled after the Blueprint Library: a long search
 * field spanning the row with Options / Sort / Filter / Save grouped to its
 * right.
 */
export default function BlueprintsToolbar({
  closeToolbar,
  data,
  hasUnsavedChanges,
  onList,
  onVariants,
  onSort,
  onFilter,
  onSearch,
  onSave,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState("");

  const [closeSettings, setCloseSettings] = useState(false);
  const [closeFilters, setCloseFilters] = useState(false);
  const [closeSorters, setCloseSorters] = useState(false);

  function closeOptions(settings = true, filters = true, sorters = true) {
    if (settings) { setCloseSettings(true); setTimeout(() => setCloseSettings(false), 0); }
    if (filters)  { setCloseFilters(true);  setTimeout(() => setCloseFilters(false), 0); }
    if (sorters)  { setCloseSorters(true);  setTimeout(() => setCloseSorters(false), 0); }
  }

  useEffect(() => {
    if (closeToolbar) closeOptions();
  }, [closeToolbar]);

  // Block accidental tab close while there are unsaved edits.
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); }
    if (hasUnsavedChanges) window.addEventListener("beforeunload", warn);
    else window.removeEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  function handleSearch(value: string) {
    setSearch(value);
    onSearch(value);
  }

  async function onClickSave() {
    if (!hasUnsavedChanges) return;
    setLoading(true);
    const ok = await onSave();
    setLoading(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1000);
    }
  }

  return (
    <div className="sticky top-20 z-[2] mb-4 flex flex-wrap items-center gap-2 rounded-full bg-body px-2 py-2 transition duration-500">
      {/* Long search field */}
      <div className="flex min-w-[12rem] grow items-center gap-2 rounded-full bg-neutral-100/60 px-4 py-2 transition duration-500 dark:bg-neutral-800">
        <img className="size-5 shrink-0 select-none transition duration-500 dark:invert" src="/ui/search.svg" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search ships…"
          className="w-full bg-transparent text-left text-black outline-none transition duration-500 dark:text-white"
        />
        {search && (
          <button type="button" onClick={() => handleSearch("")}>
            <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/close.svg" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Controls, grouped on the right */}
      <div onClick={(e) => e.stopPropagation()}>
        <BlueprintsSettings close={closeSettings} data={data} hasUnsavedChanges={hasUnsavedChanges} onList={onList} onVariants={onVariants} />
      </div>
      <div onClick={(e) => { e.stopPropagation(); closeOptions(true, true, false); }}>
        <BlueprintsSort close={closeSorters} onSort={onSort} />
      </div>
      <div onClick={(e) => { e.stopPropagation(); closeOptions(true, false, true); }}>
        <BlueprintsFilter close={closeFilters} onFilter={onFilter} />
      </div>

      <button
        type="button"
        className={`btn flex h-9 min-h-9 items-center justify-center gap-2 rounded-full border-blue-300 bg-blue-100 px-4 py-2 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700 ${!hasUnsavedChanges ? "pointer-events-none opacity-50 brightness-50" : ""}`}
        onClick={() => void onClickSave()}
        title={hasUnsavedChanges ? "Save changes" : "No unsaved changes"}
      >
        <span className="hidden transition duration-500 sm:inline-flex">{success ? "Saved!" : loading ? "Saving" : "Save"}</span>
        {!loading ? (
          <img className="size-5 transition duration-500 dark:invert" src="/ui/save.svg" aria-hidden="true" />
        ) : (
          <span className="loading loading-spinner loading-sm" />
        )}
      </button>
    </div>
  );
}
