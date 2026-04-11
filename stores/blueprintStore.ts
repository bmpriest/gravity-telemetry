import { create } from "zustand";

/**
 * Blueprint account store. Mirrors the fleet store's anonymous-vs-server
 * lifecycle: when logged out, accounts live in `localStorage`; once a user
 * logs in, the local accounts are pushed up to the server (one POST per
 * account that the server doesn't already have at that index) and the store
 * thereafter mirrors the server's view of the world.
 *
 * The DTO shape is identical to what the API returns from GET /api/blueprints
 * and POST /api/blueprints. Pages consume `accounts` directly and project
 * a single account into the editable `BlueprintAllShip[]` view by joining
 * against the ship catalogue.
 */

export interface BlueprintModuleEntry {
  moduleId: number;
  unlocked: boolean;
}

export interface BlueprintShipEntry {
  shipId: number;
  unlocked: boolean;
  techPoints: number;
  mirrorTechPoints: boolean;
  modules: BlueprintModuleEntry[];
}

export interface BlueprintAccountDTO {
  accountIndex: number;
  accountName: string;
  /** ISO timestamp; "" for accounts that have never been saved (anonymous, in-memory). */
  lastSaved: string;
  unassignedTp: number[];
  ships: BlueprintShipEntry[];
}

const STORAGE_KEY = "blueprintAccounts";

interface BlueprintState {
  accounts: BlueprintAccountDTO[];
  syncedWithServer: boolean;

  loadFromStorage: () => void;
  fetchFromServer: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  resetSync: () => void;

  /** Upsert one account. Returns the freshly-saved account on success. */
  saveAccount: (account: BlueprintAccountDTO) => Promise<BlueprintAccountDTO | undefined>;
  /** Delete an account by index. Re-numbers the remaining accounts to keep them contiguous. */
  deleteAccount: (accountIndex: number) => Promise<void>;
  /** Convenience helper: build an empty account at the next free index. Does not save it. */
  createDraftAccount: (name?: string) => BlueprintAccountDTO;
}

function emptyTp(): number[] {
  return [0, 0, 0, 0, 0, 0, 0, 0, 0];
}

function persistLocal(accounts: BlueprintAccountDTO[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  accounts: [],
  syncedWithServer: false,

  loadFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as BlueprintAccountDTO[]) : [];
      set({ accounts: Array.isArray(parsed) ? parsed : [] });
    } catch {
      // ignore parse failures
    }
  },

  async fetchFromServer() {
    try {
      const res = await fetch("/api/blueprints", { credentials: "same-origin" });
      const { success, data } = await res.json();
      if (success && Array.isArray(data)) set({ accounts: data, syncedWithServer: true });
    } catch (e) {
      console.error("Failed to fetch blueprints", e);
    }
  },

  async syncWithServer() {
    try {
      const initial = await fetch("/api/blueprints", { credentials: "same-origin" });
      const { success: ok, data } = await initial.json();
      const serverAccounts: BlueprintAccountDTO[] = ok && Array.isArray(data) ? data : [];
      const serverIndices = new Set(serverAccounts.map((a) => a.accountIndex));

      // Push every local account whose index isn't already taken on the server.
      // Anonymous users normally only have account 0, so this is at most 10 POSTs.
      const local = get().accounts;
      for (const acc of local) {
        if (serverIndices.has(acc.accountIndex)) continue;
        await fetch("/api/blueprints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(acc),
          credentials: "same-origin",
        });
      }

      // Re-fetch and clear localStorage; logged-in lifecycle owns these now.
      const final = await fetch("/api/blueprints", { credentials: "same-origin" });
      const { success: ok2, data: data2 } = await final.json();
      if (ok2 && Array.isArray(data2)) {
        if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
        set({ accounts: data2, syncedWithServer: true });
      }
    } catch (e) {
      console.error("Failed to sync blueprints with server", e);
    }
  },

  resetSync() {
    set({ syncedWithServer: false, accounts: [] });
    get().loadFromStorage();
  },

  async saveAccount(account) {
    const state = get();

    if (state.syncedWithServer) {
      try {
        const res = await fetch("/api/blueprints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(account),
          credentials: "same-origin",
        });
        const { success, data, error } = await res.json();
        if (!success) {
          console.error("Failed to save blueprint account:", error);
          return undefined;
        }
        if (Array.isArray(data)) {
          set({ accounts: data });
          return data.find((a: BlueprintAccountDTO) => a.accountIndex === account.accountIndex);
        }
      } catch (e) {
        console.error("Failed to save blueprint account", e);
      }
      return undefined;
    }

    // Anonymous: write straight to localStorage.
    const stamped: BlueprintAccountDTO = { ...account, lastSaved: new Date().toISOString() };
    const next = (() => {
      const existing = state.accounts.findIndex((a) => a.accountIndex === stamped.accountIndex);
      if (existing !== -1) {
        const copy = [...state.accounts];
        copy[existing] = stamped;
        return copy;
      }
      return [...state.accounts, stamped].sort((a, b) => a.accountIndex - b.accountIndex);
    })();
    persistLocal(next);
    set({ accounts: next });
    return stamped;
  },

  async deleteAccount(accountIndex) {
    const state = get();

    if (state.syncedWithServer) {
      try {
        await fetch(`/api/blueprints/${accountIndex}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        await get().fetchFromServer();
      } catch (e) {
        console.error("Failed to delete blueprint account", e);
      }
      return;
    }

    // Anonymous: remove + reindex locally.
    const remaining = state.accounts
      .filter((a) => a.accountIndex !== accountIndex)
      .sort((a, b) => a.accountIndex - b.accountIndex)
      .map((a, i) => ({ ...a, accountIndex: i }));
    persistLocal(remaining);
    set({ accounts: remaining });
  },

  createDraftAccount(name) {
    const used = new Set(get().accounts.map((a) => a.accountIndex));
    let nextIndex = 0;
    while (used.has(nextIndex) && nextIndex < 10) nextIndex++;
    return {
      accountIndex: nextIndex,
      accountName: name ?? "Unnamed",
      lastSaved: "",
      unassignedTp: emptyTp(),
      ships: [],
    };
  },
}));
