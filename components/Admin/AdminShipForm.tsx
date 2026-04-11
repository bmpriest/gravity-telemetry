"use client";

import { useState, useEffect, FormEvent } from "react";
import type { AllShip } from "@/utils/ships";
import AdminShipModules from "./AdminShipModules";

/**
 * Create / edit modal for a Ship row. Lives in its own file because both the
 * "+ New ship" path and the per-row "Edit" path use the same shape, and we
 * want to share the field validation between them.
 *
 * Manufacturers are loaded from /api/admin/manufacturers on mount so the
 * dropdown reflects whatever the admin has added at runtime. The "+ Add new"
 * button next to the dropdown opens a tiny inline modal that POSTs a new
 * manufacturer and immediately selects it without losing the rest of the form
 * state — this used to be a code change.
 *
 * Supercapital ships do not have variants in practice. For those types we hide
 * the variant / variantName / hasVariants fields entirely and force-send
 * variant="A" + hasVariants=false to satisfy the (name, variant) unique
 * constraint without exposing the noise to the admin.
 */

interface Manufacturer { id: number; name: string }

export interface ShipFormValues {
  name: string;
  title: string;
  img: string;
  type: string;
  variant: string;
  variantName: string;
  hasVariants: boolean;
  manufacturerId: number | null;
  row: string;
  commandPoints: number;
  serviceLimit: number;
  fighterType: string | null;
  fightersPerSquadron: number | null;
  smallFighterCapacity: number | null;
  mediumFighterCapacity: number | null;
  largeFighterCapacity: number | null;
  corvetteCapacity: number | null;
}

interface Props {
  ship?: AllShip;
  onCancel: () => void;
  onSubmit: (values: ShipFormValues) => Promise<void>;
}

const SHIP_TYPES = ["Fighter", "Corvette", "Frigate", "Destroyer", "Cruiser", "Battlecruiser", "Auxiliary Ship", "Carrier", "Battleship"];
const SUPERCAP_TYPES = new Set(["Battlecruiser", "Auxiliary Ship", "Carrier", "Battleship"]);
const VARIANTS = ["A", "B", "C", "D", "H"];
const ROWS = ["Front", "Middle", "Back"];
const FIGHTER_TYPES = ["", "Small", "Medium", "Large"];

function emptyForm(): ShipFormValues {
  return {
    name: "",
    title: "",
    img: "",
    type: "Cruiser",
    variant: "A",
    variantName: "",
    hasVariants: false,
    manufacturerId: null,
    row: "Middle",
    commandPoints: 1,
    serviceLimit: 1,
    fighterType: null,
    fightersPerSquadron: null,
    smallFighterCapacity: null,
    mediumFighterCapacity: null,
    largeFighterCapacity: null,
    corvetteCapacity: null,
  };
}

function fromShip(s: AllShip, manufacturers: Manufacturer[]): ShipFormValues {
  // The discriminated union of AllShip means some fields only exist on certain
  // variants — extract via a loose cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = s as any;
  // /api/ships returns the manufacturer name, not id. Resolve back to the id
  // by looking up the loaded manufacturers list.
  const found = manufacturers.find((m) => m.name === s.manufacturer);
  return {
    name: s.name,
    title: s.title,
    img: s.img,
    type: s.type,
    variant: s.variant,
    variantName: s.variantName,
    hasVariants: s.hasVariants,
    manufacturerId: found?.id ?? null,
    row: s.row,
    commandPoints: s.commandPoints,
    serviceLimit: s.serviceLimit,
    fighterType: any.fighterType ?? null,
    fightersPerSquadron: any.fightersPerSquadron ?? null,
    smallFighterCapacity: any.smallFighterCapacity ?? null,
    mediumFighterCapacity: any.mediumFighterCapacity ?? null,
    largeFighterCapacity: any.largeFighterCapacity ?? null,
    corvetteCapacity: any.corvetteCapacity ?? null,
  };
}

export default function AdminShipForm({ ship, onCancel, onSubmit }: Props) {
  const [values, setValues] = useState<ShipFormValues>(emptyForm);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Inline "+ Add new manufacturer" modal state.
  const [addingManufacturer, setAddingManufacturer] = useState(false);
  const [newManufacturerName, setNewManufacturerName] = useState("");
  const [addingManufacturerLoading, setAddingManufacturerLoading] = useState(false);
  const [addingManufacturerError, setAddingManufacturerError] = useState("");

  // Load manufacturers and rehydrate the form once the lookup is available so
  // editing an existing ship can resolve `manufacturer` (a name) back to an id.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/manufacturers", { credentials: "same-origin" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load manufacturers.");
        if (cancelled) return;
        const list: Manufacturer[] = json.data;
        setManufacturers(list);
        // Initial form values now that we have the manufacturer list to resolve
        // the FK from the existing ship's manufacturer name.
        if (ship) {
          setValues(fromShip(ship, list));
        } else {
          setValues((v) => ({ ...v, manufacturerId: list[0]?.id ?? null }));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load manufacturers.");
      }
    }
    void load();
    return () => { cancelled = true; };
  // We re-run if the user opens the form for a different ship.
  }, [ship]);

  function update<K extends keyof ShipFormValues>(key: K, value: ShipFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function createManufacturer() {
    const name = newManufacturerName.trim();
    if (!name) {
      setAddingManufacturerError("Name is required.");
      return;
    }
    setAddingManufacturerError("");
    setAddingManufacturerLoading(true);
    try {
      const res = await fetch("/api/admin/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to create manufacturer.");
      // Re-fetch the canonical list so the dropdown stays sorted by name, then
      // select the freshly created id.
      const listRes = await fetch("/api/admin/manufacturers", { credentials: "same-origin" });
      const listJson = await listRes.json();
      if (listJson.success) setManufacturers(listJson.data);
      update("manufacturerId", json.id as number);
      setAddingManufacturer(false);
      setNewManufacturerName("");
    } catch (e) {
      setAddingManufacturerError(e instanceof Error ? e.message : "Failed to create manufacturer.");
    } finally {
      setAddingManufacturerLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (values.manufacturerId == null) {
      setError("Manufacturer is required.");
      return;
    }
    setLoading(true);
    try {
      // Force supercap variants to ("A", hasVariants:false) — those fields are
      // hidden in the UI but the unique (name, variant) constraint still needs
      // a value, and the catalogue convention is that supercaps live as the A
      // variant of a single-variant family.
      const payload: ShipFormValues = isSupercap
        ? { ...values, variant: "A", variantName: "", hasVariants: false }
        : values;
      await onSubmit(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  }

  const isFighter = values.type === "Fighter";
  const isCorvette = values.type === "Corvette";
  const isSupercap = SUPERCAP_TYPES.has(values.type);
  // Carriers and aux ships still have hanger capacity at the *ship* level for
  // anything not represented as a subsystem yet, so the capacity rows stay
  // available for everything that isn't a Fighter or Corvette.
  const canCarrySomething = !(isFighter || isCorvette);
  const fallbackImg = `/ships/classes/${values.type.toLowerCase()}.svg`;

  return (
    <div
      className="fixed left-0 top-0 z-30 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)] p-4"
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 dark:bg-neutral-800"
      >
        <h3 className="text-xl font-bold">{ship ? `Edit ${ship.name} (${ship.variant})` : "New ship"}</h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *">
            <input required value={values.name} onChange={(e) => update("name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Title">
            <input value={values.title} onChange={(e) => update("title", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Image path">
            <input
              value={values.img}
              onChange={(e) => update("img", e.target.value)}
              placeholder={fallbackImg}
              className={inputCls}
            />
            <span className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              Leave blank to fall back to the variant-A image, then to the type icon.
            </span>
          </Field>
          <Field label="Type *">
            <select value={values.type} onChange={(e) => update("type", e.target.value)} className={inputCls}>
              {SHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {!isSupercap && (
            <>
              <Field label="Variant *">
                <select value={values.variant} onChange={(e) => update("variant", e.target.value)} className={inputCls}>
                  {VARIANTS.map((v) => <option key={v} value={v}>{v === "H" ? "H (Hero)" : v}</option>)}
                </select>
              </Field>
              <Field label="Variant name">
                <input value={values.variantName} onChange={(e) => update("variantName", e.target.value)} className={inputCls} />
              </Field>
            </>
          )}
          <Field label="Manufacturer *">
            <div className="flex gap-2">
              <select
                value={values.manufacturerId ?? ""}
                onChange={(e) => update("manufacturerId", e.target.value === "" ? null : Number(e.target.value))}
                className={inputCls}
              >
                {manufacturers.length === 0 && <option value="">Loading…</option>}
                {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => { setAddingManufacturer(true); setNewManufacturerName(""); setAddingManufacturerError(""); }}
                className="fo-btn shrink-0 rounded-lg border-blue-300 bg-blue-100 px-3 py-2 text-xs font-medium text-black hover:text-white dark:text-white hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
              >
                + Add new
              </button>
            </div>
          </Field>
          <Field label="Row *">
            <select value={values.row} onChange={(e) => update("row", e.target.value)} className={inputCls}>
              {ROWS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Command points *">
            <input type="number" min={0} value={values.commandPoints} onChange={(e) => update("commandPoints", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Service limit *">
            <input type="number" min={0} value={values.serviceLimit} onChange={(e) => update("serviceLimit", Number(e.target.value))} className={inputCls} />
          </Field>
          {!isSupercap && (
            <Field label="Has variants">
              <label className="flex items-center gap-2 py-2 text-sm">
                <input type="checkbox" checked={values.hasVariants} onChange={(e) => update("hasVariants", e.target.checked)} />
                This ship has multiple variants
              </label>
            </Field>
          )}
          {isFighter && (
            <>
              <Field label="Fighter type">
                <select
                  value={values.fighterType ?? ""}
                  onChange={(e) => update("fighterType", e.target.value || null)}
                  className={inputCls}
                >
                  {FIGHTER_TYPES.map((t) => <option key={t || "none"} value={t}>{t || "—"}</option>)}
                </select>
              </Field>
              <Field label="Fighters per squadron">
                <input
                  type="number"
                  min={0}
                  value={values.fightersPerSquadron ?? ""}
                  onChange={(e) => update("fightersPerSquadron", e.target.value === "" ? null : Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </>
          )}
          {canCarrySomething && (
            <>
              <Field label="Small fighter capacity">
                <input
                  type="number"
                  min={0}
                  value={values.smallFighterCapacity ?? ""}
                  onChange={(e) => update("smallFighterCapacity", e.target.value === "" ? null : Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Medium fighter capacity">
                <input
                  type="number"
                  min={0}
                  value={values.mediumFighterCapacity ?? ""}
                  onChange={(e) => update("mediumFighterCapacity", e.target.value === "" ? null : Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Large fighter capacity">
                <input
                  type="number"
                  min={0}
                  value={values.largeFighterCapacity ?? ""}
                  onChange={(e) => update("largeFighterCapacity", e.target.value === "" ? null : Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Corvette capacity">
                <input
                  type="number"
                  min={0}
                  value={values.corvetteCapacity ?? ""}
                  onChange={(e) => update("corvetteCapacity", e.target.value === "" ? null : Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </>
          )}
        </div>

        {/* Module + subsystem editor — only meaningful for an already-saved ship,
            so we hide it on the "+ New ship" path. After the first save the
            ship will have an id and the next open-Edit cycle exposes this. */}
        {ship && (
          <div className="mt-2">
            <AdminShipModules shipId={ship.id} />
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-4 py-2 text-sm text-black hover:text-white dark:text-white dark:border-neutral-600 dark:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="fo-btn rounded-lg border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium text-black hover:text-white disabled:opacity-50 dark:text-white dark:border-blue-500 dark:bg-blue-800"
          >
            {loading ? "Saving…" : ship ? "Save changes" : "Create ship"}
          </button>
        </div>
      </form>

      {/* Inline "+ Add new manufacturer" modal — sits inside the ship form modal
          so cancelling it leaves the partially-filled form intact behind. */}
      {addingManufacturer && (
        <div
          className="fixed left-0 top-0 z-40 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)] p-4"
          onClick={() => setAddingManufacturer(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-6 dark:bg-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold">New manufacturer</h4>
            <input
              autoFocus
              value={newManufacturerName}
              onChange={(e) => setNewManufacturerName(e.target.value)}
              placeholder="e.g. Test Foundry"
              className={inputCls}
              onKeyDown={(e) => { if (e.key === "Enter") void createManufacturer(); }}
            />
            {addingManufacturerError && (
              <p className="text-xs text-red-600 dark:text-red-400">{addingManufacturerError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-3 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-700"
                onClick={() => setAddingManufacturer(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addingManufacturerLoading}
                className="fo-btn rounded-lg border-blue-300 bg-blue-100 px-3 py-1 text-xs font-medium disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800"
                onClick={() => void createManufacturer()}
              >
                {addingManufacturerLoading ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "fo-input w-full rounded-lg border-neutral-300 bg-white px-3 py-2 text-sm text-black transition duration-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-neutral-600 transition duration-500 dark:text-neutral-300">{label}</span>
      {children}
    </label>
  );
}
