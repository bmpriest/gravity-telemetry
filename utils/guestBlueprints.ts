/** localStorage persistence for blueprint tracker when not signed in. */

export interface GuestAccount {
  accountName: string;
  ships: Array<{ shipId: number; techPoints: number; moduleSystems: string[] }>;
  unassignedTp: Record<string, number>;
  lastSaved: string;
}

const KEY_PREFIX = "bp_guest_account_";
const MAX_SLOTS = 10;

function key(index: number): string {
  return `${KEY_PREFIX}${index}`;
}

export function readGuestAccount(index: number): GuestAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(index));
    if (!raw) return null;
    return JSON.parse(raw) as GuestAccount;
  } catch {
    return null;
  }
}

export function writeGuestAccount(index: number, account: GuestAccount): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(index), JSON.stringify(account));
  } catch {
    // localStorage full / disabled — silently drop
  }
}

export function listGuestAccounts(): Array<{ accountIndex: number; accountName: string; lastSaved: string }> {
  if (typeof window === "undefined") return [];
  const out: Array<{ accountIndex: number; accountName: string; lastSaved: string }> = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const acc = readGuestAccount(i);
    if (acc) {
      out.push({ accountIndex: i, accountName: acc.accountName, lastSaved: acc.lastSaved });
    }
  }
  // Always provide slot 0 as a fallback so guests have somewhere to start.
  if (out.length === 0) {
    out.push({ accountIndex: 0, accountName: "Account 0", lastSaved: "" });
  }
  return out;
}
