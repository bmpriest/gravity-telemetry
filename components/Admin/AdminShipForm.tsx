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
  const [values, setValues] = useState<ShipFormValues>(emptyForm());
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [addingManufacturer, setAddingManufacturer] = useState(false);
  const [newManufacturerName, setNewManufacturerName] = useState("");
  const [addingManufacturerLoading, setAddingManufacturerLoading] = useState(false);
  const [addingManufacturerError, setAddingManufacturerError] = useState("");

  const [uploadingImage, setUploadingImage] = useState(false);
  const [modulesExpanded, setModulesExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [mRes, iRes] = await Promise.all([
          fetch("/api/admin/manufacturers"),
          fetch("/api/admin/ships/images"),
        ]);
        const mJson = await mRes.json();
        const iJson = await iRes.json();
        
        if (mJson.success && Array.isArray(mJson.data)) {
          // Sort manufacturers: alphabetical, with "Empty" at the bottom
          const sorted = (mJson.data as Manufacturer[]).sort((a, b) => {
            if (a.name === "Empty") return 1;
            if (b.name === "Empty") return -1;
            return a.name.localeCompare(b.name);
          });
          setManufacturers(sorted);
          if (ship) setValues(fromShip(ship, sorted));
          else setValues((v) => ({ ...v, manufacturerId: sorted[0]?.id ?? null }));
        }
        if (iJson.success && Array.isArray(iJson.data)) {
          setImages(iJson.data);
        }
      } catch (e) {
        console.error("Failed to load form data", e);
      }
    }
    void load();
  }, [ship]);

  function update<K extends keyof ShipFormValues>(k: K, v: ShipFormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload: ShipFormValues = isSupercap
        ? { ...values, variant: "A", variantName: "", hasVariants: false }
        : values;
      await onSubmit(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createManufacturer() {
    const name = newManufacturerName.trim();
    if (!name) return;
    setAddingManufacturerLoading(true);
    setAddingManufacturerError("");
    try {
      const res = await fetch("/api/admin/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to add.");
      
      const newM = { id: json.id, name };
      const nextList = [...manufacturers, newM].sort((a, b) => {
        if (a.name === "Empty") return 1;
        if (b.name === "Empty") return -1;
        return a.name.localeCompare(b.name);
      });
      setManufacturers(nextList);
      update("manufacturerId", newM.id);
      setAddingManufacturer(false);
      setNewManufacturerName("");
    } catch (e) {
      setAddingManufacturerError(e instanceof Error ? e.message : "Failed to add.");
    } finally {
      setAddingManufacturerLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/ships/images", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Upload failed.");

      setImages((prev) => [...prev, json.data.path].sort());
      update("img", json.data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadingImage(false);
    }
  }

  const isSupercap = SUPERCAP_TYPES.has(values.type);
  const isFighter = values.type === "Fighter";
  const isCorvette = values.type === "Corvette";
  const canCarrySomething = !(isFighter || isCorvette || isSupercap);
  const fallbackImg = `/ships/classes/${values.type.toLowerCase()}.svg`;

  return (
    <div
      className="fixed left-0 top-0 z-30 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)] p-4"
      onClick={onCancel}
    >
      <form
        className="flex max-h-full w-full max-w-4xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 dark:bg-neutral-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <h2 className="text-xl font-bold">{ship ? `Edit ${ship.name} (${ship.variant})` : "New ship"}</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name *">
            <input
              required
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Conamara Chaos"
              className={inputCls}
            />
          </Field>
          <Field label="Title">
            <input
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. High-Speed Plasma Cruiser"
              className={inputCls}
            />
          </Field>
          <Field label="Ship type *">
            <select
              value={values.type}
              onChange={(e) => update("type", e.target.value)}
              className={inputCls}
            >
              {SHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Manufacturer *">
            <div className="flex gap-2">
              <select
                required
                value={values.manufacturerId ?? ""}
                onChange={(e) => update("manufacturerId", e.target.value === "" ? null : Number(e.target.value))}
                className={inputCls}
              >
                {manufacturers.length === 0 && <option value="">Loading…</option>}
                {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button
                type="button"
                className="fo-btn shrink-0 rounded-lg border-neutral-300 bg-neutral-100 px-3 py-2 text-xs font-medium text-black hover:text-white hover:bg-neutral-400 dark:text-white dark:border-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                onClick={() => setAddingManufacturer(true)}
              >
                +
              </button>
            </div>
          </Field>

          <Field label="Image">
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                <select
                  value={values.img}
                  onChange={(e) => update("img", e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Use fallback —</option>
                  {Array.isArray(images) && images.map((img) => (
                    <option key={img} value={img}>{img.replace("/ships/", "")}</option>
                  ))}
                </select>
                <label className="fo-btn flex cursor-pointer items-center justify-center shrink-0 rounded-lg border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-medium text-black hover:text-white hover:bg-neutral-400 dark:text-white dark:border-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600">
                  {uploadingImage ? "…" : "↑"}
                  <input
                    type="file"
                    accept=".png,.jpg,.webp"
                    className="hidden"
                    onChange={(e) => void handleImageUpload(e)}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
                  <img src={values.img || fallbackImg} alt="" className="h-full w-full object-contain" />
                </div>
                {!values.img && <span className="text-[10px] text-neutral-500">Falling back to {fallbackImg}</span>}
              </div>
            </div>
          </Field>

          <Field label="Row *">
            <select
              value={values.row}
              onChange={(e) => update("row", e.target.value)}
              className={inputCls}
            >
              {ROWS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Command points *">
            <input
              type="number"
              min={1}
              value={values.commandPoints}
              onChange={(e) => update("commandPoints", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Service limit *">
            <input
              type="number"
              min={1}
              value={values.serviceLimit}
              onChange={(e) => update("serviceLimit", Number(e.target.value))}
              className={inputCls}
            />
          </Field>

          {!isSupercap && (
            <>
              <Field label="Variant *">
                <select
                  value={values.variant}
                  onChange={(e) => update("variant", e.target.value)}
                  className={inputCls}
                >
                  {VARIANTS.map((v) => <option key={v} value={v}>{v === "H" ? "H (Hero)" : v}</option>)}
                </select>
              </Field>
              <Field label="Variant name">
                <input
                  value={values.variantName}
                  onChange={(e) => update("variantName", e.target.value)}
                  placeholder="e.g. Dual-Purpose Type"
                  className={inputCls}
                />
              </Field>
              <Field label="Family status">
                <label className="flex h-full items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.hasVariants}
                    onChange={(e) => update("hasVariants", e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 transition duration-500 dark:border-neutral-600 dark:bg-neutral-900"
                  />
                  This ship has multiple variants
                </label>
              </Field>
            </>
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
          <div className="mt-2 border-t border-neutral-100 pt-4 dark:border-neutral-700">
            {isSupercap ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setModulesExpanded(!modulesExpanded)}
                  className="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                >
                  <span>Modules & Subsystems</span>
                  <span>{modulesExpanded ? "▲" : "▼"}</span>
                </button>
                {modulesExpanded && (
                  <div className="mt-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                    <AdminShipModules shipId={ship.id} />
                  </div>
                )}
              </div>
            ) : (
              <AdminShipModules shipId={ship.id} />
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-4 py-2 text-sm font-medium text-black hover:bg-neutral-400 hover:text-white dark:text-white dark:border-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="fo-btn rounded-lg border-blue-300 bg-blue-100 px-4 py-2 text-sm font-bold text-black hover:bg-blue-400 hover:text-white disabled:opacity-50 dark:text-white dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
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
            className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-6 dark:bg-neutral-800 shadow-2xl"
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
                className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-3 py-1 text-xs font-medium text-black hover:bg-neutral-400 hover:text-white dark:text-white dark:border-neutral-600 dark:bg-neutral-700"
                onClick={() => setAddingManufacturer(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addingManufacturerLoading}
                className="fo-btn rounded-lg border-blue-300 bg-blue-100 px-3 py-1 text-xs font-bold text-black hover:bg-blue-400 hover:text-white disabled:opacity-50 dark:text-white dark:border-blue-500 dark:bg-blue-800"
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
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-neutral-600 transition duration-500 dark:text-neutral-300">{label}</span>
      {children}
    </div>
  );
}
