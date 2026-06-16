"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import BlueprintsToolbar from "@/components/Blueprints/BlueprintsToolbar";
import BlueprintsCategory from "@/components/Blueprints/BlueprintsCategory";
import { useUserStore } from "@/stores/userStore";
import { useBlueprintStore, type BlueprintAccountDTO } from "@/stores/blueprintStore";
import { useAccountStore } from "@/stores/accountStore";
import { formatDate } from "@/utils/functions";
import type { BlueprintAllShip, ShipFilter, ShipSorter } from "@/utils/blueprints";
import { buildView, viewToShipEntries } from "@/utils/blueprints";

interface UserFragment {
  fragmentId: number;
  quantityOwned: number;
}

// Heaviest-to-lightest display order, also used for the left class-icon rail
// (Fighter kept ahead of Corvette so aircraft don't sort to the very bottom).
const displayOrder = ["Battleship", "Carrier", "Auxiliary Ship", "Battlecruiser", "Cruiser", "Destroyer", "Frigate", "Fighter", "Corvette"] as const;

export default function BlueprintTrackerPage() {
  const searchParams = useSearchParams();

  const authChecked = useUserStore((s) => s.authChecked);
  const shipData = useUserStore((s) => s.shipData);

  const accounts = useBlueprintStore((s) => s.accounts);
  const saveAccount = useBlueprintStore((s) => s.saveAccount);
  const createDraftAccount = useBlueprintStore((s) => s.createDraftAccount);

  // The active account is a global selection (see the navbar switcher).
  const accountIndex = useAccountStore((s) => s.activeIndex);
  const setActiveIndex = useAccountStore((s) => s.setActiveIndex);

  // Honor a legacy ?a= deep link once on mount by adopting it as the active account.
  useEffect(() => {
    const aParam = searchParams.get("a");
    if (aParam !== null) {
      const idx = Number(aParam);
      if (Number.isFinite(idx)) setActiveIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Currently-edited account, kept independent of the store so unsaved changes
  // don't bleed into other tabs/components reading the store directly.
  const [draftAccount, setDraftAccount] = useState<BlueprintAccountDTO | undefined>();
  const [data, setData] = useState<BlueprintAllShip[]>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [userFragments, setUserFragments] = useState<UserFragment[]>([]);
  const [fragmentNames, setFragmentNames] = useState<Map<number, string>>(new Map());

  // Layout / view options
  const [isListLayout, setIsListLayout] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Search / sort / filter
  const [currentFilters, setCurrentFilters] = useState<ShipFilter>();
  const [currentSorter, setCurrentSorter] = useState<ShipSorter>();
  const [currentSearch, setCurrentSearch] = useState("");
  const [closeToolbar, setCloseToolbar] = useState(false);
  const [displayedData, setDisplayedData] = useState<BlueprintAllShip[]>();

  // Restore layout prefs from localStorage
  useEffect(() => {
    setIsListLayout(localStorage.getItem("layout") === "list");
    setShowVariants(localStorage.getItem("variants") === "true");
  }, []);

  useEffect(() => { localStorage.setItem("layout", isListLayout ? "list" : "grid"); }, [isListLayout]);
  useEffect(() => { localStorage.setItem("variants", String(showVariants)); }, [showVariants]);

  // Public fragment dictionary for names (admin endpoint 403s for normal users).
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/fragments");
        const { success, data: defs } = await res.json();
        if (success && Array.isArray(defs)) {
          setFragmentNames(new Map(defs.map((d: { id: number; name: string }) => [d.id, d.name])));
        }
      } catch (e) {
        console.error("Failed to load fragment names", e);
      }
    }
    void load();
  }, []);

  // Recompute displayedData when data/filters/sorter/search change
  useEffect(() => {
    if (!currentFilters || !currentSorter || !data) return;
    const filtered = data
      .filter(currentFilters)
      .filter((ship) =>
        ship.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
        ship.variantName.toLowerCase().includes(currentSearch.toLowerCase())
      )
      .sort(currentSorter);
    setDisplayedData(filtered);
  }, [data, currentFilters, currentSorter, currentSearch]);

  useEffect(() => {
    if (!closeToolbar) return;
    const t = setTimeout(() => setCloseToolbar(false), 0);
    return () => clearTimeout(t);
  }, [closeToolbar]);

  // Project the active account into the editable view.
  useEffect(() => {
    if (!shipData || !authChecked) return;

    // No saved account yet → seed an empty draft so the tracker is usable.
    if (accounts.length === 0) {
      const draft = createDraftAccount();
      setDraftAccount(draft);
      setData(buildView(shipData, draft));
      setUserFragments([]);
      setHasUnsavedChanges(false);
      return;
    }

    const target = accounts.find((a) => a.accountIndex === accountIndex) ?? accounts[0];
    if (target.accountIndex !== accountIndex) {
      setActiveIndex(target.accountIndex);
      return;
    }
    setDraftAccount(target);
    setData(buildView(shipData, target));
    setUserFragments([...(target.userFragments ?? [])]);
    setHasUnsavedChanges(false);
  }, [accounts, accountIndex, shipData, authChecked]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = true; // Sharing has been removed; you only see your own blueprints.

  const setFragOwned = useCallback((fragmentId: number, qty: number) => {
    setUserFragments((prev) => {
      const idx = prev.findIndex((f) => f.fragmentId === fragmentId);
      if (idx !== -1) return prev.map((f) => (f.fragmentId === fragmentId ? { ...f, quantityOwned: qty } : f));
      return [...prev, { fragmentId, quantityOwned: qty }];
    });
    setHasUnsavedChanges(true);
  }, []);

  const unlockFragment = useCallback((ship: BlueprintAllShip) => {
    const reqs = ship.fragments ?? [];
    setUserFragments((prev) =>
      prev.map((f) => {
        const req = reqs.find((r) => r.fragmentId === f.fragmentId);
        return req ? { ...f, quantityOwned: Math.max(0, f.quantityOwned - req.quantityRequired) } : f;
      }),
    );
    ship.unlocked = true;
    setData((prev) => (prev ? [...prev] : prev));
    setHasUnsavedChanges(true);
  }, []);

  const onSave = useCallback(async () => {
    if (!draftAccount || !data) return false;
    // Spread draftAccount to preserve unassignedTp (no longer edited here) and
    // persist ship unlock/module state plus the fragment inventory.
    const account: BlueprintAccountDTO = {
      ...draftAccount,
      ships: viewToShipEntries(data),
      userFragments,
    };
    const saved = await saveAccount(account);
    if (saved) {
      setDraftAccount(saved);
      setHasUnsavedChanges(false);
      return true;
    }
    return false;
  }, [draftAccount, data, userFragments, saveAccount]);

  const lastSavedDisplay = draftAccount?.lastSaved && draftAccount.lastSaved !== ""
    ? formatDate(draftAccount.lastSaved, "full", true)
    : undefined;

  return (
    <div
      className="flex min-h-[calc(100dvh-8rem)] w-full flex-col items-center p-4 sm:p-8"
      onClick={() => setCloseToolbar(true)}
    >
      <div className="w-full max-w-[80rem]">
        <BlueprintsToolbar
          closeToolbar={closeToolbar}
          data={data}
          hasUnsavedChanges={hasUnsavedChanges}
          onList={() => setIsListLayout((v) => !v)}
          onVariants={() => setShowVariants((v) => !v)}
          onSort={(sorter) => setCurrentSorter(() => sorter)}
          onFilter={(filter) => setCurrentFilters(() => filter)}
          onSearch={(term) => setCurrentSearch(term)}
          onSave={onSave}
        />

        {lastSavedDisplay && (
          <p className="mb-2 text-sm transition duration-500">Last updated: {lastSavedDisplay}</p>
        )}

        <div className="flex gap-4">
          {/* Ship-class rail */}
          <div className="sticky top-36 flex h-fit shrink-0 flex-col gap-1 rounded-2xl bg-neutral-100/40 p-2 transition duration-500 dark:bg-neutral-900">
            {displayOrder.map((t) => (
              <button
                key={t}
                type="button"
                title={t}
                onClick={(e) => { e.stopPropagation(); setTypeFilter((cur) => (cur === t ? null : t)); }}
                className={`flex items-center justify-center rounded-lg p-2 transition duration-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 ${typeFilter === t ? "bg-neutral-800 dark:bg-neutral-200" : ""}`}
              >
                <img className={`size-7 select-none transition duration-500 ${typeFilter === t ? "invert dark:invert-0" : "dark:invert"}`} src={`/ships/classes/${t.toLowerCase()}.svg`} alt={t} />
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="min-w-0 grow">
            {displayedData ? (
              displayOrder
                .filter((t) => !typeFilter || t === typeFilter)
                .map((type) => (
                  <BlueprintsCategory
                    key={type}
                    shipType={type}
                    isOwner={isOwner}
                    currentLayout={isListLayout ? "list" : "grid"}
                    showVariants={showVariants}
                    data={data}
                    displayedData={displayedData}
                    onDataChange={() => setData((prev) => (prev ? [...prev] : prev))}
                    onMarkUnsaved={() => setHasUnsavedChanges(true)}
                    fragmentNames={fragmentNames}
                    userFragments={userFragments}
                    onSetOwned={setFragOwned}
                    onUnlockFragment={unlockFragment}
                  />
                ))
            ) : (
              <div className="flex w-full flex-wrap items-stretch justify-start gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton skeleton-animated h-56 w-72 rounded-2xl bg-neutral-100 p-6 transition duration-500 dark:bg-neutral-900" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
