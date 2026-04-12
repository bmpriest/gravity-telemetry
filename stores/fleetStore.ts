import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AllShip } from "@/utils/ships";
import type { Fleet, FleetRow, FleetShipInstance, CarrierCapacity } from "@/utils/fleet";
import { createEmptyFleet, createFleetInstance, getCarrierCapacity, getCarriableType, canHangarHoldAircraft } from "@/utils/fleet";

const STORAGE_KEY = "fleetBuilderSavedFleets";
const CURRENT_FLEET_KEY = "fleetBuilderCurrentFleet";

const allRows = ["front", "middle", "back", "reinforcements"] as const;

interface FleetState {
  fleet: Fleet;
  savedFleets: Fleet[];
  /** True when the fleet store has loaded saved fleets from the server (logged in) */
  syncedWithServer: boolean;

  // Derived selectors
  getAllRowInstances: () => FleetShipInstance[];
  getAllCarriedInstances: () => FleetShipInstance[];
  getAllInstances: () => FleetShipInstance[];
  getShipCount: (shipId: number, variant: string) => number;
  getCurrentCP: (ships: AllShip[]) => number;
  isFleetSaved: () => boolean;

  // Mutators
  addShip: (ship: AllShip, targetRow?: FleetRow) => void;
  removeShip: (instanceId: string) => void;
  moveShip: (instanceId: string, toRow: FleetRow) => void;
  moveShips: (instanceIds: string[], toRow: FleetRow) => void;
  loadOntoCarrier: (carrierInstanceId: string, ship: AllShip, ships: AllShip[]) => string | null;
  unloadFromCarrier: (carrierInstanceId: string, instanceId: string) => void;
  setModule: (instanceId: string, category: string, moduleId: number, ships: AllShip[]) => void;
  saveFleet: () => Promise<void>;

  loadFleet: (fleetId: string) => void;
  deleteFleet: (fleetId: string) => Promise<void>;
  newFleet: () => void;
  loadFromStorage: () => void;

  syncWithServer: () => Promise<void>;
  fetchFromServer: () => Promise<void>;
  resetSync: () => void;
}

export type { FleetRow };

const typeOrder: Record<CarrierCapacity["type"], number> = {
  "Small Fighter": 0,
  "Medium Fighter": 1,
  "Large Fighter": 2,
  "Corvette": 3
};

export const useFleetStore = create<FleetState>()(
  subscribeWithSelector((set, get) => ({
    fleet: createEmptyFleet(),
    savedFleets: [],
    syncedWithServer: false,

    getAllRowInstances() {
      const { fleet } = get();
      return [...fleet.rows.front, ...fleet.rows.middle, ...fleet.rows.back, ...fleet.rows.reinforcements];
    },

    getAllCarriedInstances() {
      return Object.values(get().fleet.carrierLoads).flat();
    },

    getAllInstances() {
      return [...get().getAllRowInstances(), ...get().getAllCarriedInstances()];
    },

    getShipCount(shipId, variant) {
      return get().getAllInstances().filter((i) => i.shipId === shipId && i.variant === variant).length;
    },

    getCurrentCP(ships) {
      const { fleet } = get();
      const cpInstances = [...fleet.rows.front, ...fleet.rows.middle, ...fleet.rows.back];
      return cpInstances.reduce((total, instance) => {
        const ship = ships.find((s) => s.id === instance.shipId && s.variant === instance.variant);
        return total + (ship?.commandPoints ?? 0);
      }, 0);
    },

    isFleetSaved() {
      const { fleet, savedFleets } = get();
      const saved = savedFleets.find((f) => f.id === fleet.id);
      if (!saved) return false;
      return JSON.stringify(saved) === JSON.stringify(fleet);
    },

    addShip(ship, targetRow) {
      const row = targetRow ?? (ship.row.toLowerCase() as FleetRow);
      const instance = createFleetInstance(ship);
      set((state) => ({
        fleet: {
          ...state.fleet,
          rows: { ...state.fleet.rows, [row]: [...state.fleet.rows[row], instance] },
        },
      }));
    },

    removeShip(instanceId) {
      set((state) => {
        const rows = { ...state.fleet.rows };
        for (const row of allRows) {
          const idx = rows[row].findIndex((i) => i.id === instanceId);
          if (idx !== -1) {
            rows[row] = rows[row].filter((i) => i.id !== instanceId);
            const carrierLoads = { ...state.fleet.carrierLoads };
            delete carrierLoads[instanceId];
            
            const moduleConfig = { ...state.fleet.moduleConfig };
            if (moduleConfig[instanceId]) delete moduleConfig[instanceId];

            return { fleet: { ...state.fleet, rows, carrierLoads, moduleConfig } };
          }
        }
        return state;
      });
    },

    moveShip(instanceId, toRow) {
      set((state) => {
        const rows = { ...state.fleet.rows };
        for (const row of allRows) {
          const idx = rows[row].findIndex((i) => i.id === instanceId);
          if (idx !== -1) {
            const instance = rows[row][idx];
            rows[row] = rows[row].filter((i) => i.id !== instanceId);
            rows[toRow] = [...rows[toRow], instance];
            return { fleet: { ...state.fleet, rows } };
          }
        }
        return state;
      });
    },

    moveShips(instanceIds, toRow) {
      instanceIds.forEach((id) => get().moveShip(id, toRow));
    },

    loadOntoCarrier(carrierInstanceId, ship, ships) {
      const allRowInstances = get().getAllRowInstances();
      const carrierInstance = allRowInstances.find((i) => i.id === carrierInstanceId);
      if (!carrierInstance) return "Carrier not found in fleet.";

      const carrierShip = ships.find((s) => s.id === carrierInstance.shipId && s.variant === carrierInstance.variant);
      if (!carrierShip) return "Carrier ship data not found.";

      const carriableType = getCarriableType(ship);
      if (!carriableType) return "This ship cannot be loaded onto a carrier.";

      const activeModuleIds = get().fleet.moduleConfig?.[carrierInstanceId] ? Object.values(get().fleet.moduleConfig[carrierInstanceId]) : undefined;
      const capacities = getCarrierCapacity(carrierShip, activeModuleIds);
      const currentLoads = get().fleet.carrierLoads[carrierInstanceId] ?? [];

      const allAircraftTypes = currentLoads.map(inst => {
        const s = ships.find(s => s.id === inst.shipId && s.variant === inst.variant);
        return s ? getCarriableType(s) : null;
      }).filter((t): t is CarrierCapacity["type"] => t !== null);

      allAircraftTypes.push(carriableType);
      allAircraftTypes.sort((a, b) => typeOrder[a] - typeOrder[b]);

      const tempCapacities = capacities.map(c => ({ ...c }));
      for (const airType of allAircraftTypes) {
        const fitSlot = tempCapacities
          .filter(c => c.capacity > 0 && canHangarHoldAircraft(c.type, airType))
          .sort((a, b) => typeOrder[a.type] - typeOrder[b.type])[0];
        
        if (!fitSlot) return `Carrier is full for ${carriableType}s.`;
        fitSlot.capacity--;
      }

      const instance = createFleetInstance(ship);
      set((state) => ({
        fleet: {
          ...state.fleet,
          carrierLoads: {
            ...state.fleet.carrierLoads,
            [carrierInstanceId]: [...(state.fleet.carrierLoads[carrierInstanceId] ?? []), instance],
          },
        },
      }));
      return null;
    },

    unloadFromCarrier(carrierInstanceId, instanceId) {
      set((state) => {
        const loads = state.fleet.carrierLoads[carrierInstanceId];
        if (!loads) return state;
        const newLoads = loads.filter((i) => i.id !== instanceId);
        const carrierLoads = { ...state.fleet.carrierLoads };
        if (newLoads.length === 0) delete carrierLoads[carrierInstanceId];
        else carrierLoads[carrierInstanceId] = newLoads;
        return { fleet: { ...state.fleet, carrierLoads } };
      });
    },

    setModule(instanceId, category, moduleId, ships) {
      set((state) => {
        const currentConfig = state.fleet.moduleConfig?.[instanceId] || {};
        const newConfig = { ...currentConfig };
        
        if (newConfig[category] === moduleId) {
          delete newConfig[category];
        } else {
          newConfig[category] = moduleId;
        }

        const updatedModuleConfig = {
          ...(state.fleet.moduleConfig || {}),
          [instanceId]: newConfig,
        };

        const carrierInstance = get().getAllRowInstances().find(i => i.id === instanceId);
        const carrierShip = carrierInstance ? ships.find(s => s.id === carrierInstance.shipId && s.variant === carrierInstance.variant) : null;
        
        let updatedCarrierLoads = { ...state.fleet.carrierLoads };
        if (carrierShip && updatedCarrierLoads[instanceId]) {
          const activeModuleIds = Object.values(newConfig);
          const capacities = getCarrierCapacity(carrierShip, activeModuleIds);
          const currentLoads = updatedCarrierLoads[instanceId];
          
          const aircraft = currentLoads.map(inst => {
            const ship = ships.find(s => s.id === inst.shipId && s.variant === inst.variant);
            return { inst, type: ship ? getCarriableType(ship) : null };
          }).filter((a): a is { inst: FleetShipInstance; type: CarrierCapacity["type"] } => a.type !== null);

          aircraft.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

          const tempCapacities = capacities.map(c => ({ ...c }));
          const validInstances: FleetShipInstance[] = [];
          
          for (const item of aircraft) {
            const fitSlot = tempCapacities
              .filter(c => c.capacity > 0 && canHangarHoldAircraft(c.type, item.type))
              .sort((a, b) => typeOrder[a.type] - typeOrder[b.type])[0];
            
            if (fitSlot) {
              fitSlot.capacity--;
              validInstances.push(item.inst);
            }
          }
          
          if (validInstances.length === 0) delete updatedCarrierLoads[instanceId];
          else updatedCarrierLoads[instanceId] = validInstances;
        }

        return {
          fleet: {
            ...state.fleet,
            moduleConfig: updatedModuleConfig,
            carrierLoads: updatedCarrierLoads,
          },
        };
      });
    },

    async saveFleet() {
      const state = get();
      const copy = JSON.parse(JSON.stringify(state.fleet)) as Fleet;

      if (state.syncedWithServer) {
        const existing = state.savedFleets.findIndex((f) => f.id === state.fleet.id);
        const savedFleets =
          existing !== -1
            ? state.savedFleets.map((f, i) => (i === existing ? copy : f))
            : [...state.savedFleets, copy];
        set({ savedFleets });

        try {
          const res = await fetch("/api/fleets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(copy),
            credentials: "same-origin",
          });
          const { success, data } = await res.json();
          if (success && Array.isArray(data)) set({ savedFleets: data });
        } catch (e) {
          console.error("Failed to save fleet to server", e);
        }
        return;
      }

      const existing = state.savedFleets.findIndex((f) => f.id === state.fleet.id);
      const savedFleets =
        existing !== -1
          ? state.savedFleets.map((f, i) => (i === existing ? copy : f))
          : [...state.savedFleets, copy];
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFleets));
      }
      set({ savedFleets });
    },

    loadFleet(fleetId) {
      const saved = get().savedFleets.find((f) => f.id === fleetId);
      if (saved) set({ fleet: JSON.parse(JSON.stringify(saved)) });
    },

    async deleteFleet(fleetId) {
      const state = get();
      const savedFleets = state.savedFleets.filter((f) => f.id !== fleetId);
      set({ savedFleets });

      if (state.syncedWithServer) {
        try {
          await fetch(`/api/fleets/${encodeURIComponent(fleetId)}`, {
            method: "DELETE",
            credentials: "same-origin",
          });
        } catch (e) {
          console.error("Failed to delete fleet from server", e);
        }
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFleets));
      }
    },

    newFleet() {
      set({ fleet: createEmptyFleet() });
    },

    loadFromStorage() {
      if (typeof window === "undefined") return;
      try {
        const savedRaw = localStorage.getItem(STORAGE_KEY);
        const currentRaw = localStorage.getItem(CURRENT_FLEET_KEY);

        const sanitize = (f: Fleet) => {
          if (!f.rows.reinforcements) f.rows.reinforcements = [];
          if (!f.moduleConfig) f.moduleConfig = {};
          if (!f.carrierLoads) f.carrierLoads = {};
          return f;
        };

        const { syncedWithServer, savedFleets: currentSavedFleets } = get();
        let savedFleets: Fleet[] = syncedWithServer ? currentSavedFleets : (savedRaw ? (JSON.parse(savedRaw) as Fleet[]) : []);
        let fleet: Fleet = currentRaw ? (JSON.parse(currentRaw) as Fleet) : createEmptyFleet();

        fleet = sanitize(fleet);
        savedFleets = savedFleets.map(sanitize);

        set({ fleet, savedFleets });
      } catch {
        // Invalid data
      }
    },

    async fetchFromServer() {
      try {
        const res = await fetch("/api/fleets", { credentials: "same-origin" });
        const { success, data } = await res.json();
        if (success && Array.isArray(data)) set({ savedFleets: data, syncedWithServer: true });
      } catch (e) {
        console.error("Failed to fetch fleets from server", e);
      }
    },

    async syncWithServer() {
      try {
        const initial = await fetch("/api/fleets", { credentials: "same-origin" });
        const initialBody = await initial.json();
        const serverFleets: Fleet[] = (initialBody.success && Array.isArray(initialBody.data) ? initialBody.data : []) as Fleet[];
        const serverIds = new Set(serverFleets.map((f) => f.id));

        const local = get().savedFleets;
        const toUpload = local.filter((f) => !serverIds.has(f.id));
        for (const f of toUpload) {
          await fetch("/api/fleets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
            credentials: "same-origin",
          });
        }

        const final = await fetch("/api/fleets", { credentials: "same-origin" });
        const { success, data } = await final.json();
        if (success && Array.isArray(data)) {
          localStorage.removeItem(STORAGE_KEY);
          set({ savedFleets: data, syncedWithServer: true });
        }
      } catch (e) {
        console.error("Failed to sync fleets with server", e);
      }
    },

    resetSync() {
      set({ syncedWithServer: false, savedFleets: [] });
      get().loadFromStorage();
    },
  }))
);

if (typeof window !== "undefined") {
  useFleetStore.subscribe(
    (state) => state.fleet,
    (fleet) => {
      localStorage.setItem(CURRENT_FLEET_KEY, JSON.stringify(fleet));
    }
  );
}
