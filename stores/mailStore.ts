import { create } from "zustand";
import type { SaveTemplate } from "@/utils/types";

/**
 * Saved mail (Quill template) store. Logged-in users get the server's view via
 * /api/mail; anonymous users get an in-memory list (we don't persist mails to
 * localStorage — they're long enough to bloat the quota and have always been
 * an "account feature" historically).
 */

interface MailState {
  mails: SaveTemplate[] | undefined;
  loaded: boolean;
  syncedWithServer: boolean;

  fetchFromServer: () => Promise<void>;
  saveMail: (template: { name: string; ops: SaveTemplate["ops"] }) => Promise<{ ok: boolean; saved?: SaveTemplate; error?: string }>;
  deleteMail: (id: string) => Promise<{ ok: boolean; error?: string }>;
  getMail: (id: string) => Promise<SaveTemplate | undefined>;
  reset: () => void;
}

export const useMailStore = create<MailState>((set, get) => ({
  mails: undefined,
  loaded: false,
  syncedWithServer: false,

  async fetchFromServer() {
    try {
      const res = await fetch("/api/mail", { credentials: "same-origin" });
      const { success, data } = await res.json();
      if (success && Array.isArray(data)) set({ mails: data, loaded: true, syncedWithServer: true });
      else set({ mails: [], loaded: true });
    } catch (e) {
      console.error("Failed to fetch mails", e);
      set({ mails: [], loaded: true });
    }
  },

  async saveMail(template) {
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
        credentials: "same-origin",
      });
      const { success, error, data, saved } = await res.json();
      if (!success) return { ok: false, error: error ?? "Save failed." };
      if (Array.isArray(data)) set({ mails: data, loaded: true, syncedWithServer: true });
      return { ok: true, saved };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error." };
    }
  },

  async deleteMail(id) {
    try {
      const res = await fetch(`/api/mail/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const { success, error } = await res.json();
      if (!success) return { ok: false, error: error ?? "Delete failed." };
      set({ mails: (get().mails ?? []).filter((m) => m.id !== id) });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error." };
    }
  },

  async getMail(id) {
    // First try the in-memory list (avoids a round trip on a list-then-edit
    // navigation). Fall back to a single fetch if it isn't loaded yet.
    const cached = get().mails?.find((m) => m.id === id);
    if (cached) return cached;
    try {
      const res = await fetch(`/api/mail/${encodeURIComponent(id)}`, { credentials: "same-origin" });
      const { success, data } = await res.json();
      if (success && data) return data as SaveTemplate;
    } catch (e) {
      console.error("Failed to fetch mail", e);
    }
    return undefined;
  },

  reset() {
    set({ mails: undefined, loaded: false, syncedWithServer: false });
  },
}));
