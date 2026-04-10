"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export interface AttributeRow {
  name: string;
  description: string;
  usageCount: number;
}

export default function AttributesManager({ initial }: { initial: AttributeRow[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (busy || !newName || !newDescription) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/attributes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDescription }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!body?.success) {
      setError(body?.error ?? "Create failed");
      return;
    }
    setNewName("");
    setNewDescription("");
    router.refresh();
  }

  async function onSaveEdit() {
    if (busy || editing === null) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/attributes/${encodeURIComponent(editing)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: editDesc }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!body?.success) {
      setError(body?.error ?? "Update failed");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function onDelete(name: string) {
    if (busy) return;
    if (!confirm(`Delete attribute "${name}"?`)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/attributes/${encodeURIComponent(name)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!body?.success) {
      setError(body?.error ?? "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onCreate} className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
        <h3 className="text-lg font-semibold">New attribute</h3>
        <input
          type="text"
          required
          maxLength={100}
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={inputCls}
        />
        <textarea
          required
          maxLength={2000}
          placeholder="Description"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          rows={2}
          className={inputCls}
        />
        <button
          type="submit"
          disabled={busy || !newName || !newDescription}
          className="self-start rounded-xl border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium transition duration-500 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        >
          Create
        </button>
      </form>

      {error && <p className="text-sm text-red-700 transition duration-500 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-neutral-300 bg-neutral-100/50 transition duration-500 dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-300 transition duration-500 dark:border-neutral-700">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">In use</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {initial.map((a) => (
              <tr key={a.name} className="border-b border-neutral-200 align-top transition duration-500 last:border-b-0 dark:border-neutral-800">
                <td className="px-3 py-2 font-medium">{a.name}</td>
                <td className="px-3 py-2">
                  {editing === a.name ? (
                    <textarea
                      maxLength={2000}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className={`${inputCls} w-full`}
                    />
                  ) : (
                    <span className="text-neutral-700 dark:text-neutral-300">{a.description}</span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">{a.usageCount}</td>
                <td className="px-3 py-2 text-right">
                  {editing === a.name ? (
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={onSaveEdit} disabled={busy} className="rounded-lg border border-blue-300 px-2 py-1 text-xs hover:bg-blue-100 dark:border-blue-500 dark:hover:bg-blue-900/40">Save</button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditing(a.name); setEditDesc(a.description); }}
                        className="rounded-lg border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(a.name)}
                        disabled={a.usageCount > 0 || busy}
                        className="rounded-lg border border-red-300 px-2 py-1 text-xs hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:hover:bg-red-900/40"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputCls =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition duration-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white";
