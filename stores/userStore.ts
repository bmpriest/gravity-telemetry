import { create } from "zustand";
import type { Alert, SaveTemplate } from "@/utils/types";
import type { AllShip } from "@/utils/ships";
import type { BlueprintAllShip } from "@/utils/blueprints";

export type SessionUser = {
  id: string;
  username: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
};

export type AccountSummary = {
  accountIndex: number;
  accountName: string;
  lastSaved: string; // ISO
};

interface UserState {
  isDarkMode: boolean;
  alert: Alert | undefined;
  user: SessionUser | null | undefined; // undefined = not yet fetched, null = guest
  shipData: AllShip[] | undefined;

  blueprintAccounts: AccountSummary[] | undefined;
  savedMails: SaveTemplate[] | undefined;

  // blueprint tracker UI state
  blueprintsAutosave: BlueprintAllShip[] | undefined;
  hasUnsavedChanges: boolean;
  createNewAccount: boolean;
  isUnsavedAccount: boolean;

  setIsDarkMode: (v: boolean) => void;
  setAlert: (v: Alert | undefined) => void;
  setUser: (v: SessionUser | null | undefined) => void;
  setBlueprintAccounts: (v: AccountSummary[] | undefined) => void;
  setSavedMails: (v: SaveTemplate[] | undefined) => void;
  setBlueprintsAutosave: (v: BlueprintAllShip[] | undefined) => void;
  setHasUnsavedChanges: (v: boolean) => void;
  setCreateNewAccount: (v: boolean) => void;
  setIsUnsavedAccount: (v: boolean) => void;

  fetchCurrentUser: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (
    username: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;

  fetchShipData: () => Promise<void>;
  fetchLatestAlert: () => Promise<void>;
  fetchSavedMails: () => Promise<void>;
  fetchBlueprintAccounts: () => Promise<void>;
  init: () => void;
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const useUserStore = create<UserState>((set, get) => ({
  isDarkMode: false,
  alert: undefined,
  user: undefined,
  shipData: undefined,
  blueprintAccounts: undefined,
  savedMails: undefined,
  blueprintsAutosave: undefined,
  hasUnsavedChanges: false,
  createNewAccount: false,
  isUnsavedAccount: false,

  setIsDarkMode: (v) => set({ isDarkMode: v }),
  setAlert: (v) => set({ alert: v }),
  setUser: (v) => set({ user: v }),
  setBlueprintAccounts: (v) => set({ blueprintAccounts: v }),
  setSavedMails: (v) => set({ savedMails: v }),
  setBlueprintsAutosave: (v) => set({ blueprintsAutosave: v }),
  setHasUnsavedChanges: (v) => set({ hasUnsavedChanges: v }),
  setCreateNewAccount: (v) => set({ createNewAccount: v }),
  setIsUnsavedAccount: (v) => set({ isUnsavedAccount: v }),

  async fetchCurrentUser() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const body = await readJson<{ success: boolean; user: SessionUser | null }>(res);
      set({ user: body?.user ?? null });
      if (body?.user) {
        void get().fetchSavedMails();
        void get().fetchBlueprintAccounts();
      }
    } catch {
      set({ user: null });
    }
  },

  async login(username, password) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const body = await readJson<{ success: boolean; error?: string; user?: SessionUser }>(res);
    if (!body?.success || !body.user) {
      return { ok: false, error: body?.error ?? "Login failed" };
    }
    set({ user: body.user });
    void get().fetchSavedMails();
    void get().fetchBlueprintAccounts();
    return { ok: true };
  },

  async logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    set({ user: null, blueprintAccounts: undefined, savedMails: undefined });
  },

  async register(username, password) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const body = await readJson<{ success: boolean; error?: string; user?: SessionUser }>(res);
    if (!body?.success || !body.user) {
      return { ok: false, error: body?.error ?? "Registration failed" };
    }
    set({ user: body.user });
    void get().fetchSavedMails();
    void get().fetchBlueprintAccounts();
    return { ok: true };
  },

  async fetchShipData() {
    try {
      const res = await fetch("/api/ships");
      const body = await readJson<{ data: AllShip[] }>(res);
      if (body?.data) set({ shipData: body.data });
    } catch {
      console.error("Failed to fetch ship data");
    }
  },

  async fetchSavedMails() {
    try {
      const res = await fetch("/api/mail/list", { credentials: "include" });
      if (!res.ok) {
        set({ savedMails: undefined });
        return;
      }
      const body = await readJson<{ success: boolean; mails: SaveTemplate[] }>(res);
      set({ savedMails: body?.mails ?? [] });
    } catch {
      set({ savedMails: undefined });
    }
  },

  async fetchBlueprintAccounts() {
    try {
      const res = await fetch("/api/blueprints/list", { credentials: "include" });
      if (!res.ok) {
        set({ blueprintAccounts: undefined });
        return;
      }
      const body = await readJson<{ success: boolean; accounts: AccountSummary[] }>(res);
      set({ blueprintAccounts: body?.accounts ?? [] });
    } catch {
      set({ blueprintAccounts: undefined });
    }
  },

  async fetchLatestAlert() {
    try {
      const res = await fetch("/api/alert");
      const body = await readJson<{
        success: boolean;
        error?: string;
        content?: Alert;
      }>(res);
      if (!body?.success || !body.content) return;
      const latestClosedAlert = localStorage.getItem("alert");
      set({
        alert: {
          ...body.content,
          show: latestClosedAlert
            ? latestClosedAlert !== body.content.id
            : true,
        },
      });
    } catch {
      // Alert service not available
    }
  },

  init() {
    void get().fetchCurrentUser();
    void get().fetchLatestAlert();
    void get().fetchShipData();
  },
}));
