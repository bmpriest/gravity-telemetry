"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import FleetSidebar from "@/components/Fleet/FleetSidebar";
import FleetToolbar from "@/components/Fleet/FleetToolbar";
import FleetFormationColumn from "@/components/Fleet/FleetFormationColumn";
import FleetCarrierModal from "@/components/Fleet/FleetCarrierModal";
import FleetModuleModal from "@/components/Fleet/FleetModuleModal";
import FleetSavedFleets from "@/components/Fleet/FleetSavedFleets";
import FleetAircraftSection from "@/components/Fleet/FleetAircraftSection";
import { useUserStore } from "@/stores/userStore";
import { useFleetStore } from "@/stores/fleetStore";
import { useBlueprintStore } from "@/stores/blueprintStore";
import type { AllShip } from "@/utils/ships";
import type { FleetShipInstance, FleetRow } from "@/utils/fleet";
import { getCarriableType, getCarrierCapacity } from "@/utils/fleet";

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

  // Owned-ships filter is keyed off the first blueprint account
  const ownedShipIds = useMemo<Set<number> | null>(() => {
    const account = blueprintAccounts[0];
    if (!account) return null;
    const set = new Set<number>();
    for (const entry of account.ships) {
      if (entry.unlocked) set.add(entry.shipId);
    }
    return set.size > 0 ? set : null;
  }, [blueprintAccounts]);

  const ownedModuleIds = useMemo<Set<number> | null>(() => {
    const account = blueprintAccounts[0];
    if (!account) return null;
    const set = new Set<number>();
    for (const shipEntry of account.ships) {
      for (const mod of shipEntry.modules) {
        if (mod.unlocked) set.add(mod.moduleId);
      }
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
  const setModule = useFleetStore((s) => s.setModule);
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
  const [moduleModalInstances, setModuleModalInstances] = useState<FleetShipInstance[]>();
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

  const carrierModalLoads = useMemo(() => {
    if (!carrierModalInstances) return [];
    return carrierModalInstances.flatMap((inst) => fleet.carrierLoads[inst.id] ?? []);
  }, [carrierModalInstances, fleet.carrierLoads]);

  function handleAddShip(ship: AllShip) {
    const carriableType = getCarriableType(ship);
    if (carriableType !== null) {
      const allRowInstances = getAllRowInstances();
      for (const inst of allRowInstances) {
        const error = loadOntoCarrier(inst.id, ship, allShips);
        if (!error) {
          const carrierShip = allShips.find((s) => s.id === inst.shipId && s.variant === inst.variant);
          showNotice(`Added ${ship.name} to ${carrierShip?.name}.`);
          return;
        }
      }
      showNotice(`No available carrier slots for ${ship.name}.`);
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
    
    const carriableType = getCarriableType(ship);
    if (carriableType !== null) {
      handleAddShip(ship);
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

          <div className="flex gap-3 overflow-x-auto lg:gap-4 pb-2">
            {columns.map((col) => (
              <FleetFormationColumn
                key={col.row}
                row={col.row}
                label={col.label}
                description={col.description}
                instances={fleet.rows[col.row]}
                ships={allShips}
                carrierLoads={fleet.carrierLoads}
                moduleConfig={fleet.moduleConfig || {}}
                onDrop={(data) => handleDrop(data, col.row)}
                onMoveShips={(data) => handleMoveShips(data, col.row)}
                onAddShip={(ship) => addShip(ship, col.row)}
                onRemoveOne={(id) => removeShip(id)}
                onModules={(instances: FleetShipInstance[]) => setModuleModalInstances(instances)}
              />
            ))}
          </div>

          <FleetAircraftSection
            fleet={fleet}
            ships={allShips}
            onLoad={(carrierId, ship) => {
              const error = loadOntoCarrier(carrierId, ship, allShips);
              if (error) showNotice(error);
            }}
            onUnload={unloadFromCarrier}
          />
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

      {moduleModalInstances && (
        <div
          className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]"
          onClick={() => setModuleModalInstances(undefined)}
        >
          <FleetModuleModal
            instances={moduleModalInstances}
            ships={allShips}
            moduleConfig={fleet.moduleConfig || {}}
            ownedModuleIds={ownedModuleIds}
            showOwnedOnly={showOwnedOnly}
            onClose={() => setModuleModalInstances(undefined)}
            onSetModule={(instId, cat, modId, ships) => setModule(instId, cat, modId, ships)}
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
