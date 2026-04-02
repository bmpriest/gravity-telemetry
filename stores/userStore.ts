import { create } from "zustand";
import type { Alert, UserData } from "@/utils/types";
import type { AllShip } from "@/utils/ships";
import type { BlueprintAllShip } from "@/utils/blueprints";

interface UserState {
  isDarkMode: boolean;
  alert: Alert | undefined;
  user: UserData | undefined;
  shipData: AllShip[] | undefined;
  shipDifficulties: Record<string, number> | undefined;

  // blueprint tracker
  blueprintsAutosave: BlueprintAllShip[] | undefined;
  hasUnsavedChanges: boolean;
  createNewAccount: boolean;
  isUnsavedAccount: boolean;

  setIsDarkMode: (v: boolean) => void;
  setAlert: (v: Alert | undefined) => void;
  setUser: (v: UserData | undefined) => void;
  setBlueprintsAutosave: (v: BlueprintAllShip[] | undefined) => void;
  setHasUnsavedChanges: (v: boolean) => void;
  setCreateNewAccount: (v: boolean) => void;
  setIsUnsavedAccount: (v: boolean) => void;

  getUser: (createUserIfFail?: boolean) => Promise<void>;
  fetchShipData: () => Promise<void>;
  fetchLatestAlert: () => Promise<void>;
  init: (createUserIfFail?: boolean) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  isDarkMode: false,
  alert: undefined,
  user: undefined,
  shipData: undefined,
  shipDifficulties: undefined,
  blueprintsAutosave: undefined,
  hasUnsavedChanges: false,
  createNewAccount: false,
  isUnsavedAccount: false,

  setIsDarkMode: (v) => set({ isDarkMode: v }),
  setAlert: (v) => set({ alert: v }),
  setUser: (v) => set({ user: v }),
  setBlueprintsAutosave: (v) => set({ blueprintsAutosave: v }),
  setHasUnsavedChanges: (v) => set({ hasUnsavedChanges: v }),
  setCreateNewAccount: (v) => set({ createNewAccount: v }),
  setIsUnsavedAccount: (v) => set({ isUnsavedAccount: v }),

  async getUser(createUserIfFail = true) {
    try {
      const uid = localStorage.getItem("uid");
      const accessToken = localStorage.getItem("token");

      if (uid && accessToken) {
        const res = await fetch("/api/users/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, accessToken, updateOrigin: false }),
        });
        const { success, error, content } = await res.json();

        if (!success && error !== "User not found.") {
          console.error(error);
          return;
        }
        if (success && content) {
          set({ user: content });
          localStorage.setItem("uid", content.uid);
          localStorage.setItem("token", content.accessToken);
          return;
        }
      }

      if (!createUserIfFail) return;

      const res = await fetch("/api/users/create", { method: "POST" });
      const { success, error, content } = await res.json();
      if (!success && error) return console.error(error);
      if (success && content) {
        set({ user: content });
        localStorage.setItem("uid", content.uid);
        localStorage.setItem("token", content.accessToken);
      }
    } catch {
      // Network not available — running in local mode
    }
  },

  async fetchShipData() {
    try {
      const res = await fetch("/api/ships");
      const { data, difficulty } = await res.json();
      set({ shipData: data, shipDifficulties: difficulty });
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

  init(createUserIfFail = true) {
    void get().getUser(createUserIfFail);
    void get().fetchLatestAlert();
    void get().fetchShipData();
  },
}));
