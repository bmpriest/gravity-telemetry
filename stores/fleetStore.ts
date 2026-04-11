import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AllShip } from "@/utils/ships";
import type { Fleet, FleetRow } from "@/utils/fleet";
import { createEmptyFleet, createFleetInstance, getCarrierCapacity, getCarriableType } from "@/utils/fleet";

const STORAGE_KEY = "fleetBuilderSavedFleets";
const CURRENT_FLEET_KEY = "fleetBuilderCurrentFleet";

const allRows = ["front", "middle", "back", "reinforcements"] as const;

interface FleetState {
  fleet: Fleet;
  savedFleets: Fleet[];
  /** True when the fleet store has loaded saved fleets from the server (logged in) */
  syncedWithServer: boolean;

  // Derived selectors (computed equivalents — use these in components)
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
  saveFleet: () => Promise<void>;
  loadFleet: (fleetId: string) => void;
  deleteFleet: (fleetId: string) => Promise<void>;
  newFleet: () => void;
  loadFromStorage: () => void;

  // Server sync — when the user logs in, push every locally-saved fleet to
  // their account (if it doesn't already exist there) and then mirror the
  // server state into the store. When the user logs out, drop the synced
  // marker so future writes go back to localStorage.
  syncWithServer: () => Promise<void>;
  fetchFromServer: () => Promise<void>;
  resetSync: () => void;
}

// Re-export for convenience
export type { FleetRow };
import type { FleetShipInstance } from "@/utils/fleet";

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
            return { fleet: { ...state.fleet, rows, carrierLoads } };
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

      const capacity = getCarrierCapacity(carrierShip);
      const slot = capacity.find((c) => c.type === carriableType);
      if (!slot) return `This carrier cannot hold ${carriableType}s.`;

      const currentLoads = get().fleet.carrierLoads[carrierInstanceId] ?? [];
      const currentOfType = currentLoads.filter((i) => {
        const loadedShip = ships.find((s) => s.id === i.shipId && s.variant === i.variant);
        return loadedShip && getCarriableType(loadedShip) === carriableType;
      });
      if (currentOfType.length >= slot.capacity) return `Carrier is full for ${carriableType}s (${slot.capacity}/${slot.capacity}).`;

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

    async saveFleet() {
      const state = get();
      const copy = JSON.parse(JSON.stringify(state.fleet)) as Fleet;

      if (state.syncedWithServer) {
        // Logged in: persist to the server. We still update local state
        // optimistically so the UI feels instant.
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

      // Logged out: localStorage only.
      const existing = state.savedFleets.findIndex((f) => f.id === state.fleet.id);
      const savedFleets =
        existing !== -1
          ? state.savedFleets.map((f, i) => (i === existing ? copy : f))
          : [...state.savedFleets, copy];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFleets));
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFleets));
    },

    newFleet() {
      set({ fleet: createEmptyFleet() });
    },

    loadFromStorage() {
      try {
        const savedRaw = localStorage.getItem(STORAGE_KEY);
        const currentRaw = localStorage.getItem(CURRENT_FLEET_KEY);

        let savedFleets: Fleet[] = savedRaw ? (JSON.parse(savedRaw) as Fleet[]) : [];
        let fleet: Fleet = currentRaw ? (JSON.parse(currentRaw) as Fleet) : createEmptyFleet();

        // Migrate: ensure reinforcements row exists
        if (!fleet.rows.reinforcements) fleet = { ...fleet, rows: { ...fleet.rows, reinforcements: [] } };
        savedFleets = savedFleets.map((f) => (!f.rows.reinforcements ? { ...f, rows: { ...f.rows, reinforcements: [] } } : f));

        set({ fleet, savedFleets });
      } catch {
        // Invalid data in localStorage
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
      // Push every locally-saved fleet whose id doesn't already exist on the
      // server. We then re-fetch so the store mirrors the server's view of
      // the world (server is now the source of truth for this user).
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

        // Re-fetch and clear localStorage; logged-in lifecycle owns these now.
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
      // Re-hydrate any localStorage fleets that may still be there from before
      // login (we removed them after a successful sync, but a fresh anonymous
      // session may have written new ones).
      get().loadFromStorage();
    },
  }))
);

// Persist current fleet to localStorage whenever it changes
useFleetStore.subscribe(
  (state) => state.fleet,
  (fleet) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_FLEET_KEY, JSON.stringify(fleet));
    }
  }
);
