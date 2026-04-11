"use client";

import { useState, useEffect } from "react";

/**
 * Admin → Manufacturers tab. Curates the Manufacturer table that backs the
 * ship `manufacturerId` FK. Adding a manufacturer used to require a code
 * change + Prisma migration; this UI is the runtime equivalent.
 *
 * Delete is gated server-side: the API refuses to remove a manufacturer that
 * still has ships pointing at it (with a count in the error message), so the
 * client can show that as the failure reason directly.
 */

interface Manufacturer {
  id: number;
  name: string;
}

export default function AdminManufacturers() {
  const [items, setItems] = useState<Manufacturer[] | undefined>();
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Per-row edit state. Storing the renamed value in a map keyed by id keeps
  // the rest of the rows non-stateful while one rename is mid-flight.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function refresh() {
    setError("");
    try {
      const res = await fetch("/api/admin/manufacturers", { credentials: "same-origin" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load manufacturers.");
      setItems(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load manufacturers.");
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function createManufacturer() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Create failed.");
      setNewName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setAdding(false);
    }
  }

  function beginEdit(m: Manufacturer) {
    setEditingId(m.id);
    setEditName(m.name);
    setError("");
  }

  async function saveEdit() {
    if (editingId == null) return;
    const name = editName.trim();
    if (!name) return;
    setSavingId(editingId);
    setError("");
    try {
      const res = await fetch(`/api/admin/manufacturers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Rename failed.");
      setEditingId(null);
      setEditName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteManufacturer(m: Manufacturer) {
    if (!confirm(`Delete manufacturer "${m.name}"? This will fail if any ships still reference it.`)) return;
    setDeletingId(m.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/manufacturers/${m.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Delete failed.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">New manufacturer</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void createManufacturer(); }}
            placeholder="e.g. Test Foundry"
            className="fo-input w-full rounded-lg border-neutral-300 bg-white px-3 py-2 text-sm text-black transition duration-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => void createManufacturer()}
          disabled={adding || !newName.trim()}
          className="fo-btn rounded-lg border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800"
        >
          {adding ? "Adding…" : "+ Add"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-neutral-200 transition duration-500 dark:border-neutral-700">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 transition duration-500 dark:bg-neutral-800">
            <tr className="text-left">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!items && (
              <tr>
                <td colSpan={2} className="p-6 text-center text-neutral-500 dark:text-neutral-400">Loading…</td>
              </tr>
            )}
            {items && items.length === 0 && (
              <tr>
                <td colSpan={2} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                  No manufacturers yet.
                </td>
              </tr>
            )}
            {items?.map((m) => {
              const isEditing = editingId === m.id;
              return (
                <tr key={m.id} className="border-t border-neutral-100 transition duration-500 dark:border-neutral-800">
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                        className="fo-input w-full rounded-lg border-neutral-300 bg-white px-2 py-1 text-sm text-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                      />
                    ) : (
                      <span className="font-medium">{m.name}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={savingId === m.id}
                            onClick={() => void saveEdit()}
                            className="fo-btn rounded-lg border-blue-300 bg-blue-100 px-3 py-1 text-xs disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800"
                          >
                            {savingId === m.id ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-3 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => beginEdit(m)}
                            className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-3 py-1 text-xs hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === m.id}
                            onClick={() => void deleteManufacturer(m)}
                            className="fo-btn rounded-lg border-red-300 bg-red-100 px-3 py-1 text-xs disabled:opacity-50 hover:bg-red-200 dark:border-red-600 dark:bg-red-900 dark:hover:bg-red-800"
                          >
                            {deletingId === m.id ? "Deleting…" : "Delete"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
