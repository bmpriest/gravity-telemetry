"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import FleetSidebar from "@/components/Fleet/FleetSidebar";
import FleetToolbar from "@/components/Fleet/FleetToolbar";
import FleetFormationColumn from "@/components/Fleet/FleetFormationColumn";
import FleetCarrierModal from "@/components/Fleet/FleetCarrierModal";
import FleetSavedFleets from "@/components/Fleet/FleetSavedFleets";
import { useUserStore } from "@/stores/userStore";
import { useFleetStore } from "@/stores/fleetStore";
import { useBlueprintStore } from "@/stores/blueprintStore";
import type { AllShip } from "@/utils/ships";
import type { FleetShipInstance, FleetRow } from "@/utils/fleet";
import { getCarriableType } from "@/utils/fleet";

const columns: { row: FleetRow; label: string; description: string }[] = [
  { row: "back", label: "Back Row", description: "Support & ranged" },
  { row: "middle", label: "Middle Row", description: "Balanced core" },
  { row: "front", label: "Front Row", description: "Vanguard" },
  { row: "reinforcements", label: "Reinforcements", description: "No CP cost" },
];

export default function FleetBuilderPage() {
  const shipData = useUserStore((s) => s.shipData);
  const { init } = useUserStore();
  const blueprintAccounts = useBlueprintStore((s) => s.accounts);

  // Owned-ships filter is keyed off the first blueprint account (matches the
  // pre-refactor behavior where the autosaved account drove this). The lookup
  // is a Set of `Ship.id` (the DB PK, which is unique per ship+variant).
  const ownedShipIds = useMemo<Set<number> | null>(() => {
    const account = blueprintAccounts[0];
    if (!account) return null;
    const set = new Set<number>();
    for (const entry of account.ships) {
      if (entry.unlocked) set.add(entry.shipId);
    }
    return set.size > 0 ? set : null;
  }, [blueprintAccounts]);

  const fleet = useFleetStore((s) => s.fleet);
  const savedFleets = useFleetStore((s) => s.savedFleets);
  const addShip = useFleetStore((s) => s.addShip);
  const removeShip = useFleetStore((s) => s.removeShip);
  const moveShips = useFleetStore((s) => s.moveShips);
  const loadOntoCarrier = useFleetStore((s) => s.loadOntoCarrier);
  const unloadFromCarrier = useFleetStore((s) => s.unloadFromCarrier);
  const saveFleet = useFleetStore((s) => s.saveFleet);
  const loadFleet = useFleetStore((s) => s.loadFleet);
  const deleteFleet = useFleetStore((s) => s.deleteFleet);
  const newFleet = useFleetStore((s) => s.newFleet);
  const loadFromStorage = useFleetStore((s) => s.loadFromStorage);
  const getShipCount = useFleetStore((s) => s.getShipCount);
  const getCurrentCP = useFleetStore((s) => s.getCurrentCP);
  const getAllRowInstances = useFleetStore((s) => s.getAllRowInstances);
  const getAllCarriedInstances = useFleetStore((s) => s.getAllCarriedInstances);
  const isFleetSaved = useFleetStore((s) => s.isFleetSaved);

  const [showSavedFleets, setShowSavedFleets] = useState(false);
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [carrierModalInstances, setCarrierModalInstances] = useState<FleetShipInstance[]>();
  const [notice, setNotice] = useState("");
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    loadFromStorage();
    if (!shipData) init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showNotice(msg: string) {
    setNotice(msg);
    clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setNotice(""), 3000);
  }

  const allShips = useMemo<AllShip[]>(() => shipData ?? [], [shipData]);
  const hasBlueprintData = ownedShipIds !== null;
  const currentCP = getCurrentCP(allShips);

  const filteredShips = useMemo(() => {
    let ships = allShips;
    if (showOwnedOnly && ownedShipIds) {
      ships = ships.filter((ship) => ownedShipIds.has(ship.id));
    }
    if (filterType !== "All") {
      ships = ships.filter((ship) => ship.type === filterType);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      ships = ships.filter(
        (ship) =>
          ship.name.toLowerCase().includes(q) ||
          ship.variantName.toLowerCase().includes(q) ||
          ship.title.toLowerCase().includes(q)
      );
    }
    return ships;
  }, [allShips, showOwnedOnly, ownedShipIds, filterType, searchQuery]);

  const carrierAvailableShips = useMemo(() => {
    let ships = allShips.filter((s) => getCarriableType(s) !== null);
    if (showOwnedOnly && ownedShipIds) {
      ships = ships.filter((ship) => ownedShipIds.has(ship.id));
    }
    return ships;
  }, [allShips, showOwnedOnly, ownedShipIds]);

  interface AircraftEntry { key: string; ship: AllShip; count: number; }
  const aircraftSummary = useMemo<AircraftEntry[]>(() => {
    const allCarried = Object.values(fleet.carrierLoads).flat();
    const map = new Map<string, AircraftEntry>();
    for (const inst of allCarried) {
      const key = `${inst.shipId}-${inst.variant}`;
      const ship = allShips.find((s) => s.id === inst.shipId && s.variant === inst.variant);
      if (!ship) continue;
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { key, ship, count: 1 });
    }
    return Array.from(map.values());
  }, [fleet.carrierLoads, allShips]);

  const totalAircraftCP = aircraftSummary.reduce((sum, e) => sum + e.count * e.ship.commandPoints, 0);

  const carrierModalLoads = useMemo(() => {
    if (!carrierModalInstances) return [];
    return carrierModalInstances.flatMap((inst) => fleet.carrierLoads[inst.id] ?? []);
  }, [carrierModalInstances, fleet.carrierLoads]);

  function handleAddShip(ship: AllShip) {
    if (getCarriableType(ship) !== null) {
      showNotice('Fighters and corvettes must be loaded onto a carrier. Click "Aircraft" on a carrier ship.');
      return;
    }
    if (getShipCount(ship.id, ship.variant) >= ship.serviceLimit) {
      showNotice(`Service limit reached for ${ship.name} (${ship.serviceLimit}).`);
      return;
    }
    const defaultRow = ship.row.toLowerCase() as FleetRow;
    addShip(ship, defaultRow);
  }

  function handleDrop(data: { shipId: number; variant: string }, targetRow: FleetRow) {
    const ship = allShips.find((s) => s.id === data.shipId && s.variant === data.variant);
    if (!ship) return;
    if (getCarriableType(ship) !== null) {
      showNotice('Fighters and corvettes must be loaded onto a carrier. Click "Aircraft" on a carrier ship.');
      return;
    }
    if (getShipCount(ship.id, ship.variant) >= ship.serviceLimit) {
      showNotice(`Service limit reached for ${ship.name} (${ship.serviceLimit}).`);
      return;
    }
    const row = targetRow === "reinforcements" ? "reinforcements" : (ship.row.toLowerCase() as FleetRow);
    addShip(ship, row);
  }

  function handleMoveShips(data: { instanceIds: string[]; sourceRow: string }, targetRow: FleetRow) {
    if (data.sourceRow === targetRow) return;
    moveShips(data.instanceIds, targetRow);
  }

  function handleLoadOntoCarrier(ship: AllShip) {
    if (!carrierModalInstances) return;
    for (const inst of carrierModalInstances) {
      const error = loadOntoCarrier(inst.id, ship, allShips);
      if (!error) return;
    }
    showNotice("All carriers of this type are full for this aircraft type.");
  }

  function handleUnloadFromCarrier(instanceId: string) {
    if (!carrierModalInstances) return;
    for (const inst of carrierModalInstances) {
      const loads = fleet.carrierLoads[inst.id];
      if (loads?.some((l) => l.id === instanceId)) {
        unloadFromCarrier(inst.id, instanceId);
        return;
      }
    }
  }

  function handleSaveFleet() {
    saveFleet();
    showNotice("Fleet saved!");
  }

  function handleNewFleet() {
    const hasShips = getAllRowInstances().length > 0 || getAllCarriedInstances().length > 0;
    if (hasShips && !isFleetSaved()) {
      if (!confirm("Start a new fleet? Unsaved changes will be lost.")) return;
    }
    newFleet();
  }

  function handleLoadFleet(fleetId: string) {
    loadFleet(fleetId);
    setShowSavedFleets(false);
    showNotice("Fleet loaded!");
  }

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-start p-4 sm:p-6">
      <div className="mb-4 flex w-full flex-col items-center justify-center md:w-[25rem] lg:w-[30rem]">
        <h1 className="text-3xl font-bold text-black transition duration-500 dark:text-white">Fleet Builder</h1>
        <div className="fo-divider my-2 before:transition before:duration-500 after:transition after:duration-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
          <span className="flex items-center justify-center">
            <img className="size-12 select-none transition duration-500 dark:invert" src="/ui/fleetBuilder.svg" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div
        className="w-full max-w-7xl gap-5"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 320px) 1fr",
        }}
      >
        <FleetSidebar
          ships={filteredShips}
          showOwnedOnly={showOwnedOnly}
          hasBlueprintData={hasBlueprintData}
          filterType={filterType}
          searchQuery={searchQuery}
          getShipCount={getShipCount}
          onToggleOwned={() => setShowOwnedOnly((v) => !v)}
          onFilterType={setFilterType}
          onSearch={setSearchQuery}
          onAdd={handleAddShip}
        />

        <div className="flex flex-col gap-4">
          <FleetToolbar
            fleet={fleet}
            currentCP={currentCP}
            savedCount={savedFleets.length}
            onUpdateName={(name) => useFleetStore.setState((s) => ({ fleet: { ...s.fleet, name } }))}
            onUpdateMaxCP={(cp) => useFleetStore.setState((s) => ({ fleet: { ...s.fleet, maxCommandPoints: cp } }))}
            onSave={handleSaveFleet}
            onNewFleet={handleNewFleet}
            onToggleSaved={() => setShowSavedFleets(true)}
          />

          <div className="flex gap-3 overflow-x-auto lg:gap-4">
            {columns.map((col) => (
              <FleetFormationColumn
                key={col.row}
                row={col.row}
                label={col.label}
                description={col.description}
                instances={fleet.rows[col.row]}
                ships={allShips}
                carrierLoads={fleet.carrierLoads}
                onDrop={(data) => handleDrop(data, col.row)}
                onMoveShips={(data) => handleMoveShips(data, col.row)}
                onAddShip={(ship) => addShip(ship, col.row)}
                onRemoveOne={(id) => removeShip(id)}
                onCarrier={(instances) => setCarrierModalInstances(instances)}
              />
            ))}
          </div>

          {aircraftSummary.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 transition duration-500 dark:border-neutral-700 dark:bg-neutral-900">
              <h3 className="mb-2 text-left text-sm font-bold text-black dark:text-white">Loaded Aircraft</h3>
              <div className="flex flex-wrap gap-2">
                {aircraftSummary.map((entry) => (
                  <div
                    key={entry.key}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 transition dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    <img className="h-6 object-contain" src={entry.ship.img} alt={entry.ship.name} />
                    <span className="text-xs text-black dark:text-white">{entry.ship.name}</span>
                    {entry.ship.hasVariants && (
                      <span className="text-[0.6rem] text-neutral-400 dark:text-neutral-500">({entry.ship.variant})</span>
                    )}
                    <span className="rounded-full bg-blue-100 px-1.5 text-[0.6rem] font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">x{entry.count}</span>
                    <span className="text-[0.6rem] text-neutral-400 dark:text-neutral-500">{entry.count * entry.ship.commandPoints} CP</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-right text-[0.65rem] text-neutral-500 dark:text-neutral-400">
                {totalAircraftCP} CP in aircraft
              </p>
            </div>
          )}
        </div>
      </div>

      {showSavedFleets && (
        <div
          className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]"
          onClick={() => setShowSavedFleets(false)}
        >
          <FleetSavedFleets
            savedFleets={savedFleets}
            onClose={() => setShowSavedFleets(false)}
            onLoad={handleLoadFleet}
            onDelete={(id) => deleteFleet(id)}
          />
        </div>
      )}

      {carrierModalInstances && (
        <div
          className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]"
          onClick={() => setCarrierModalInstances(undefined)}
        >
          <FleetCarrierModal
            carrierInstances={carrierModalInstances}
            currentLoads={carrierModalLoads}
            ships={allShips}
            availableShipsPool={carrierAvailableShips}
            showOwnedOnly={showOwnedOnly}
            getShipFleetCount={(ship) => getShipCount(ship.id, ship.variant)}
            onClose={() => setCarrierModalInstances(undefined)}
            onLoad={handleLoadOntoCarrier}
            onUnload={handleUnloadFromCarrier}
          />
        </div>
      )}

      {notice && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white px-5 py-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm font-medium text-black dark:text-white">{notice}</p>
        </div>
      )}
    </div>
  );
}
