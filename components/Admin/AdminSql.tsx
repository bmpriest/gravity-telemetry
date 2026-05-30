"use client";

import { useState } from "react";

const EXAMPLES = [
  `SELECT type, count(*) FROM "Ship" GROUP BY type ORDER BY count DESC`,
  `SELECT "shortName", "commandPoints", "dpmAntiShip" FROM "Ship" WHERE type = 'Battleship' ORDER BY "dpmAntiShip" DESC`,
  `SELECT s.code, s.name, s."dpmAntiShip" FROM "System" s JOIN "Ship" sh ON sh.id = s."shipId" WHERE sh."shortName" = 'Warspite' ORDER BY s.index`,
];

/** Read-only SQL view for rudimentary data analysis. */
export default function AdminSql() {
  const [sql, setSql] = useState(EXAMPLES[0]);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/admin/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sql }), credentials: "same-origin" });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? "Query failed."); setRows([]); setColumns([]); return; }
      setColumns(data.columns);
      setRows(data.rows);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Read-only — only a single <code>SELECT</code> / <code>WITH</code> statement is allowed (max 1000 rows). Table names are case-sensitive and quoted, e.g. <code>&quot;Ship&quot;</code>.
      </p>
      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        rows={5}
        spellCheck={false}
        className="w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3 font-mono text-sm outline-none dark:border-neutral-600 dark:bg-neutral-950"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={run} disabled={running} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{running ? "Running…" : "Run query"}</button>
        {EXAMPLES.map((ex, i) => (
          <button key={i} type="button" onClick={() => setSql(ex)} className="rounded-lg bg-neutral-100 px-2 py-1 text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700">Example {i + 1}</button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</p>}

      {columns.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 dark:bg-neutral-800">
              <tr>{columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-neutral-200 dark:border-neutral-700">
                  {columns.map((c) => <td key={c} className="whitespace-nowrap px-3 py-1.5">{r[c] === null || r[c] === undefined ? "—" : String(r[c])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {columns.length > 0 && <p className="text-xs text-neutral-500 dark:text-neutral-400">{rows.length} rows.</p>}
    </div>
  );
}
