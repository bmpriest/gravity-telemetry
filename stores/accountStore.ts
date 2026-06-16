import { create } from "zustand";
import { useBlueprintStore, type BlueprintAccountDTO } from "./blueprintStore";
import { useFleetStore } from "./fleetStore";

/**
 * Global "active account" store. Players commonly run several game accounts and
 * track each one's unlocks/fleets separately, so a single account selection is
 * surfaced in the navbar and shared across the Blueprint Tracker and Fleet
 * Builder.
 *
 * This store deliberately holds *only* the active selection — the account
 * registry itself lives in `blueprintStore.accounts` (the canonical source of
 * names + indices, server-backed when logged in). The mutating actions here
 * orchestrate the blueprint and fleet stores so the two stay in lockstep. The
 * shared identity across stores is `accountIndex` (0–9): it's the only key
 * available in both anonymous (localStorage, no DB id) and logged-in modes.
 */

const STORAGE_KEY = "activeAccountIndex";

/** Name shown for the implicit account a brand-new user starts with. */
export const DEFAULT_ACCOUNT_NAME = "Account 1";

/** Same cap the Blueprint Tracker has always enforced. */
export const MAX_ACCOUNTS = 10;

/**
 * The list every account-aware surface should render. When no blueprint account
 * has been persisted yet (fresh anonymous user), we present a single synthetic
 * default at index 0 so the switcher always shows something and fleets created
 * before the first blueprint save still have a home.
 */
export function withDefaultAccount(
  accounts: BlueprintAccountDTO[],
): { accountIndex: number; accountName: string }[] {
  if (accounts.length === 0) return [{ accountIndex: 0, accountName: DEFAULT_ACCOUNT_NAME }];
  return accounts.map((a) => ({ accountIndex: a.accountIndex, accountName: a.accountName }));
}

interface AccountState {
  activeIndex: number;

  setActiveIndex: (index: number) => void;
  /** Persist a brand-new account and switch to it. Returns its index, or undefined if at the cap. */
  createAccount: (name: string) => Promise<number | undefined>;
  renameAccount: (index: number, name: string) => Promise<boolean>;
  /** Delete an account along with its fleets, keeping blueprint + fleet indices aligned. */
  deleteAccount: (index: number) => Promise<void>;

  loadFromStorage: () => void;
  /** Snap the active selection back into the range of accounts that actually exist. */
  clampToExisting: () => void;
  /** Drop back to the first account — used on logout so a selection doesn't leak between sessions. */
  reset: () => void;
}

function persist(index: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(index));
  } catch {
    // localStorage unavailable (privacy mode) — selection just won't persist.
  }
}

function accountCount(): number {
  return withDefaultAccount(useBlueprintStore.getState().accounts).length;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  activeIndex: 0,

  setActiveIndex(index) {
    const max = Math.max(0, accountCount() - 1);
    const clamped = Math.min(Math.max(0, index), max);
    persist(clamped);
    set({ activeIndex: clamped });
  },

  async createAccount(name) {
    const blueprint = useBlueprintStore.getState();
    if (blueprint.accounts.length >= MAX_ACCOUNTS) return undefined;
    const draft = blueprint.createDraftAccount(name);
    const saved = await blueprint.saveAccount(draft);
    if (!saved) return undefined;
    persist(saved.accountIndex);
    set({ activeIndex: saved.accountIndex });
    return saved.accountIndex;
  },

  async renameAccount(index, name) {
    const blueprint = useBlueprintStore.getState();
    const target = blueprint.accounts.find((a) => a.accountIndex === index);
    if (!target) return false;
    const saved = await blueprint.saveAccount({ ...target, accountName: name });
    return Boolean(saved);
  },

  async deleteAccount(index) {
    const blueprint = useBlueprintStore.getState();
    // Synthetic default (no persisted accounts) — nothing to delete.
    if (blueprint.accounts.length === 0) return;

    // Fleets first so they reindex off the *pre-delete* layout, matching the
    // rule blueprintStore.deleteAccount applies (remove D, shift > D down by 1).
    await useFleetStore.getState().handleAccountDeleted(index);
    await blueprint.deleteAccount(index);

    // Re-point the active selection: follow the same account if it shifted,
    // otherwise clamp into whatever remains.
    const current = get().activeIndex;
    const next = current > index ? current - 1 : current === index ? index : current;
    get().setActiveIndex(next);
  },

  loadFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw !== null ? Number(raw) : 0;
      const index = Number.isFinite(parsed) ? parsed : 0;
      const max = Math.max(0, accountCount() - 1);
      set({ activeIndex: Math.min(Math.max(0, index), max) });
    } catch {
      set({ activeIndex: 0 });
    }
  },

  clampToExisting() {
    const max = Math.max(0, accountCount() - 1);
    const clamped = Math.min(Math.max(0, get().activeIndex), max);
    if (clamped !== get().activeIndex) {
      persist(clamped);
      set({ activeIndex: clamped });
    }
  },

  reset() {
    persist(0);
    set({ activeIndex: 0 });
  },
}));

// Keep the active selection valid as the account registry changes underneath it
// — e.g. after login merges server accounts in, or an account is deleted.
if (typeof window !== "undefined") {
  useBlueprintStore.subscribe(() => {
    useAccountStore.getState().clampToExisting();
  });
}
