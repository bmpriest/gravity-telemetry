"use client";

import { useState, useEffect, useMemo } from "react";
import type { AllShip } from "@/utils/ships";
import AdminShipForm, { type ShipFormValues } from "./AdminShipForm";

/**
 * Admin → Ships tab. Groups the catalogue by ship name (one card per name)
 * with a tab strip across the bottom for the variants that actually exist for
 * that ship. Hero variants are represented as the literal "H" tab and pick
 * up a small badge so they're visually distinct from A-D.
 *
 * Why grouped: every operational tweak the admin tool needs to support is
 * "find ship X and edit one of its variants". The previous flat row-per-
 * variant view buried that workflow under 137 rows of duplicated names.
 *
 * Supercapital ships only ever exist as a single variant in the catalogue,
 * so for groups with one entry the tab strip is suppressed entirely — no
 * point showing a single tab labelled "A".
 */

// Descending order, mirroring the blueprint tracker. shipTypes in
// utils/ships.ts is the *ascending* canonical list and drives unrelated
// column ordering elsewhere — we explicitly do not touch it. This list is
// the display order for the admin grid only.
const TYPE_DISPLAY_ORDER = [
  "Battleship",
  "Carrier",
  "Auxiliary Ship",
  "Battlecruiser",
  "Cruiser",
  "Destroyer",
  "Frigate",
  "Fighter",
  "Corvette",
] as const;

const VARIANT_ORDER = ["A", "B", "C", "D", "H"] as const;

interface ShipGroup {
  name: string;
  type: string;
  variants: AllShip[];
}

function groupShips(ships: AllShip[]): ShipGroup[] {
  const byName = new Map<string, ShipGroup>();
  for (const s of ships) {
    let group = byName.get(s.name);
    if (!group) {
      group = { name: s.name, type: s.type, variants: [] };
      byName.set(s.name, group);
    }
    group.variants.push(s);
  }

  for (const g of byName.values()) {
    g.variants.sort((a, b) => {
      const ai = VARIANT_ORDER.indexOf(a.variant);
      const bi = VARIANT_ORDER.indexOf(b.variant);
      // Unknown variants sort to the end so the canonical A-D-H ordering is
      // preserved when the catalogue grows past today's letters.
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }

  return Array.from(byName.values()).sort((a, b) => {
    const ai = TYPE_DISPLAY_ORDER.indexOf(a.type as typeof TYPE_DISPLAY_ORDER[number]);
    const bi = TYPE_DISPLAY_ORDER.indexOf(b.type as typeof TYPE_DISPLAY_ORDER[number]);
    if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.name.localeCompare(b.name);
  });
}

export default function AdminShips() {
  const [ships, setShips] = useState<AllShip[] | undefined>();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AllShip>();
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AllShip>();
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Per-group active variant. Defaults to the first variant in canonical order
  // until the user clicks a different tab.
  const [activeVariant, setActiveVariant] = useState<Record<string, string>>({});

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function refresh() {
    setError("");
    try {
      const res = await fetch("/api/ships", { credentials: "same-origin" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load ships.");
      setShips(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ships.");
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/ships/backup", { credentials: "same-origin" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Export failed.");
      
      // Accessing json.data which now contains { manufacturers, ships }
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gravity_ships_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Importing will overwrite existing ships with the same name/variant. Continue?")) return;

    setImporting(true);
    setError("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const res = await fetch("/api/admin/ships/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Import failed.");
      
      alert("Import successful!");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  useEffect(() => { void refresh(); }, []);

  const groups = useMemo(() => {
    if (!ships) return [];
    const all = groupShips(ships);
    if (!search) return all;
    const q = search.toLowerCase();
    // Match against any variant in the group so the user can search by
    // variant name and still see the rest of the family.
    return all.filter((g) =>
      g.name.toLowerCase().includes(q) ||
      g.variants.some((v) => v.title.toLowerCase().includes(q) || v.variantName.toLowerCase().includes(q)),
    );
  }, [ships, search]);

  function getActive(group: ShipGroup): AllShip {
    const chosen = activeVariant[group.name];
    return group.variants.find((v) => v.variant === chosen) ?? group.variants[0];
  }

  async function onSubmit(values: ShipFormValues) {
    const url = editing ? `/api/admin/ships/${editing.id}` : "/api/admin/ships";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      credentials: "same-origin",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Save failed.");
    setEditing(undefined);
    setCreating(false);
    await refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/ships/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Delete failed.");
      setDeleteTarget(undefined);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, title or variant..."
            className="fo-input w-full max-w-xs rounded-lg border-neutral-300 bg-white px-3 py-2 text-black transition duration-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleExport()}
              className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
            >
              {exporting ? "Exporting…" : "Export JSON"}
            </button>
            <label className="flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-medium hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600">
              {importing ? "Importing…" : "Import JSON"}
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => void handleImport(e)}
                disabled={importing}
              />
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="fo-btn rounded-lg border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        >
          + New ship
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!ships && (
        <p className="rounded-xl border border-neutral-200 p-6 text-center text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Loading…
        </p>
      )}

      {ships && groups.length === 0 && (
        <p className="rounded-xl border border-neutral-200 p-6 text-center text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No ships match.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const active = getActive(group);
          const showTabs = group.variants.length > 1;
          return (
            <div
              key={group.name}
              className="flex flex-col rounded-xl border border-neutral-200 bg-white transition duration-500 dark:border-neutral-700 dark:bg-neutral-800"
            >

              <div className="flex flex-1 items-start gap-3 p-3">
                <img src={active.img} alt="" className="h-14 w-20 shrink-0 object-contain" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate font-semibold">{active.name}</span>
                    {!showTabs && active.variant === "H" && (
                      <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-200 dark:text-orange-900">
                        Hero
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{active.title}</div>
                  <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {active.variantName ? `${active.variant} · ${active.variantName}` : active.variant}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="flex items-center gap-1">
                      <img
                        src={`/ships/classes/${active.type.toLowerCase()}.svg`}
                        alt=""
                        className="h-3 w-3 dark:invert"
                      />
                      {active.type}
                    </span>
                    <span>{active.manufacturer}</span>
                    <span>{active.row}</span>
                    <span>CP {active.commandPoints}</span>
                    <span>SL {active.serviceLimit}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 border-t border-neutral-100 p-2 dark:border-neutral-700">
              {showTabs && (
                <>
                  {group.variants.map((v) => {
                    const isActive = v.variant === active.variant;
                    const isHero = v.variant === "H";
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setActiveVariant((m) => ({ ...m, [group.name]: v.variant }))}
                        className={`fo-btn flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                          isActive
                            ? "border-blue-300 bg-blue-100 dark:border-blue-500 dark:bg-blue-800"
                            : "border-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                        }`}
                      >
                        <span>{v.variant}</span>
                        {isHero && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-200 dark:text-orange-900">
                            Hero
                          </span>
                        )}
                      </button>
                    );
                  })}
                  </>
              )}
              <button
                type="button"
                className="ml-auto fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-3 py-1 text-xs hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                onClick={() => setEditing(active)}
              >
                Edit
              </button>
              <button
                type="button"
                className="fo-btn rounded-lg border-red-300 bg-red-100 px-3 py-1 text-xs hover:bg-red-200 dark:border-red-600 dark:bg-red-900 dark:hover:bg-red-800"
                onClick={() => setDeleteTarget(active)}
              >
                Delete
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <AdminShipForm
          ship={editing}
          onCancel={() => { setEditing(undefined); setCreating(false); }}
          onSubmit={onSubmit}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed left-0 top-0 z-30 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]"
          onClick={() => setDeleteTarget(undefined)}
        >
          <div
            className="flex w-[90vw] max-w-md flex-col gap-3 rounded-2xl bg-white p-6 dark:bg-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold">
              Delete <span className="italic">{deleteTarget.name} ({deleteTarget.variant})</span>?
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              This will permanently remove the ship along with its modules, subsystems,
              and any blueprint or fleet references to it. This action is irreversible.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                onClick={() => setDeleteTarget(undefined)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                className="fo-btn rounded-lg border-red-300 bg-red-100 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-red-600 dark:bg-red-900"
                onClick={confirmDelete}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
