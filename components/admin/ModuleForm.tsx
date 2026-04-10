"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MODULE_SYSTEMS,
  MODULE_KINDS,
  type ModuleInput,
} from "@/lib/adminSchemas";

export interface ModuleFormProps {
  shipId: number;
  initial?: ModuleInput & { id: number };
}

const blank: ModuleInput = {
  system: "M1",
  kind: "weapon",
  isDefault: false,
  img: "",
  name: "",
  hp: null,
  antishipDamage: null,
  antiairDamage: null,
  siegeDamage: null,
  cruise: null,
  warp: null,
  armor: null,
  extraHp: null,
  energyShield: null,
  hpRecovery: null,
  storage: null,
  sources: [],
};

export default function ModuleForm({ shipId, initial }: ModuleFormProps) {
  const router = useRouter();
  const isEdit = !!initial;
  const [form, setForm] = useState<ModuleInput>(initial ?? blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ModuleInput>(key: K, value: ModuleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    const url = isEdit
      ? `/api/admin/modules/${String(initial.id)}`
      : `/api/admin/ships/${String(shipId)}/modules`;
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
    if (!isEdit && body.module?.id) {
      router.push(`/admin/ships/${String(shipId)}/modules/${String(body.module.id)}`);
    } else {
      router.refresh();
    }
  }

  async function onDelete() {
    if (!isEdit || deleting) return;
    if (!confirm("Delete this module? This cascades to subsystems.")) return;
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/admin/modules/${String(initial.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await res.json().catch(() => null);
    setDeleting(false);
    if (!body?.success) {
      setError(body?.error ?? "Delete failed");
      return;
    }
    router.push(`/admin/ships/${String(shipId)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="System" id="system">
          <select id="system" value={form.system} onChange={(e) => set("system", e.target.value as ModuleInput["system"])} className={inputCls}>
            {MODULE_SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Kind" id="kind">
          <select id="kind" value={form.kind} onChange={(e) => set("kind", e.target.value as ModuleInput["kind"])} className={inputCls}>
            {MODULE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Image path" id="img">
          <input id="img" required maxLength={255} value={form.img} onChange={(e) => set("img", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Default module" id="isDefault">
          <input id="isDefault" type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="size-5" />
        </Field>
        {form.kind !== "unknown" && (
          <>
            <Field label="Name" id="name">
              <input id="name" required maxLength={100} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="HP" id="hp">
              <NumberInput id="hp" value={form.hp} onChange={(v) => set("hp", v)} />
            </Field>
          </>
        )}
      </section>

      {form.kind === "weapon" && (
        <section className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-300 p-4 transition duration-500 sm:grid-cols-3 dark:border-neutral-700">
          <Field label="Antiship damage" id="antishipDamage"><NumberInput id="antishipDamage" value={form.antishipDamage} onChange={(v) => set("antishipDamage", v)} /></Field>
          <Field label="Antiair damage" id="antiairDamage"><NumberInput id="antiairDamage" value={form.antiairDamage} onChange={(v) => set("antiairDamage", v)} /></Field>
          <Field label="Siege damage" id="siegeDamage"><NumberInput id="siegeDamage" value={form.siegeDamage} onChange={(v) => set("siegeDamage", v)} /></Field>
        </section>
      )}

      {form.kind === "propulsion" && (
        <section className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-300 p-4 transition duration-500 sm:grid-cols-2 dark:border-neutral-700">
          <Field label="Cruise" id="cruise"><NumberInput id="cruise" value={form.cruise} onChange={(v) => set("cruise", v)} /></Field>
          <Field label="Warp" id="warp"><NumberInput id="warp" value={form.warp} onChange={(v) => set("warp", v)} /></Field>
        </section>
      )}

      {form.kind === "misc" && (
        <section className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-300 p-4 transition duration-500 sm:grid-cols-3 dark:border-neutral-700">
          <Field label="Armor" id="armor"><NumberInput id="armor" value={form.armor} onChange={(v) => set("armor", v)} /></Field>
          <Field label="Extra HP" id="extraHp"><NumberInput id="extraHp" value={form.extraHp} onChange={(v) => set("extraHp", v)} /></Field>
          <Field label="Energy shield %" id="energyShield"><NumberInput id="energyShield" value={form.energyShield} onChange={(v) => set("energyShield", v)} /></Field>
          <Field label="HP recovery" id="hpRecovery"><NumberInput id="hpRecovery" value={form.hpRecovery} onChange={(v) => set("hpRecovery", v)} /></Field>
          <Field label="Storage" id="storage"><NumberInput id="storage" value={form.storage} onChange={(v) => set("storage", v)} /></Field>
        </section>
      )}

      {form.kind !== "unknown" && (
        <section className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
          <h3 className="text-lg font-semibold">Sourced from</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Comma-separated list of contributor names</p>
          <input
            type="text"
            value={form.sources.join(", ")}
            onChange={(e) => set("sources", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            className={inputCls}
          />
        </section>
      )}

      {error && <p className="text-sm text-red-700 transition duration-500 dark:text-red-300">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="du-btn rounded-xl border-blue-300 bg-blue-100 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        >
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create module"}
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

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium transition duration-500">{label}</label>
      {children}
      {hint && <span className="text-xs text-neutral-600 transition duration-500 dark:text-neutral-400">{hint}</span>}
    </div>
  );
}

function NumberInput({ id, value, onChange }: { id: string; value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <input
      id={id}
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={inputCls}
    />
  );
}
