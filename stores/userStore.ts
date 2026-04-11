import { create } from "zustand";
import type { Alert, SessionUser } from "@/utils/types";
import type { AllShip } from "@/utils/ships";

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface UserState {
  isDarkMode: boolean;
  alert: Alert | undefined;

  // Auth
  user: SessionUser | undefined;
  authChecked: boolean;

  // Ship catalogue (loaded from /api/ships, server-side joined)
  shipData: AllShip[] | undefined;

  // Setters
  setIsDarkMode: (v: boolean) => void;
  setAlert: (v: Alert | undefined) => void;
  setUser: (v: SessionUser | undefined) => void;

  // Auth actions
  fetchMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string | undefined, newPassword: string) => Promise<AuthResult>;

  // Data loaders
  fetchShipData: () => Promise<void>;
  fetchLatestAlert: () => Promise<void>;
  init: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  isDarkMode: false,
  alert: undefined,
  user: undefined,
  authChecked: false,
  shipData: undefined,

  setIsDarkMode: (v) => set({ isDarkMode: v }),
  setAlert: (v) => set({ alert: v }),
  setUser: (v) => set({ user: v }),

  async fetchMe() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      const { user } = await res.json();
      set({ user: user ?? undefined, authChecked: true });
    } catch {
      set({ authChecked: true });
    }
  },

  async login(username, password) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin",
      });
      const { success, error, user } = await res.json();
      if (!success) return { ok: false, error: error ?? "Login failed." };
      set({ user, authChecked: true });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error." };
    }
  },

  async register(username, password) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin",
      });
      const { success, error, user } = await res.json();
      if (!success) return { ok: false, error: error ?? "Registration failed." };
      set({ user, authChecked: true });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error." };
    }
  },

  async logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // best-effort
    }
    set({ user: undefined });
  },

  async changePassword(oldPassword, newPassword) {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
        credentials: "same-origin",
      });
      const { success, error, user } = await res.json();
      if (!success) return { ok: false, error: error ?? "Password change failed." };
      if (user) set({ user });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error." };
    }
  },

  async fetchShipData() {
    try {
      const res = await fetch("/api/ships");
      const { data } = await res.json();
      set({ shipData: data });
    } catch {
      console.error("Failed to fetch ship data");
    }
  },

  async fetchLatestAlert() {
    try {
      const res = await fetch("/api/alert");
      const { success, error, content } = await res.json();
      if (!success && error) return console.error(error);
      if (success && content) {
        const latestClosedAlert = localStorage.getItem("alert");
        set({
          alert: {
            ...content,
            show: latestClosedAlert ? latestClosedAlert !== content.id : true,
          },
        });
      }
    } catch {
      // Alert service not available
    }
  },

  init() {
    // Hydrate the theme flag from localStorage so the React store matches the
    // class the inline script in app/layout.tsx already wrote to <html> before
    // first paint. The toggle in UserMenuButton then has a correct starting
    // value to flip from.
    if (typeof window !== "undefined") {
      try {
        set({ isDarkMode: localStorage.getItem("theme") === "dark" });
      } catch {
        // localStorage unavailable (privacy mode) — leave the default and move on.
      }
    }
    void get().fetchMe();
    void get().fetchLatestAlert();
    void get().fetchShipData();
  },
}));
