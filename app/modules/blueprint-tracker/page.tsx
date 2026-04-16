"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BlueprintsToolbar from "@/components/Blueprints/BlueprintsToolbar";
import BlueprintsCategory from "@/components/Blueprints/BlueprintsCategory";
import BlueprintsModules from "@/components/Blueprints/BlueprintsModules";
import BlueprintsFragments from "@/components/Blueprints/BlueprintsFragments";
import { useUserStore } from "@/stores/userStore";
import { useBlueprintStore, type BlueprintAccountDTO, type BlueprintShipEntry } from "@/stores/blueprintStore";
import { formatDate } from "@/utils/functions";
import type { AllShip, AllModule } from "@/utils/ships";
import type {
  BlueprintAllShip,
  BlueprintSuperCapitalShip,
  BlueprintUnknownModule,
  BlueprintWeaponModule,
  BlueprintPropulsionModule,
  BlueprintMiscModule,
  ShipFilter,
  ShipSorter,
} from "@/utils/blueprints";

// `shipTypes` is the *ascending* canonical ordering used elsewhere — most
// notably as the column ordering for `unassignedTp` (slot 0 = Fighter, slot 8 =
// Battleship). It is part of the persisted data layout for blueprint accounts,
// so changing it would silently corrupt existing rows. The list is private to
// this file and only the display ordering below should ever be reordered.
const shipTypes = ["Fighter", "Corvette", "Frigate", "Destroyer", "Cruiser", "Battlecruiser", "Auxiliary Ship", "Carrier", "Battleship"] as const;

// Display order is the user-facing top-to-bottom rendering on the page. The
// only thing this needs to do differently from a plain `reverse()` of the line
// above is put Fighter before Corvette, so the descending heaviest-to-lightest
// pattern doesn't get broken at the bottom of the list by aircraft sorting
// after corvettes.
const displayOrder = ["Battleship", "Carrier", "Auxiliary Ship", "Battlecruiser", "Cruiser", "Destroyer", "Frigate", "Fighter", "Corvette"] as const;

type AnyBlueprintModule = BlueprintUnknownModule | BlueprintWeaponModule | BlueprintPropulsionModule | BlueprintMiscModule;

/** Build the editable BlueprintAllShip[] view from a saved account joined with the catalogue. */
function buildView(ships: AllShip[], account: BlueprintAccountDTO | undefined): BlueprintAllShip[] {
  const shipMap = new Map(account?.ships.map((s) => [s.shipId, s]) ?? []);
  return ships.map((ship): BlueprintAllShip => {
    const owned = shipMap.get(ship.id);
    const moduleMap = new Map(owned?.modules.map((m) => [m.moduleId, m.unlocked]) ?? []);

    if ("modules" in ship) {
      return {
        ...ship,
        unlocked: owned?.unlocked ?? false,
        techPoints: owned?.techPoints ?? 0,
        mirrorTechPoints: owned?.mirrorTechPoints ?? ship.hasVariants,
        modules: ship.modules.map((mod: AllModule) => ({
          ...mod,
          unlocked: moduleMap.has(mod.id) ? moduleMap.get(mod.id)! : Boolean(mod.default),
        })),
      } as BlueprintSuperCapitalShip;
    }

    return {
      ...ship,
      unlocked: owned?.unlocked ?? false,
      techPoints: owned?.techPoints ?? 0,
      mirrorTechPoints: owned?.mirrorTechPoints ?? ship.hasVariants,
    } as BlueprintAllShip;
  });
}

/** Inverse of buildView — turns the editable view back into the persistence DTO. */
function viewToShipEntries(view: BlueprintAllShip[]): BlueprintShipEntry[] {
  return view
    .filter((s) => s.unlocked || s.techPoints > 0 || ("modules" in s && s.modules.some((m) => (m as AnyBlueprintModule).unlocked && !m.default)))
    .map((s): BlueprintShipEntry => ({
      shipId: s.id,
      unlocked: s.unlocked,
      techPoints: s.techPoints,
      mirrorTechPoints: s.mirrorTechPoints,
      modules: "modules" in s
        ? s.modules.map((m) => ({ moduleId: m.id, unlocked: (m as AnyBlueprintModule).unlocked }))
        : [],
    }));
}

export default function BlueprintTrackerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const user = useUserStore((s) => s.user);
  const authChecked = useUserStore((s) => s.authChecked);
  const shipData = useUserStore((s) => s.shipData);

  const accounts = useBlueprintStore((s) => s.accounts);
  const saveAccount = useBlueprintStore((s) => s.saveAccount);
  const deleteAccount = useBlueprintStore((s) => s.deleteAccount);
  const createDraftAccount = useBlueprintStore((s) => s.createDraftAccount);

  const aParam = searchParams.get("a");
  const accountIndex = aParam !== null ? Math.max(0, Math.min(Number(aParam), 9)) : 0;

  // Currently-edited account, kept independent of the store so unsaved changes
  // don't bleed into other tabs/components reading the store directly.
  const [draftAccount, setDraftAccount] = useState<BlueprintAccountDTO | undefined>();
  const [data, setData] = useState<BlueprintAllShip[]>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unassignedTp, setUnassignedTp] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [userFragments, setUserFragments] = useState<{ fragmentId: number; quantityOwned: number }[]>([]);

  // Layout / view options
  const [isListLayout, setIsListLayout] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [exposeModules, setExposeModules] = useState(false);

  // Search / sort / filter
  const [currentShip, setCurrentShip] = useState<BlueprintSuperCapitalShip>();
  const [currentShipFragments, setCurrentShipFragments] = useState<BlueprintAllShip>();
  const [currentFilters, setCurrentFilters] = useState<ShipFilter>();
  const [currentSorter, setCurrentSorter] = useState<ShipSorter>();
  const [currentSearch, setCurrentSearch] = useState("");
  const [closeToolbar, setCloseToolbar] = useState(false);
  const [displayedData, setDisplayedData] = useState<BlueprintAllShip[]>();

  // Restore layout prefs from localStorage
  useEffect(() => {
    setIsListLayout(localStorage.getItem("layout") === "list");
    setShowVariants(localStorage.getItem("variants") === "true");
    setExposeModules(localStorage.getItem("modules") === "true");
  }, []);

  useEffect(() => { localStorage.setItem("layout", isListLayout ? "list" : "grid"); }, [isListLayout]);
  useEffect(() => { localStorage.setItem("variants", String(showVariants)); }, [showVariants]);
  useEffect(() => { localStorage.setItem("modules", String(exposeModules)); }, [exposeModules]);

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

  // Pick the active account whenever the store or the index in the URL changes.
  // We keep a draft copy locally so a reload from the store after saving doesn't
  // clobber in-progress edits.
  useEffect(() => {
    if (!shipData || !authChecked) return;

    // Logged-in users with no accounts at all → seed an Unnamed draft so the
    // tracker is usable immediately. Anonymous users get the same seed.
    if (accounts.length === 0) {
      const draft = createDraftAccount();
      setDraftAccount(draft);
      setData(buildView(shipData, draft));
      setUnassignedTp(draft.unassignedTp);
      setUserFragments([]);
      setHasUnsavedChanges(false);
      return;
    }

    const target = accounts.find((a) => a.accountIndex === accountIndex) ?? accounts[0];
    if (target.accountIndex !== accountIndex) {
      // The URL pointed at a non-existent account; rewrite it to a real one.
      const params = new URLSearchParams(searchParams.toString());
      params.set("a", String(target.accountIndex));
      router.replace(`/modules/blueprint-tracker?${params.toString()}`);
      return;
    }
    setDraftAccount(target);
    setData(buildView(shipData, target));
    setUnassignedTp([...target.unassignedTp]);
    setUserFragments([...(target.userFragments ?? [])]);
    setHasUnsavedChanges(false);
  }, [accounts, accountIndex, shipData, authChecked]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = true; // Sharing has been removed; you only see your own blueprints.

  function getTotalTP(ships: BlueprintAllShip[]) {
    const usedShips: string[] = [];
    return (
      ships.reduce((total, ship) => {
        if (ship.hasVariants) {
          if (usedShips.includes(ship.name)) return total;
          usedShips.push(ship.name);
        }
        return total + ship.techPoints;
      }, 0) + unassignedTp.reduce((t, n) => t + n, 0)
    );
  }

  const onSave = useCallback(async () => {
    if (!draftAccount || !data) return false;
    const tp = unassignedTp.length === 9
      ? (unassignedTp as unknown as BlueprintAccountDTO["unassignedTp"])
      : ([0, 0, 0, 0, 0, 0, 0, 0, 0] as const);
    const account: BlueprintAccountDTO = {
      ...draftAccount,
      unassignedTp: tp as unknown as BlueprintAccountDTO["unassignedTp"],
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
  }, [draftAccount, data, unassignedTp, userFragments, saveAccount]);

  const onCreateNew = useCallback(() => {
    if (accounts.length >= 10) return;
    const draft = createDraftAccount();
    // Optimistic insert into the store so the toolbar's account list updates
    // immediately. The first save() will persist it for real.
    void saveAccount(draft).then(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("a", String(draft.accountIndex));
      router.push(`/modules/blueprint-tracker?${params.toString()}`);
    });
  }, [accounts.length, createDraftAccount, saveAccount, searchParams, router]);

  const onRename = useCallback(async (index: number, newName: string) => {
    const target = accounts.find((a) => a.accountIndex === index);
    if (!target) return false;
    const saved = await saveAccount({ ...target, accountName: newName });
    return Boolean(saved);
  }, [accounts, saveAccount]);

  const onDelete = useCallback(async (index: number) => {
    await deleteAccount(index);
    // After deletion the store re-numbers indices; clamp the URL into range.
    const remaining = Math.max(0, (accounts.length - 2));
    const params = new URLSearchParams(searchParams.toString());
    params.set("a", String(Math.min(remaining, accountIndex)));
    router.replace(`/modules/blueprint-tracker?${params.toString()}`);
  }, [accounts.length, accountIndex, deleteAccount, router, searchParams]);

  const lastSavedDisplay = draftAccount?.lastSaved && draftAccount.lastSaved !== ""
    ? formatDate(draftAccount.lastSaved, "full", true)
    : undefined;

  return (
    <div
      className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-start p-8"
      onClick={() => setCloseToolbar(true)}
    >
      <BlueprintsToolbar
        closeToolbar={closeToolbar}
        data={data}
        accounts={accounts}
        accountIndex={accountIndex}
        hasUnsavedChanges={hasUnsavedChanges}
        onList={() => setIsListLayout((v) => !v)}
        onVariants={() => setShowVariants((v) => !v)}
        onExposeModules={() => setExposeModules((v) => !v)}
        onSort={(sorter) => setCurrentSorter(() => sorter)}
        onFilter={(filter) => setCurrentFilters(() => filter)}
        onSearch={(term) => setCurrentSearch(term)}
        onSave={onSave}
        onCreateNew={onCreateNew}
        onRename={onRename}
        onDelete={onDelete}
      />

      {(lastSavedDisplay || data) && (
        <div className="mt-8 flex flex-col items-center justify-center">
          {lastSavedDisplay && <p className="transition duration-500">Last updated: {lastSavedDisplay}</p>}
          {data && <p className="text-sm transition duration-500">{getTotalTP(data).toLocaleString()} total Tech Points</p>}
        </div>
      )}

      {displayedData ? (
        <div className="mt-4 flex w-full flex-col items-center justify-center">
          {displayOrder.map((type) => {
            // unassignedTp is keyed by position in `shipTypes` (the persisted
            // column order), so look up by name rather than display position.
            const tpIdx = shipTypes.indexOf(type);
            return (
            <BlueprintsCategory
              key={type}
              shipType={type}
              isOwner={isOwner}
              currentLayout={isListLayout ? "list" : "grid"}
              showVariants={showVariants}
              exposeModules={exposeModules}
              data={data}
              displayedData={displayedData}
              unassignedTp={unassignedTp[tpIdx]}
              onUnassignedTpChange={(tp) => {
                setUnassignedTp((prev) => {
                  const next = [...prev];
                  next[tpIdx] = tp;
                  return next;
                });
                setHasUnsavedChanges(true);
              }}
              onModules={(ship) => setCurrentShip(ship)}
              onFragments={(ship) => setCurrentShipFragments(ship)}
              onDataChange={() => setData((prev) => prev ? [...prev] : prev)}
              onMarkUnsaved={() => setHasUnsavedChanges(true)}
            />
            );
          })}
        </div>
      ) : (
        <div className="mt-4 flex w-full flex-wrap items-stretch justify-center gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="fo-skeleton fo-skeleton-animated h-56 w-full grow rounded-2xl bg-neutral-100 p-6 transition duration-500 dark:bg-neutral-900" />
          ))}
        </div>
      )}

      {currentShip && (
        <div
          className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]"
          onClick={() => setCurrentShip(undefined)}
        >
          <BlueprintsModules
            ship={currentShip}
            owner={isOwner}
            onDone={() => setCurrentShip(undefined)}
            onChange={() => {
              setHasUnsavedChanges(true);
              setData((prev) => prev ? [...prev] : prev);
            }}
          />
        </div>
      )}

      {currentShipFragments && (
        <div
          className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]"
          onClick={() => setCurrentShipFragments(undefined)}
        >
          <BlueprintsFragments
            ship={currentShipFragments}
            userFragments={userFragments}
            onUpdate={setUserFragments}
            onDone={() => setCurrentShipFragments(undefined)}
            onChange={() => {
              setHasUnsavedChanges(true);
              setData((prev) => prev ? [...prev] : prev);
            }}
          />
        </div>
      )}
    </div>
  );
}
