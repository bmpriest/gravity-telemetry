"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  SUBSYSTEM_KINDS,
  DAMAGE_TYPES,
  WEAPON_TARGETS,
  STATS_KINDS,
  TARGET_SCOPES,
  type SubsystemInput,
} from "@/lib/adminSchemas";

export interface SubsystemFormProps {
  shipId: number;
  moduleId: number;
  attributes: { name: string }[];
  initial?: SubsystemInput & { id: number };
}

const blank: SubsystemInput = {
  kind: "weapon",
  count: 1,
  title: "",
  name: "",
  sortOrder: 0,
  damageType: null,
  weaponTarget: null,
  lockonEfficiency: null,
  alpha: null,
  hangerSlot: null,
  capacity: null,
  repair: null,
  statsKind: "none",
  attacksPerRoundA: null,
  attacksPerRoundB: null,
  duration: null,
  damageFrequency: null,
  cooldown: null,
  lockOnTime: null,
  operationCountA: null,
  operationCountB: null,
  antishipPosition: null,
  antishipDamage: null,
  antiairPosition: null,
  antiairDamage: null,
  siegePosition: null,
  siegeDamage: null,
  attributes: [],
  priorities: [],
};

export default function SubsystemForm({ shipId, moduleId, attributes: allAttributes, initial }: SubsystemFormProps) {
  const router = useRouter();
  const isEdit = !!initial;
  const [form, setForm] = useState<SubsystemInput>(initial ?? blank);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof SubsystemInput>(key: K, value: SubsystemInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAttribute(name: string) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.includes(name)
        ? f.attributes.filter((a) => a !== name)
        : [...f.attributes, name],
    }));
  }

  function addPriority() {
    set("priorities", [...form.priorities, { scope: "antiship", order: form.priorities.length + 1, shipType: "" }]);
  }

  function removePriority(idx: number) {
    set("priorities", form.priorities.filter((_, i) => i !== idx));
  }

  function updatePriority(idx: number, patch: Partial<SubsystemInput["priorities"][number]>) {
    set("priorities", form.priorities.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    const url = isEdit
      ? `/api/admin/subsystems/${String(initial.id)}`
      : `/api/admin/modules/${String(moduleId)}/subsystems`;
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
    if (!isEdit) {
      router.push(`/admin/ships/${String(shipId)}/modules/${String(moduleId)}`);
    } else {
      router.refresh();
    }
  }

  async function onDelete() {
    if (!isEdit || deleting) return;
    if (!confirm("Delete this subsystem?")) return;
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/admin/subsystems/${String(initial.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await res.json().catch(() => null);
    setDeleting(false);
    if (!body?.success) {
      setError(body?.error ?? "Delete failed");
      return;
    }
    router.push(`/admin/ships/${String(shipId)}/modules/${String(moduleId)}`);
  }

  const isWeaponShape = form.kind === "weapon" || form.kind === "hangerAttackUav";
  const isHanger = form.kind.startsWith("hanger");

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Kind" id="kind">
          <select id="kind" value={form.kind} onChange={(e) => set("kind", e.target.value as SubsystemInput["kind"])} className={inputCls}>
            {SUBSYSTEM_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Count" id="count"><NumberInputReq id="count" value={form.count} onChange={(v) => set("count", v)} /></Field>
        <Field label="Title" id="title">
          <input id="title" required maxLength={150} value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Name" id="name">
          <input id="name" required maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Sort order" id="sortOrder"><NumberInputReq id="sortOrder" value={form.sortOrder} onChange={(v) => set("sortOrder", v)} /></Field>
      </section>

      {isWeaponShape && (
        <section className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-300 p-4 transition duration-500 sm:grid-cols-2 dark:border-neutral-700">
          <Field label="Damage type" id="damageType">
            <select id="damageType" value={form.damageType ?? ""} onChange={(e) => set("damageType", (e.target.value || null) as SubsystemInput["damageType"])} className={inputCls}>
              <option value="">—</option>
              {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Target" id="weaponTarget">
            <select id="weaponTarget" value={form.weaponTarget ?? ""} onChange={(e) => set("weaponTarget", (e.target.value || null) as SubsystemInput["weaponTarget"])} className={inputCls}>
              <option value="">—</option>
              {WEAPON_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Lockon efficiency (%)" id="lockonEfficiency"><NumberInput id="lockonEfficiency" value={form.lockonEfficiency} onChange={(v) => set("lockonEfficiency", v)} /></Field>
          <Field label="Alpha (damage per hit)" id="alpha"><NumberInput id="alpha" value={form.alpha} onChange={(v) => set("alpha", v)} /></Field>
        </section>
      )}

      {isHanger && (
        <section className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-300 p-4 transition duration-500 sm:grid-cols-3 dark:border-neutral-700">
          <Field label="Hanger slot" id="hangerSlot">
            <input id="hangerSlot" maxLength={100} value={form.hangerSlot ?? ""} onChange={(e) => set("hangerSlot", e.target.value || null)} className={inputCls} />
          </Field>
          <Field label="Capacity" id="capacity"><NumberInput id="capacity" value={form.capacity} onChange={(v) => set("capacity", v)} /></Field>
          {form.kind === "hangerRepairUav" && (
            <Field label="Repair" id="repair"><NumberInput id="repair" value={form.repair} onChange={(v) => set("repair", v)} /></Field>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
        <h3 className="text-lg font-semibold">Stats ({form.statsKind})</h3>
        <Field label="Stats kind" id="statsKind">
          <select id="statsKind" value={form.statsKind} onChange={(e) => set("statsKind", e.target.value as SubsystemInput["statsKind"])} className={inputCls}>
            {STATS_KINDS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        {form.statsKind !== "none" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Cooldown (s)" id="cooldown"><NumberInput id="cooldown" value={form.cooldown} onChange={(v) => set("cooldown", v)} /></Field>
            <Field label="Lock-on time (s)" id="lockOnTime"><NumberInput id="lockOnTime" value={form.lockOnTime} onChange={(v) => set("lockOnTime", v)} /></Field>
            {form.statsKind === "projectile" && (
              <>
                <Field label="Attacks/round A" id="aprA"><NumberInput id="aprA" value={form.attacksPerRoundA} onChange={(v) => set("attacksPerRoundA", v)} /></Field>
                <Field label="Attacks/round B" id="aprB"><NumberInput id="aprB" value={form.attacksPerRoundB} onChange={(v) => set("attacksPerRoundB", v)} /></Field>
                <Field label="Duration (s)" id="duration"><NumberInput id="duration" value={form.duration} onChange={(v) => set("duration", v)} /></Field>
              </>
            )}
            {form.statsKind === "energy" && (
              <>
                <Field label="Duration (s)" id="duration"><NumberInput id="duration" value={form.duration} onChange={(v) => set("duration", v)} /></Field>
                <Field label="Damage frequency" id="damageFrequency"><NumberInput id="damageFrequency" value={form.damageFrequency} onChange={(v) => set("damageFrequency", v)} /></Field>
              </>
            )}
            {form.statsKind === "uav" && (
              <>
                <Field label="Duration (s)" id="duration"><NumberInput id="duration" value={form.duration} onChange={(v) => set("duration", v)} /></Field>
                <Field label="Operation count A" id="ocA"><NumberInput id="ocA" value={form.operationCountA} onChange={(v) => set("operationCountA", v)} /></Field>
                <Field label="Operation count B" id="ocB"><NumberInput id="ocB" value={form.operationCountB} onChange={(v) => set("operationCountB", v)} /></Field>
              </>
            )}
          </div>
        )}

        {(form.statsKind === "projectile" || form.statsKind === "energy") && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Antiship position" id="ap"><NumberInput id="ap" value={form.antishipPosition} onChange={(v) => set("antishipPosition", v)} /></Field>
            <Field label="Antiship damage" id="ad"><NumberInput id="ad" value={form.antishipDamage} onChange={(v) => set("antishipDamage", v)} /></Field>
            <Field label="Antiair position" id="aap"><NumberInput id="aap" value={form.antiairPosition} onChange={(v) => set("antiairPosition", v)} /></Field>
            <Field label="Antiair damage" id="aad"><NumberInput id="aad" value={form.antiairDamage} onChange={(v) => set("antiairDamage", v)} /></Field>
            <Field label="Siege position" id="sp"><NumberInput id="sp" value={form.siegePosition} onChange={(v) => set("siegePosition", v)} /></Field>
            <Field label="Siege damage" id="sd"><NumberInput id="sd" value={form.siegeDamage} onChange={(v) => set("siegeDamage", v)} /></Field>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Target priorities ({form.priorities.length})</h3>
          <button type="button" onClick={addPriority} className="rounded-lg border border-neutral-300 px-3 py-1 text-sm transition duration-500 hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800">
            Add priority
          </button>
        </div>
        {form.priorities.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No target priorities defined.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {form.priorities.map((p, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field label="Scope" id={`tp-scope-${String(i)}`}>
                  <select id={`tp-scope-${String(i)}`} value={p.scope} onChange={(e) => updatePriority(i, { scope: e.target.value as SubsystemInput["priorities"][number]["scope"] })} className={inputCls}>
                    {TARGET_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Order" id={`tp-order-${String(i)}`}>
                  <input id={`tp-order-${String(i)}`} type="number" min={0} value={p.order} onChange={(e) => updatePriority(i, { order: Number(e.target.value) })} className={inputCls} />
                </Field>
                <Field label="Ship type" id={`tp-type-${String(i)}`}>
                  <input id={`tp-type-${String(i)}`} type="text" maxLength={50} value={p.shipType} onChange={(e) => updatePriority(i, { shipType: e.target.value })} className={inputCls} />
                </Field>
                <button type="button" onClick={() => removePriority(i)} className="rounded-lg border border-red-300 px-3 py-2 text-sm transition duration-500 hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
        <h3 className="text-lg font-semibold">Attributes ({form.attributes.length})</h3>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {allAttributes.map((a) => (
            <label key={a.name} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.attributes.includes(a.name)}
                onChange={() => toggleAttribute(a.name)}
                className="size-4"
              />
              <span>{a.name}</span>
            </label>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-700 transition duration-500 dark:text-red-300">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="du-btn rounded-xl border-blue-300 bg-blue-100 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        >
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create subsystem"}
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

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium transition duration-500">{label}</label>
      {children}
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

function NumberInputReq({ id, value, onChange }: { id: string; value: number; onChange: (v: number) => void }) {
  return (
    <input
      id={id}
      type="number"
      required
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={inputCls}
    />
  );
}
