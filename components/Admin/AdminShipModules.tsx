"use client";

import { useState, useEffect, useCallback } from "react";
import type { Subsystem } from "@/utils/ships";

/**
 * Module + subsystem editor that hangs off the ship edit modal. Loads the
 * full module tree for one ship via GET /api/admin/ships/:id and renders an
 * expandable list of modules; each module exposes its subsystems for inline
 * edit / delete.
 *
 * Acceptance test: the CV3000's M1 module carries one Large Fighter hangar
 * (capacity 5) and one Corvette hangar (capacity 3). This editor must let an
 * admin tweak either capacity without touching code.
 *
 * Per the plan, the SubsystemTargetCategory priority lists (antiship/antiair/
 * siege ordered priorities) are read-only here — they're listed for reference
 * but full editing is deferred. Scalar fields first.
 */

// Discriminator for the four kinds the schema currently supports.
const MODULE_KINDS = ["weapon", "propulsion", "armor", "unknown"] as const;
const SUBSYSTEM_KINDS = ["weapon", "hanger", "misc"] as const;
const DAMAGE_TYPES = ["", "Projectile", "Energy"] as const;
const WEAPON_TARGETS = ["", "Building", "Aircraft", "Small Ship", "Large Ship"] as const;
// All hangar names that show up in the seeded data, grouped here for the
// dropdown so admins don't have to remember the exact spelling.
const HANGER_NAMES = [
  "Small Fighter",
  "Medium Fighter",
  "Large Fighter",
  "Corvette",
  "Area-Denial Anti-Aircraft UAV",
  "Cooperative Offensive UAV",
  "Tactical UAV",
  "Siege UAV",
  "Military UAV",
  "Guard UAV",
  "Repair UAV",
  "Spotter UAV",
  "Shield UAV",
  "Info UAV",
  "Recon UAV",
] as const;

// The mapped AllShip shape uses a discriminated union via `stats.type` /
// `subsystem.type`. We unflatten it back into DB-shaped values when an admin
// hits Edit so the form can update individual scalars.
interface RawModule {
  id: number;
  type: "known" | "unknown";
  system: string;
  img: string;
  default?: boolean;
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats?: any;
  subsystems?: Subsystem[];
}

interface ModuleFormValues {
  kind: typeof MODULE_KINDS[number];
  system: string;
  name: string;
  img: string;
  isDefault: boolean;
  isUnknown: boolean;
  hp: number | null;
  antiship: number | null;
  antiair: number | null;
  siege: number | null;
  cruise: number | null;
  warp: number | null;
  armor: number | null;
  extraHp: number | null;
  energyShield: number | null;
  hpRecovery: number | null;
  storage: number | null;
}

interface SubsystemFormValues {
  count: number;
  title: string;
  name: string;
  kind: typeof SUBSYSTEM_KINDS[number];
  damageType: string;
  target: string;
  lockonEfficiency: number | null;
  alpha: number | null;
  hanger: string;
  capacity: number | null;
  repair: number | null;
  cooldown: number | null;
  lockOnTime: number | null;
  attacksPerRoundA: number | null;
  attacksPerRoundB: number | null;
}

interface Props {
  shipId: number;
  onChange?: () => void;
}

function emptyModule(): ModuleFormValues {
  return {
    kind: "weapon",
    system: "M1",
    name: "",
    img: "",
    isDefault: false,
    isUnknown: false,
    hp: null,
    antiship: null,
    antiair: null,
    siege: null,
    cruise: null,
    warp: null,
    armor: null,
    extraHp: null,
    energyShield: null,
    hpRecovery: null,
    storage: null,
  };
}

function emptySubsystem(): SubsystemFormValues {
  return {
    count: 1,
    title: "",
    name: "",
    kind: "weapon",
    damageType: "",
    target: "",
    lockonEfficiency: null,
    alpha: null,
    hanger: "",
    capacity: null,
    repair: null,
    cooldown: null,
    lockOnTime: null,
    attacksPerRoundA: null,
    attacksPerRoundB: null,
  };
}

// Map a mapped AllShip module back into DB-shaped values for editing.
function moduleToForm(m: RawModule): ModuleFormValues {
  if (m.type === "unknown") {
    return { ...emptyModule(), system: m.system, img: m.img ?? "", isDefault: !!m.default, isUnknown: true, kind: "unknown" };
  }
  const stats = m.stats ?? {};
  const kind: typeof MODULE_KINDS[number] =
    stats.type === "weapon" ? "weapon"
    : stats.type === "propulsion" ? "propulsion"
    : stats.type === "armor" ? "armor"
    : "weapon";
  return {
    kind,
    system: m.system,
    name: m.name ?? "",
    img: m.img ?? "",
    isDefault: !!m.default,
    isUnknown: false,
    hp: stats.hp ?? null,
    antiship: stats.antiship ?? null,
    antiair: stats.antiair ?? null,
    siege: stats.siege ?? null,
    cruise: stats.cruise ?? null,
    warp: stats.warp ?? null,
    armor: stats.armor ?? null,
    // The mapper exports this as `extraHP` (uppercase HP) — un-flatten back to
    // the DB column name.
    extraHp: stats.extraHP ?? null,
    energyShield: stats.energyShield ?? null,
    hpRecovery: stats.hpRecovery ?? null,
    storage: stats.storage ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function subsystemToForm(s: any): SubsystemFormValues {
  const stats = s.stats ?? {};
  return {
    count: s.count ?? 1,
    title: s.title ?? "",
    name: s.name ?? "",
    kind: s.type ?? "misc",
    damageType: s.damageType ?? "",
    target: s.target ?? "",
    lockonEfficiency: s.lockonEfficiency ?? null,
    alpha: s.alpha ?? null,
    hanger: s.hanger ?? "",
    capacity: s.capacity ?? null,
    repair: s.repair ?? null,
    cooldown: stats.cooldown ?? null,
    lockOnTime: stats.lockOnTime ?? null,
    attacksPerRoundA: stats.attacksPerRound?.[0] ?? null,
    attacksPerRoundB: stats.attacksPerRound?.[1] ?? null,
  };
}

// API payload helpers — strip empty strings to null so the server's parsers
// don't choke on accidental "" coming from text inputs.
function moduleToPayload(v: ModuleFormValues) {
  return {
    kind: v.kind,
    system: v.system,
    name: v.name || null,
    img: v.img || null,
    isDefault: v.isDefault,
    isUnknown: v.isUnknown,
    hp: v.hp,
    antiship: v.antiship,
    antiair: v.antiair,
    siege: v.siege,
    cruise: v.cruise,
    warp: v.warp,
    armor: v.armor,
    extraHp: v.extraHp,
    energyShield: v.energyShield,
    hpRecovery: v.hpRecovery,
    storage: v.storage,
  };
}

function subsystemToPayload(v: SubsystemFormValues) {
  return {
    count: v.count,
    title: v.title,
    name: v.name,
    kind: v.kind,
    damageType: v.damageType || null,
    target: v.target || null,
    lockonEfficiency: v.lockonEfficiency,
    alpha: v.alpha,
    hanger: v.hanger || null,
    capacity: v.capacity,
    repair: v.repair,
    cooldown: v.cooldown,
    lockOnTime: v.lockOnTime,
    attacksPerRoundA: v.attacksPerRoundA,
    attacksPerRoundB: v.attacksPerRoundB,
  };
}

export default function AdminShipModules({ shipId, onChange }: Props) {
  const [modules, setModules] = useState<RawModule[] | undefined>();
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Edit state — which module/subsystem is currently being edited inline.
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleFormValues>(emptyModule);
  const [creatingModule, setCreatingModule] = useState(false);

  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subForm, setSubForm] = useState<SubsystemFormValues>(emptySubsystem);
  // Module id under which a new subsystem is being created.
  const [creatingSubForModuleId, setCreatingSubForModuleId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/admin/ships/${shipId}`, { credentials: "same-origin" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load modules.");
      // Cast: AllShip only declares modules on the supercap variant, but the
      // mapper returns the modules array on every ship that has any.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = json.data;
      setModules(Array.isArray(data?.modules) ? data.modules : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load modules.");
    }
  }, [shipId]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Index returned modules by id and id-of-subsystem for fast lookup when
  // hydrating an edit form from the existing data.
  function findSub(id: number): { mod: RawModule; sub: Subsystem } | undefined {
    if (!modules) return undefined;
    for (const m of modules) {
      const subs = m.subsystems ?? [];
      for (const s of subs) {
        if (s.id === id) return { mod: m, sub: s };
      }
    }
    return undefined;
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // -------- Module CRUD --------

  function startEditModule(m: RawModule) {
    setEditingModuleId(m.id);
    setModuleForm(moduleToForm(m));
    setCreatingModule(false);
  }

  function startCreateModule() {
    setEditingModuleId(null);
    setModuleForm(emptyModule());
    setCreatingModule(true);
  }

  async function saveModule() {
    setError("");
    try {
      if (creatingModule) {
        const res = await fetch(`/api/admin/ships/${shipId}/modules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(moduleToPayload(moduleForm)),
          credentials: "same-origin",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Create failed.");
      } else if (editingModuleId != null) {
        const res = await fetch(`/api/admin/modules/${editingModuleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(moduleToPayload(moduleForm)),
          credentials: "same-origin",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Save failed.");
      }
      setEditingModuleId(null);
      setCreatingModule(false);
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  async function deleteModule(id: number) {
    if (!confirm("Delete this module and all of its subsystems?")) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/modules/${id}`, { method: "DELETE", credentials: "same-origin" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Delete failed.");
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  // -------- Subsystem CRUD --------

  function startEditSub(subId: number) {
    const found = findSub(subId);
    if (!found) return;
    setEditingSubId(subId);
    setSubForm(subsystemToForm(found.sub));
    setCreatingSubForModuleId(null);
  }

  function startCreateSub(moduleId: number) {
    setEditingSubId(null);
    setSubForm(emptySubsystem());
    setCreatingSubForModuleId(moduleId);
  }

  async function saveSubsystem() {
    setError("");
    try {
      if (creatingSubForModuleId != null) {
        const res = await fetch(`/api/admin/modules/${creatingSubForModuleId}/subsystems`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subsystemToPayload(subForm)),
          credentials: "same-origin",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Create failed.");
      } else if (editingSubId != null) {
        const res = await fetch(`/api/admin/subsystems/${editingSubId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subsystemToPayload(subForm)),
          credentials: "same-origin",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Save failed.");
      }
      setEditingSubId(null);
      setCreatingSubForModuleId(null);
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  async function deleteSubsystem(id: number) {
    if (!confirm("Delete this subsystem?")) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/subsystems/${id}`, { method: "DELETE", credentials: "same-origin" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Delete failed.");
      await refresh();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/50">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold">Modules</h4>
        <button
          type="button"
          onClick={startCreateModule}
          className="fo-btn rounded-lg border-blue-300 bg-blue-100 px-3 py-1 text-xs font-medium hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800"
        >
          + Add module
        </button>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {!modules && <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading…</p>}

      {modules && modules.length === 0 && !creatingModule && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">No modules yet.</p>
      )}

      {creatingModule && (
        <ModuleEditor
          values={moduleForm}
          setValues={setModuleForm}
          onCancel={() => setCreatingModule(false)}
          onSave={() => void saveModule()}
          isNew
        />
      )}

      {modules?.map((m) => {
        const isEditing = editingModuleId === m.id;
        const isOpen = expanded.has(m.id);
        return (
          <div key={m.id} className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
            {isEditing ? (
              <ModuleEditor
                values={moduleForm}
                setValues={setModuleForm}
                onCancel={() => setEditingModuleId(null)}
                onSave={() => void saveModule()}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(m.id)}
                    className="fo-btn rounded-md border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-700"
                  >
                    {isOpen ? "▾" : "▸"}
                  </button>
                  <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-xs font-mono dark:bg-neutral-700">{m.system}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {m.type === "unknown" ? "unknown" : (m.stats?.type ?? "—")}
                  </span>
                  {m.name && <span className="text-sm font-medium">{m.name}</span>}
                  {m.default && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800 dark:bg-blue-200 dark:text-blue-900">default</span>}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => startEditModule(m)} className="fo-btn rounded-md border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-700">Edit</button>
                  <button type="button" onClick={() => void deleteModule(m.id)} className="fo-btn rounded-md border-red-300 bg-red-100 px-2 py-0.5 text-xs dark:border-red-600 dark:bg-red-900">Delete</button>
                </div>
              </div>
            )}

            {isOpen && !isEditing && (
              <div className="mt-3 flex flex-col gap-2 pl-4">
                {(m.subsystems ?? []).length === 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">No subsystems.</p>
                )}
                {(m.subsystems ?? []).map((s: Subsystem) => {
                  const isSubEditing = editingSubId === s.id;
                  return (
                    <div key={s.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900">
                      {isSubEditing ? (
                        <SubsystemEditor
                          values={subForm}
                          setValues={setSubForm}
                          onCancel={() => setEditingSubId(null)}
                          onSave={() => void saveSubsystem()}
                        />
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-1 items-center gap-2">
                            <span className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono dark:bg-neutral-700">×{s.count ?? 1}</span>
                            <span className="font-medium">{s.title}</span>
                            <span className="text-neutral-500 dark:text-neutral-400">{s.name}</span>
                            <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] dark:bg-neutral-700">{(s as any).type}</span>
                            {(s as any).hanger && (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800 dark:bg-blue-200 dark:text-blue-900">
                                {(s as any).hanger} total cap: {((s as any).capacity ?? 0) * (s.count ?? 0)}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => startEditSub(s.id)} className="fo-btn rounded border-neutral-300 bg-neutral-100 px-2 py-0.5 dark:border-neutral-600 dark:bg-neutral-700">Edit</button>
                            <button type="button" onClick={() => void deleteSubsystem(s.id)} className="fo-btn rounded border-red-300 bg-red-100 px-2 py-0.5 dark:border-red-600 dark:bg-red-900">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {creatingSubForModuleId === m.id ? (
                  <SubsystemEditor
                    values={subForm}
                    setValues={setSubForm}
                    onCancel={() => setCreatingSubForModuleId(null)}
                    onSave={() => void saveSubsystem()}
                    isNew
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startCreateSub(m.id)}
                    className="fo-btn self-start rounded-md border-blue-300 bg-blue-100 px-2 py-0.5 text-xs dark:border-blue-500 dark:bg-blue-800"
                  >
                    + Add subsystem
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Inline editors — kept in this file because they're tightly coupled to the
// list state and never reused elsewhere.
// ----------------------------------------------------------------------------

interface ModuleEditorProps {
  values: ModuleFormValues;
  setValues: React.Dispatch<React.SetStateAction<ModuleFormValues>>;
  onCancel: () => void;
  onSave: () => void;
  isNew?: boolean;
}

function ModuleEditor({ values, setValues, onCancel, onSave, isNew }: ModuleEditorProps) {
  function update<K extends keyof ModuleFormValues>(key: K, value: ModuleFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  const showWeapon = values.kind === "weapon";
  const showPropulsion = values.kind === "propulsion";
  const showArmor = values.kind === "armor";
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Mini label="Kind">
          <select value={values.kind} onChange={(e) => update("kind", e.target.value as ModuleFormValues["kind"])} className={miniInputCls}>
            {MODULE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Mini>
        <Mini label="System">
          <input value={values.system} onChange={(e) => update("system", e.target.value)} className={miniInputCls} />
        </Mini>
        <Mini label="Name">
          <input value={values.name} onChange={(e) => update("name", e.target.value)} className={miniInputCls} />
        </Mini>
        <Mini label="Image">
          <input value={values.img} onChange={(e) => update("img", e.target.value)} placeholder="/weapons/icons/foo.svg" className={miniInputCls} />
        </Mini>
        <Mini label="HP">
          <NumInput value={values.hp} onChange={(n) => update("hp", n)} />
        </Mini>
        <Mini label="Default?">
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={values.isDefault} onChange={(e) => update("isDefault", e.target.checked)} />
            ships with hull
          </label>
        </Mini>

        {showWeapon && (
          <>
            <Mini label="Antiship"><NumInput value={values.antiship} onChange={(n) => update("antiship", n)} /></Mini>
            <Mini label="Antiair"><NumInput value={values.antiair} onChange={(n) => update("antiair", n)} /></Mini>
            <Mini label="Siege"><NumInput value={values.siege} onChange={(n) => update("siege", n)} /></Mini>
          </>
        )}
        {showPropulsion && (
          <>
            <Mini label="Cruise"><NumInput value={values.cruise} onChange={(n) => update("cruise", n)} /></Mini>
            <Mini label="Warp"><NumInput value={values.warp} onChange={(n) => update("warp", n)} /></Mini>
          </>
        )}
        {showArmor && (
          <>
            <Mini label="Armor"><NumInput value={values.armor} onChange={(n) => update("armor", n)} /></Mini>
            <Mini label="Extra HP"><NumInput value={values.extraHp} onChange={(n) => update("extraHp", n)} /></Mini>
            <Mini label="Energy shield %"><NumInput value={values.energyShield} onChange={(n) => update("energyShield", n)} /></Mini>
            <Mini label="HP recovery"><NumInput value={values.hpRecovery} onChange={(n) => update("hpRecovery", n)} /></Mini>
            <Mini label="Storage"><NumInput value={values.storage} onChange={(n) => update("storage", n)} /></Mini>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="fo-btn rounded border-neutral-300 bg-neutral-100 px-3 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-700">Cancel</button>
        <button type="button" onClick={onSave} className="fo-btn rounded border-blue-300 bg-blue-100 px-3 py-1 text-xs dark:border-blue-500 dark:bg-blue-800">{isNew ? "Create" : "Save"}</button>
      </div>
    </div>
  );
}

interface SubsystemEditorProps {
  values: SubsystemFormValues;
  setValues: React.Dispatch<React.SetStateAction<SubsystemFormValues>>;
  onCancel: () => void;
  onSave: () => void;
  isNew?: boolean;
}

function SubsystemEditor({ values, setValues, onCancel, onSave, isNew }: SubsystemEditorProps) {
  function update<K extends keyof SubsystemFormValues>(key: K, value: SubsystemFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  const isWeapon = values.kind === "weapon";
  const isHanger = values.kind === "hanger";
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Mini label="Kind">
          <select value={values.kind} onChange={(e) => update("kind", e.target.value as SubsystemFormValues["kind"])} className={miniInputCls}>
            {SUBSYSTEM_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Mini>
        <Mini label="Count">
          <NumInput value={values.count} onChange={(n) => update("count", n ?? 1)} />
        </Mini>
        <Mini label="Title">
          <input value={values.title} onChange={(e) => update("title", e.target.value)} className={miniInputCls} />
        </Mini>
        <Mini label="Name">
          <input value={values.name} onChange={(e) => update("name", e.target.value)} className={miniInputCls} />
        </Mini>

        {isHanger && (
          <>
            <Mini label="Hanger type">
              <select value={values.hanger} onChange={(e) => update("hanger", e.target.value)} className={miniInputCls}>
                <option value="">—</option>
                {HANGER_NAMES.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Mini>
            <Mini label="Capacity">
              <NumInput value={values.capacity} onChange={(n) => update("capacity", n)} />
            </Mini>
            <Mini label="Repair (UAV only)">
              <NumInput value={values.repair} onChange={(n) => update("repair", n)} />
            </Mini>
          </>
        )}

        {(isWeapon || isHanger) && (
          <>
            <Mini label="Damage type">
              <select value={values.damageType} onChange={(e) => update("damageType", e.target.value)} className={miniInputCls}>
                {DAMAGE_TYPES.map((d) => <option key={d || "none"} value={d}>{d || "—"}</option>)}
              </select>
            </Mini>
            <Mini label="Target">
              <select value={values.target} onChange={(e) => update("target", e.target.value)} className={miniInputCls}>
                {WEAPON_TARGETS.map((t) => <option key={t || "none"} value={t}>{t || "—"}</option>)}
              </select>
            </Mini>
            <Mini label="Alpha">
              <NumInput value={values.alpha} onChange={(n) => update("alpha", n)} />
            </Mini>
            <Mini label="Lock-on %">
              <NumInput value={values.lockonEfficiency} onChange={(n) => update("lockonEfficiency", n)} />
            </Mini>
            <Mini label="Cooldown (s)">
              <NumInput value={values.cooldown} onChange={(n) => update("cooldown", n)} />
            </Mini>
            <Mini label="Lock-on time (s)">
              <NumInput value={values.lockOnTime} onChange={(n) => update("lockOnTime", n)} />
            </Mini>
            <Mini label="Attacks/round A">
              <NumInput value={values.attacksPerRoundA} onChange={(n) => update("attacksPerRoundA", n)} />
            </Mini>
            <Mini label="Attacks/round B">
              <NumInput value={values.attacksPerRoundB} onChange={(n) => update("attacksPerRoundB", n)} />
            </Mini>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="fo-btn rounded border-neutral-300 bg-neutral-100 px-3 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-700">Cancel</button>
        <button type="button" onClick={onSave} className="fo-btn rounded border-blue-300 bg-blue-100 px-3 py-1 text-xs dark:border-blue-500 dark:bg-blue-800">{isNew ? "Create" : "Save"}</button>
      </div>
    </div>
  );
}

const miniInputCls = "fo-input w-full rounded border-neutral-300 bg-white px-2 py-1 text-xs text-black dark:border-neutral-600 dark:bg-neutral-900 dark:text-white";

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function NumInput({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={miniInputCls}
    />
  );
}
