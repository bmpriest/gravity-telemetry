"use client";

import { useState } from "react";

/** JSON importer — runs the shared importer on an uploaded ships.json. */
export default function AdminImport() {
  const [fileName, setFileName] = useState("");
  const [json, setJson] = useState<unknown>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ result?: Record<string, number>; note?: string } | null>(null);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    try {
      const text = await file.text();
      setJson(JSON.parse(text));
    } catch {
      setError("That file isn't valid JSON.");
      setJson(null);
    }
  }

  async function run() {
    if (!json) { setError("Choose a ships.json file first."); return; }
    if (!confirm("Import this JSON into the live database? Existing ships are upserted by game id; their system subtrees are rebuilt.")) return;
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(json), credentials: "same-origin" });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? "Import failed."); return; }
      setResult({ result: data.result, note: data.note });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
        <strong>Note:</strong> importing here updates ship <em>data</em> only. Ship image files must be copied into{" "}
        <code>public/ships</code> manually. To import data <em>and</em> images together, run{" "}
        <code>npm run import -- output</code> from the command line instead.
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">ships.json</label>
        <input type="file" accept="application/json,.json" onChange={onFile} className="text-sm" />
        {fileName && <p className="text-xs text-neutral-500 dark:text-neutral-400">Loaded: {fileName}</p>}
      </div>

      <button type="button" onClick={run} disabled={running || !json} className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {running ? "Importing…" : "Run import"}
      </button>

      {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</p>}

      {result && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
          <p className="font-semibold">Import complete.</p>
          {result.result && (
            <ul className="mt-1 list-inside list-disc">
              {Object.entries(result.result).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
            </ul>
          )}
          {result.note && <p className="mt-2 text-xs">{result.note}</p>}
        </div>
      )}
    </div>
  );
}
