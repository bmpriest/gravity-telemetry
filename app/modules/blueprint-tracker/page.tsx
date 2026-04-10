"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BlueprintsToolbar from "@/components/Blueprints/BlueprintsToolbar";
import BlueprintsCategory from "@/components/Blueprints/BlueprintsCategory";
import BlueprintsModules from "@/components/Blueprints/BlueprintsModules";
import { useUserStore, type AccountSummary } from "@/stores/userStore";
import { formatDate } from "@/utils/functions";
import { readGuestAccount, writeGuestAccount, listGuestAccounts } from "@/utils/guestBlueprints";
import type { AllShip } from "@/utils/ships";
import type { BlueprintAllShip, BlueprintSuperCapitalShip, ShipFilter, ShipSorter } from "@/utils/blueprints";

const shipTypes = ["Fighter", "Corvette", "Frigate", "Destroyer", "Cruiser", "Battlecruiser", "Auxiliary Ship", "Carrier", "Battleship"] as const;

// Display name -> ShipType enum value
const SHIP_TYPE_TO_ENUM: Record<string, string> = {
  "Fighter": "Fighter",
  "Corvette": "Corvette",
  "Frigate": "Frigate",
  "Destroyer": "Destroyer",
  "Cruiser": "Cruiser",
  "Battlecruiser": "Battlecruiser",
  "Auxiliary Ship": "AuxiliaryShip",
  "Carrier": "Carrier",
  "Battleship": "Battleship",
};

function tpArrayToRecord(tp: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < shipTypes.length; i++) {
    if (tp[i]) out[SHIP_TYPE_TO_ENUM[shipTypes[i]]] = tp[i];
  }
  return out;
}

function tpRecordToArray(record: Record<string, number> | undefined): number[] {
  const out = new Array<number>(shipTypes.length).fill(0);
  if (!record) return out;
  for (let i = 0; i < shipTypes.length; i++) {
    const enumKey = SHIP_TYPE_TO_ENUM[shipTypes[i]];
    out[i] = record[enumKey] ?? 0;
  }
  return out;
}

interface ServerShipUnlock {
  shipId: number;
  techPoints: number;
  moduleSystems: string[];
}

function buildBlueprints(ships: AllShip[], serverShips: ServerShipUnlock[]): BlueprintAllShip[] {
  const byId = new Map<number, ServerShipUnlock>();
  for (const s of serverShips) byId.set(s.shipId, s);

  return ships.map((ship): BlueprintAllShip => {
    const unlock = byId.get(ship.id);
    if ("modules" in ship) {
      return {
        ...ship,
        unlocked: Boolean(unlock),
        techPoints: unlock?.techPoints ?? 0,
        mirrorTechPoints: ship.hasVariants,
        modules: ship.modules.map((module) => ({
          ...module,
          unlocked: Boolean(unlock?.moduleSystems.includes(module.system)),
        })),
      } as BlueprintSuperCapitalShip;
    }
    return {
      ...ship,
      unlocked: Boolean(unlock),
      techPoints: unlock?.techPoints ?? 0,
      mirrorTechPoints: ship.hasVariants,
    } as BlueprintAllShip;
  });
}

function buildEmptyBlueprints(ships: AllShip[]): BlueprintAllShip[] {
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

function blueprintsToServerShips(data: BlueprintAllShip[]): ServerShipUnlock[] {
  const out: ServerShipUnlock[] = [];
  for (const ship of data) {
    if (!ship.unlocked) continue;
    const moduleSystems = "modules" in ship
      ? ship.modules.filter((m) => m.unlocked).map((m) => m.system)
      : [];
    out.push({ shipId: ship.id, techPoints: ship.techPoints, moduleSystems });
  }
  return out;
}

export default function BlueprintTrackerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const user = useUserStore((s) => s.user);
  const shipData = useUserStore((s) => s.shipData);
  const blueprintsAutosave = useUserStore((s) => s.blueprintsAutosave);
  const setBlueprintsAutosave = useUserStore((s) => s.setBlueprintsAutosave);
  const hasUnsavedChanges = useUserStore((s) => s.hasUnsavedChanges);
  const setHasUnsavedChanges = useUserStore((s) => s.setHasUnsavedChanges);
  const createNewAccount = useUserStore((s) => s.createNewAccount);
  const setCreateNewAccount = useUserStore((s) => s.setCreateNewAccount);
  const setIsUnsavedAccount = useUserStore((s) => s.setIsUnsavedAccount);
  const blueprintAccounts = useUserStore((s) => s.blueprintAccounts);

  const [guestAccounts, setGuestAccounts] = useState<AccountSummary[]>();

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
  // Tracks which account index the current `data` was loaded for; prevents autosave from
  // writing stale data into a freshly-switched account slot.
  const dataAccountRef = useRef<number | undefined>(undefined);

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

  // Sync in-memory autosave when data changes (any user, including guest)
  useEffect(() => {
    if (data) setBlueprintsAutosave(data);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist guest data to localStorage on every change.
  useEffect(() => {
    if (!data || user !== null) return;
    // Skip if data was loaded for a different account index (account just switched, fresh load pending).
    if (dataAccountRef.current !== accountIndex) return;
    const name = guestAccounts?.find((a) => a.accountIndex === accountIndex)?.accountName ?? `Account ${accountIndex}`;
    const now = new Date().toISOString();
    writeGuestAccount(accountIndex, {
      accountName: name,
      ships: blueprintsToServerShips(data),
      unassignedTp: tpArrayToRecord(unassignedTp),
      lastSaved: now,
    });
    setLastSaved(now);
    setHasUnsavedChanges(false);
    setIsUnsavedAccount(false);
    // Refresh the synthetic accounts list
    setGuestAccounts(listGuestAccounts());
  }, [data, unassignedTp, user, accountIndex]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Ensure route has a param
  useEffect(() => {
    if (!shipData) return;
    if (!aParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("a", "0");
      router.replace(`/modules/blueprint-tracker?${params.toString()}`);
    }
  }, [shipData, aParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Owner can edit their own data — true for both logged-in users and guests once state resolves.
  const isOwner = shipData && user !== undefined ? true : undefined;
  const isGuest = user === null;

  // Hydrate guest accounts from localStorage on first render after user resolves to null.
  useEffect(() => {
    if (isGuest && !guestAccounts) setGuestAccounts(listGuestAccounts());
  }, [isGuest, guestAccounts]);

  async function getAccount(ships: AllShip[]) {
    if (isGuest) {
      const guest = readGuestAccount(accountIndex);
      if (!guest) return undefined;
      setLastSaved(guest.lastSaved);
      setUnassignedTp(tpRecordToArray(guest.unassignedTp));
      return buildBlueprints(ships, guest.ships ?? []);
    }
    if (!user) return undefined;

    const res = await fetch("/api/blueprints/get", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountIndex }),
    });
    const { success, error, account } = await res.json();

    if (!success && error) {
      console.error(error);
      return undefined;
    }

    if (success && account) {
      setLastSaved(account.lastSaved);
      setUnassignedTp(tpRecordToArray(account.unassignedTp));
      return buildBlueprints(ships, account.ships ?? []);
    }
    return undefined;
  }

  function createAccountData(ships: AllShip[]): BlueprintAllShip[] {
    setCreateNewAccount(false);
    setIsUnsavedAccount(true);
    setUnassignedTp([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    setLastSaved("");
    return buildEmptyBlueprints(ships);
  }

  async function loadBlueprints(ships: AllShip[]) {
    const targetIndex = accountIndex;
    if (createNewAccount) {
      dataAccountRef.current = targetIndex;
      setData(createAccountData(ships));
      return;
    }
    const account = await getAccount(ships);
    dataAccountRef.current = targetIndex;
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
    // Logged-in users get the in-memory autosave for instant navigation; guests load from localStorage.
    if (user && blueprintsAutosave) {
      dataAccountRef.current = accountIndex;
      setData(blueprintsAutosave);
    } else {
      void loadBlueprints(shipData);
    }
  }, [isOwner, shipData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload on account index change
  useEffect(() => {
    if (!shipData || user === undefined || !aParam) return;
    if (prevAParam.current === aParam) return;
    prevAParam.current = aParam;
    if (loadedRef.current) {
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

  const buildSavePayload = () => ({
    ships: data ? blueprintsToServerShips(data) : [],
    unassignedTp: tpArrayToRecord(unassignedTp),
  });

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
        accounts={isGuest ? guestAccounts : blueprintAccounts}
        isOwner={isOwner}
        accountIndex={accountIndex}
        buildSavePayload={buildSavePayload}
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
