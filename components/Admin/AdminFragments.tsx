"use client";

import { useState, useEffect } from "react";

interface Fragment {
  id: number;
  name: string;
}

export default function AdminFragments() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Fragment | null>(null);

  useEffect(() => {
    fetchFragments();
  }, []);

  async function fetchFragments() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fragments");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setFragments(json.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch fragments:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body = editing ? { id: editing.id, name } : { name };

    try {
      const res = await fetch("/api/admin/fragments", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setName("");
        setEditing(null);
        fetchFragments();
      }
    } catch (error) {
      console.error("Failed to save fragment:", error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure? This will remove the fragment from all ships.")) return;

    try {
      const res = await fetch(`/api/admin/fragments?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchFragments();
      }
    } catch (error) {
      console.error("Failed to delete fragment:", error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <h3 className="text-lg font-bold">{editing ? "Edit Fragment" : "Add New Fragment"}</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex grow flex-col gap-1">
            <label className="text-xs font-bold uppercase text-neutral-500">Fragment Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="fo-input fo-input-bordered w-full rounded-xl"
              placeholder="e.g. Warspite Blueprint Part"
              required
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="du-btn border-blue-300 bg-blue-100 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700">
              {editing ? "Update" : "Add Fragment"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(null); setName(""); }}
                className="du-btn border-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold">Existing Fragments</h3>
        {loading ? (
          <div className="fo-loading fo-loading-spinner fo-loading-md self-center" />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {fragments.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                <span className="font-medium">{f.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditing(f); setName(f.name); }}
                    className="du-btn du-btn-sm du-btn-ghost text-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="du-btn du-btn-sm du-btn-ghost text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {fragments.length === 0 && <p className="text-neutral-500">No fragments created yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
