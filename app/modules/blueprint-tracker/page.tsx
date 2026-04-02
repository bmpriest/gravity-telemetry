"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BlueprintsToolbar from "@/components/Blueprints/BlueprintsToolbar";
import BlueprintsCategory from "@/components/Blueprints/BlueprintsCategory";
import BlueprintsModules from "@/components/Blueprints/BlueprintsModules";
import { useUserStore } from "@/stores/userStore";
import { getObjectKey } from "@/utils/functions";
import { formatDate } from "@/utils/functions";
import type { AllShip } from "@/utils/ships";
import type { BlueprintAllShip, BlueprintSuperCapitalShip, ShipFilter, ShipSorter } from "@/utils/blueprints";

const shipTypes = ["Fighter", "Corvette", "Frigate", "Destroyer", "Cruiser", "Battlecruiser", "Auxiliary Ship", "Carrier", "Battleship"] as const;

export default function BlueprintTrackerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const shipData = useUserStore((s) => s.shipData);
  const blueprintsAutosave = useUserStore((s) => s.blueprintsAutosave);
  const setBlueprintsAutosave = useUserStore((s) => s.setBlueprintsAutosave);
  const hasUnsavedChanges = useUserStore((s) => s.hasUnsavedChanges);
  const setHasUnsavedChanges = useUserStore((s) => s.setHasUnsavedChanges);
  const createNewAccount = useUserStore((s) => s.createNewAccount);
  const setCreateNewAccount = useUserStore((s) => s.setCreateNewAccount);
  const setIsUnsavedAccount = useUserStore((s) => s.setIsUnsavedAccount);

  const uParam = searchParams.get("u");
  const aParam = searchParams.get("a");
  const accountIndex = aParam !== null ? Math.min(Number(aParam), 9) : 0;

  const [data, setData] = useState<BlueprintAllShip[]>();
  const [lastSaved, setLastSaved] = useState("");
  const [unassignedTp, setUnassignedTp] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [isListLayout, setIsListLayout] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [exposeModules, setExposeModules] = useState(false);
  const [currentShip, setCurrentShip] = useState<BlueprintSuperCapitalShip>();
  const [currentFilters, setCurrentFilters] = useState<ShipFilter>();
  const [currentSorter, setCurrentSorter] = useState<ShipSorter>();
  const [currentSearch, setCurrentSearch] = useState("");
  const [closeToolbar, setCloseToolbar] = useState(false);
  const [displayedData, setDisplayedData] = useState<BlueprintAllShip[]>();

  const loadedRef = useRef(false);
  const prevAParam = useRef(aParam);

  // Restore layout prefs from localStorage
  useEffect(() => {
    setIsListLayout(localStorage.getItem("layout") === "list");
    setShowVariants(localStorage.getItem("variants") === "true");
    setExposeModules(localStorage.getItem("modules") === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("layout", isListLayout ? "list" : "grid");
  }, [isListLayout]);

  useEffect(() => {
    localStorage.setItem("variants", String(showVariants));
  }, [showVariants]);

  useEffect(() => {
    localStorage.setItem("modules", String(exposeModules));
  }, [exposeModules]);

  // Sync autosave when data changes (owner only)
  useEffect(() => {
    if (data && user?.uid === uParam) setBlueprintsAutosave(data);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Close toolbar on click (reset close signal)
  useEffect(() => {
    if (!closeToolbar) return;
    const t = setTimeout(() => setCloseToolbar(false), 0);
    return () => clearTimeout(t);
  }, [closeToolbar]);

  // Ensure route has u and a params
  useEffect(() => {
    if (!shipData) return;
    if (!uParam && user) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("u", user.uid);
      if (!aParam) params.set("a", "0");
      router.replace(`/modules/blueprint-tracker?${params.toString()}`);
      return;
    }
    if (!aParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("a", "0");
      router.replace(`/modules/blueprint-tracker?${params.toString()}`);
    }
  }, [shipData, user, uParam, aParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = shipData
    ? !uParam
      ? user
        ? true
        : undefined
      : uParam === user?.uid
    : undefined;

  async function getAccount(ships: AllShip[]) {
    const uid = uParam ?? user?.uid;
    if (!uid) return undefined;

    const res = await fetch("/api/blueprints/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, accountIndex }),
    });
    const { success, error, content, lastSaved: bpLastSaved, unassignedTp: savedTp } = await res.json();

    if (!success && error) {
      console.error(error);
      if (aParam !== "0") {
        const params = new URLSearchParams(searchParams.toString());
        params.set("a", "0");
        router.replace(`/modules/blueprint-tracker?${params.toString()}`);
        setHasUnsavedChanges(false);
      }
      return undefined;
    }

    if (success && content && bpLastSaved) {
      setLastSaved(bpLastSaved);
      setUnassignedTp(savedTp ?? [0, 0, 0, 0, 0, 0, 0, 0, 0]);
      return ships.map((ship): BlueprintAllShip => {
        const ownedBlueprint = content.find(([id, variant]: [number, string]) => ship.id === id && ship.variant === variant);
        if ("modules" in ship) {
          return {
            ...ship,
            unlocked: Boolean(ownedBlueprint),
            techPoints: ownedBlueprint ? (ownedBlueprint[2] as number) : 0,
            mirrorTechPoints: ship.hasVariants,
            modules: ship.modules.map((module) => ({
              ...module,
              unlocked: Boolean(ownedBlueprint?.slice(3).includes(module.system)),
            })),
          } as BlueprintSuperCapitalShip;
        }
        return {
          ...ship,
          unlocked: Boolean(ownedBlueprint),
          techPoints: ownedBlueprint ? (ownedBlueprint[2] as number) : 0,
          mirrorTechPoints: ship.hasVariants,
        } as BlueprintAllShip;
      });
    }
    return undefined;
  }

  function createAccountData(ships: AllShip[]): BlueprintAllShip[] {
    if (user && !user.blueprints.some((account) => getObjectKey(account) === "Unnamed" && Object.values(account)[0].length === 0)) {
      setUser({ ...user, blueprints: [...user.blueprints, { Unnamed: [] }] });
    }
    setCreateNewAccount(false);
    setIsUnsavedAccount(true);
    return ships.map((ship): BlueprintAllShip => {
      if ("modules" in ship) {
        return {
          ...ship,
          unlocked: false,
          techPoints: 0,
          mirrorTechPoints: ship.hasVariants,
          modules: ship.modules.map((module) => ({
            ...module,
            unlocked: Boolean(module.default),
          })),
        } as BlueprintSuperCapitalShip;
      }
      return {
        ...ship,
        unlocked: false,
        techPoints: 0,
        mirrorTechPoints: ship.hasVariants,
      } as BlueprintAllShip;
    });
  }

  async function loadBlueprints(ships: AllShip[]) {
    if (createNewAccount) {
      setData(createAccountData(ships));
      return;
    }
    const account = await getAccount(ships);
    if (account) {
      setData(account);
      return;
    }
    setData(createAccountData(ships));
  }

  // Initial load
  useEffect(() => {
    if (isOwner === undefined || !shipData || loadedRef.current) return;
    loadedRef.current = true;
    if (isOwner && blueprintsAutosave) {
      setData(blueprintsAutosave);
    } else {
      void loadBlueprints(shipData);
    }
  }, [isOwner, shipData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload on account index change
  useEffect(() => {
    if (!shipData || !user || !uParam || !aParam) return;
    if (prevAParam.current === aParam) return;
    prevAParam.current = aParam;

    if (user.uid === uParam && loadedRef.current) {
      // Switching accounts for the owner
      void loadBlueprints(shipData);
    }
  }, [aParam]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const reversedShipTypes = [...shipTypes].reverse();

  return (
    <div
      className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-start p-8"
      onClick={() => setCloseToolbar(true)}
    >
      <div className="flex w-full flex-col items-center justify-center md:w-[25rem] lg:w-[30rem]">
        <h1 className="text-3xl font-bold transition duration-500">Blueprint Tracker</h1>
        <div className="fo-divider my-2 before:transition before:duration-500 after:transition after:duration-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
          <span className="flex items-center justify-center">
            <img className="size-12 select-none transition duration-500 dark:invert" src="/ui/bpTracker.svg" aria-hidden="true" />
          </span>
        </div>
      </div>

      <BlueprintsToolbar
        closeToolbar={closeToolbar}
        data={data}
        isOwner={isOwner}
        accountIndex={accountIndex}
        unassignedTp={unassignedTp}
        onList={() => setIsListLayout((v) => !v)}
        onVariants={() => setShowVariants((v) => !v)}
        onExposeModules={() => setExposeModules((v) => !v)}
        onSort={(sorter) => setCurrentSorter(() => sorter)}
        onFilter={(filter) => setCurrentFilters(() => filter)}
        onSearch={(term) => setCurrentSearch(term)}
      />

      {(lastSaved || data) && (
        <div className="mt-8 flex flex-col items-center justify-center">
          {lastSaved && <p className="transition duration-500">Last updated: {formatDate(lastSaved, "full", true)}</p>}
          {data && <p className="text-sm transition duration-500">{getTotalTP(data).toLocaleString()} total Tech Points</p>}
        </div>
      )}

      {displayedData ? (
        <div className="mt-4 flex w-full flex-col items-center justify-center">
          {reversedShipTypes.map((type, index) => (
            <BlueprintsCategory
              key={type}
              shipType={type}
              isOwner={isOwner}
              currentLayout={isListLayout ? "list" : "grid"}
              showVariants={showVariants}
              exposeModules={exposeModules}
              data={data}
              displayedData={displayedData}
              unassignedTp={unassignedTp[shipTypes.length - 1 - index]}
              onUnassignedTpChange={(tp) => {
                const idx = shipTypes.length - 1 - index;
                setUnassignedTp((prev) => {
                  const next = [...prev];
                  next[idx] = tp;
                  return next;
                });
                setHasUnsavedChanges(true);
              }}
              onModules={(ship) => setCurrentShip(ship)}
              onDataChange={() => setData((prev) => prev ? [...prev] : prev)}
            />
          ))}
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
    </div>
  );
}
