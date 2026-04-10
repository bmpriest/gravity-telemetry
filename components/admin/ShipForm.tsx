"use client";

import { useState, type FormEvent, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import {
  SHIP_TYPES,
  MANUFACTURERS,
  ROWS,
  VARIANTS,
  FIGHTER_TYPES,
  CARRIER_SLOTS,
  isCapitalShip,
  type ShipInput,
} from "@/lib/adminSchemas";

export interface ShipFormProps {
  initial?: ShipInput & { id: number };
}

const blank: ShipInput = {
  name: "",
  title: "",
  img: "",
  type: "Frigate",
  variant: "A",
  variantName: "",
  hasVariants: false,
  manufacturer: "JupiterIndustry",
  row: "Front",
  commandPoints: 0,
  serviceLimit: 0,
  fighterType: null,
  fightersPerSquadron: null,
  hangerCapacities: [],
};

export default function ShipForm({ initial }: ShipFormProps) {
  const router = useRouter();
  const isEdit = !!initial;
  const [form, setForm] = useState<ShipInput>(initial ?? blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ShipInput>(key: K, value: ShipInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    const url = isEdit ? `/api/admin/ships/${String(initial.id)}` : "/api/admin/ships";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => null);
    setSubmitting(false);
    if (!body?.success) {
      setError(body?.error ?? "Save failed");
      return;
    }
    if (!isEdit && body.ship?.id) {
      router.push(`/admin/ships/${String(body.ship.id)}`);
    } else {
      router.refresh();
    }
  }

  async function onDelete() {
    if (!isEdit || deleting) return;
    if (!confirm(`Delete ${form.name} (${form.variant})? This cascades to modules/subsystems.`)) return;
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/admin/ships/${String(initial.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await res.json().catch(() => null);
    setDeleting(false);
    if (!body?.success) {
      setError(body?.error ?? "Delete failed");
      return;
    }
    router.push("/admin/ships");
  }

  function addHanger() {
    const used = new Set(form.hangerCapacities.map((h) => h.slotType));
    const next = CARRIER_SLOTS.find((s) => !used.has(s));
    if (!next) return;
    set("hangerCapacities", [...form.hangerCapacities, { slotType: next, capacity: 0 }]);
  }

  function removeHanger(idx: number) {
    set(
      "hangerCapacities",
      form.hangerCapacities.filter((_, i) => i !== idx)
    );
  }

  function updateHanger(idx: number, patch: Partial<ShipInput["hangerCapacities"][number]>) {
    set(
      "hangerCapacities",
      form.hangerCapacities.map((h, i) => (i === idx ? { ...h, ...patch } : h))
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" id="name">
          <input id="name" required maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Title" id="title">
          <input id="title" required maxLength={150} value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Image path" id="img" hint="e.g. /ships/conamaraChaos_b.png">
          <div className="flex items-center gap-3">
            <input id="img" required maxLength={255} value={form.img} onChange={(e) => set("img", e.target.value)} className={`${inputCls} flex-1`} />
            <ImagePreview key={form.img} src={form.img} />
          </div>
        </Field>
        <Field label="Type" id="type">
          <select id="type" value={form.type} onChange={(e) => set("type", e.target.value as ShipInput["type"])} className={inputCls}>
            {SHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Variant" id="variant">
          <select id="variant" value={form.variant} onChange={(e) => set("variant", e.target.value as ShipInput["variant"])} className={inputCls}>
            {VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Variant name" id="variantName">
          <input id="variantName" maxLength={100} value={form.variantName} onChange={(e) => set("variantName", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Has variants" id="hasVariants">
          <input id="hasVariants" type="checkbox" checked={form.hasVariants} onChange={(e) => set("hasVariants", e.target.checked)} className="size-5" />
        </Field>
        <Field label="Manufacturer" id="manufacturer">
          <select id="manufacturer" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value as ShipInput["manufacturer"])} className={inputCls}>
            {MANUFACTURERS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Row" id="row">
          <select id="row" value={form.row} onChange={(e) => set("row", e.target.value as ShipInput["row"])} className={inputCls}>
            {ROWS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Command points" id="cp">
          <input id="cp" type="number" min={0} value={form.commandPoints} onChange={(e) => set("commandPoints", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Service limit" id="sl">
          <input id="sl" type="number" min={0} value={form.serviceLimit} onChange={(e) => set("serviceLimit", Number(e.target.value))} className={inputCls} />
        </Field>
      </section>

      {form.type === "Fighter" && (
        <section className="flex flex-col gap-4 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
          <h3 className="text-lg font-semibold">Fighter</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fighter type" id="ft">
              <select id="ft" value={form.fighterType ?? ""} onChange={(e) => set("fighterType", (e.target.value || null) as ShipInput["fighterType"])} className={inputCls}>
                <option value="">—</option>
                {FIGHTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Fighters per squadron" id="fps">
              <input id="fps" type="number" min={0} value={form.fightersPerSquadron ?? 0} onChange={(e) => set("fightersPerSquadron", Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
        </section>
      )}

      {isCapitalShip(form.type) && (
        <section className="flex flex-col gap-4 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Hanger capacities</h3>
            <button
              type="button"
              onClick={addHanger}
              disabled={form.hangerCapacities.length >= CARRIER_SLOTS.length}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-sm transition duration-500 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Add slot
            </button>
          </div>
          {form.hangerCapacities.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">No hanger slots defined.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {form.hangerCapacities.map((h, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Field label="Slot" id={`slot-${String(i)}`}>
                    <select id={`slot-${String(i)}`} value={h.slotType} onChange={(e) => updateHanger(i, { slotType: e.target.value as ShipInput["hangerCapacities"][number]["slotType"] })} className={inputCls}>
                      {CARRIER_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Capacity" id={`cap-${String(i)}`}>
                    <input id={`cap-${String(i)}`} type="number" min={0} value={h.capacity} onChange={(e) => updateHanger(i, { capacity: Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <button type="button" onClick={() => removeHanger(i)} className="rounded-lg border border-red-300 px-3 py-2 text-sm transition duration-500 hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {error && <p className="text-sm text-red-700 transition duration-500 dark:text-red-300">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="du-btn rounded-xl border-blue-300 bg-blue-100 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        >
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create ship"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="du-btn rounded-xl border-red-300 bg-red-100 transition duration-500 hover:scale-105 hover:border-red-400 hover:bg-red-200 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500 dark:bg-red-800 dark:hover:bg-red-700"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition duration-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white";

function ImagePreview({ src }: { src: string }) {
  const [errored, setErrored] = useState(false);
  function onLoad() { setErrored(false); }
  function onError(_e: SyntheticEvent<HTMLImageElement>) { setErrored(true); }
  if (!src || errored) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-400 bg-neutral-200 text-[10px] uppercase text-neutral-500 transition duration-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
        no img
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" onLoad={onLoad} onError={onError} className="h-12 w-12 shrink-0 rounded-lg border border-neutral-300 object-cover transition duration-500 dark:border-neutral-700" />;
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium transition duration-500">{label}</label>
      {children}
      {hint && <span className="text-xs text-neutral-600 transition duration-500 dark:text-neutral-400">{hint}</span>}
    </div>
  );
}
