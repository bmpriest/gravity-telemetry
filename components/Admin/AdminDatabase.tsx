"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Column {
  name: string;
  type: string;
  isList: boolean;
  required: boolean;
  isId: boolean;
}

interface TableMeta {
  model: string;
  label: string;
}

interface FetchResult {
  columns: Column[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  tables: TableMeta[];
}

const PAGE_SIZE = 25;

/** Generic, DMMF-driven editor for the ship catalogue tables. */
export default function AdminDatabase() {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [table, setTable] = useState("Ship");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/db?table=${encodeURIComponent(table)}&page=${page}&pageSize=${PAGE_SIZE}&q=${encodeURIComponent(q)}`, { credentials: "same-origin" });
      const data = (await res.json()) as FetchResult & { success: boolean; error?: string };
      if (!data.success) { setError(data.error ?? "Failed to load."); return; }
      setColumns(data.columns);
      setRows(data.rows);
      setTotal(data.total);
      if (data.tables) setTables(data.tables);
    } finally {
      setLoading(false);
    }
  }, [table, page, q]);

  useEffect(() => { void load(); }, [load]);

  const editableColumns = useMemo(() => columns.filter((c) => !c.isId), [columns]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Grid columns: id first, then boolean toggles (e.g. Ship.visible), then the
  // rest — sliced to keep the table readable. Booleans surface as inline
  // toggles so visibility is one click away.
  const displayColumns = useMemo(() => {
    const id = columns.filter((c) => c.isId);
    const bools = columns.filter((c) => c.type === "Boolean");
    const rest = columns.filter((c) => !c.isId && c.type !== "Boolean");
    return [...id, ...bools, ...rest].slice(0, 10);
  }, [columns]);

  async function save(values: Record<string, unknown>, id: number | null) {
    setError("");
    const url = id == null ? `/api/admin/db?table=${encodeURIComponent(table)}` : `/api/admin/db?table=${encodeURIComponent(table)}&id=${id}`;
    const res = await fetch(url, { method: id == null ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values), credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) { setError(data.error ?? "Save failed."); return; }
    setEditing(null);
    setCreating(false);
    void load();
  }

  async function remove(id: number) {
    if (!confirm(`Delete ${table} #${id}? This cascades to related rows.`)) return;
    const res = await fetch(`/api/admin/db?table=${encodeURIComponent(table)}&id=${id}`, { method: "DELETE", credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) { setError(data.error ?? "Delete failed."); return; }
    void load();
  }

  // Quick inline toggle for boolean columns (e.g. Ship.visible).
  async function toggleBool(row: Record<string, unknown>, col: string) {
    await save({ [col]: !row[col] }, row.id as number);
  }

  function cell(value: unknown): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "✓" : "✗";
    const s = String(value);
    return s.length > 40 ? s.slice(0, 40) + "…" : s;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* table picker */}
      <div className="flex flex-wrap gap-2">
        {tables.map((t) => (
          <button
            key={t.model}
            type="button"
            onClick={() => { setTable(t.model); setPage(1); setQ(""); }}
            className={`rounded-full px-3 py-1 text-sm font-medium transition duration-300 ${table === t.model ? "bg-blue-600 text-white" : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search text columns…"
          className="grow rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 outline-none dark:border-neutral-600"
        />
        <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">+ New {table}</button>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{total} rows</span>
      </div>

      {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</p>}

      {/* grid */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800">
            <tr>
              {displayColumns.map((c) => <th key={c.name} className="whitespace-nowrap px-3 py-2 font-semibold">{c.name}</th>)}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-neutral-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-neutral-500">No rows.</td></tr>
            ) : rows.map((row) => (
              <tr key={String(row.id)} className="border-t border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50">
                {displayColumns.map((c) => (
                  <td key={c.name} className="whitespace-nowrap px-3 py-1.5">
                    {c.type === "Boolean" && !c.isId ? (
                      <button type="button" onClick={() => toggleBool(row, c.name)} className={`rounded px-1.5 text-xs font-bold ${row[c.name] ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700"}`}>
                        {row[c.name] ? "✓" : "✗"}
                      </button>
                    ) : cell(row[c.name])}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-1.5 text-right">
                  <button type="button" onClick={() => setEditing(row)} className="mr-2 text-blue-600 hover:underline">Edit</button>
                  <button type="button" onClick={() => remove(row.id as number)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-center gap-3">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg bg-neutral-100 px-3 py-1 disabled:opacity-40 dark:bg-neutral-800">Prev</button>
        <span className="text-sm">Page {page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg bg-neutral-100 px-3 py-1 disabled:opacity-40 dark:bg-neutral-800">Next</button>
      </div>

      {(editing || creating) && (
        <RowEditor
          columns={editableColumns}
          initial={editing ?? {}}
          title={creating ? `New ${table}` : `Edit ${table} #${editing?.id}`}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={(vals) => save(vals, creating ? null : (editing!.id as number))}
        />
      )}
    </div>
  );
}

function RowEditor({ columns, initial, title, onCancel, onSave }: {
  columns: Column[];
  initial: Record<string, unknown>;
  title: string;
  onCancel: () => void;
  onSave: (values: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {};
    for (const c of columns) v[c.name] = initial[c.name] ?? (c.type === "Boolean" ? false : "");
    return v;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">{title}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {columns.map((c) => (
            <label key={c.name} className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{c.name} <span className="text-xs text-neutral-400">{c.type}{c.required ? " *" : ""}</span></span>
              {c.type === "Boolean" ? (
                <input type="checkbox" checked={!!values[c.name]} onChange={(e) => setValues((v) => ({ ...v, [c.name]: e.target.checked }))} className="size-5" />
              ) : (
                <input
                  type={c.type === "Int" || c.type === "Float" ? "number" : "text"}
                  value={values[c.name] == null ? "" : String(values[c.name])}
                  onChange={(e) => setValues((v) => ({ ...v, [c.name]: e.target.value }))}
                  className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1 outline-none dark:border-neutral-600"
                />
              )}
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg bg-neutral-200 px-4 py-2 dark:bg-neutral-700">Cancel</button>
          <button type="button" onClick={() => onSave(values)} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}
