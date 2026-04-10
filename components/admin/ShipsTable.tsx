"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface ShipRow {
  id: number;
  name: string;
  variant: string;
  variantName: string;
  type: string;
  manufacturer: string;
  moduleCount: number;
}

type SortKey = "id" | "name" | "variant" | "type" | "manufacturer" | "moduleCount";
type SortDir = "asc" | "desc";

export default function ShipsTable({ ships }: { ships: ShipRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? ships.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.variantName.toLowerCase().includes(q) ||
            s.type.toLowerCase().includes(q) ||
            s.manufacturer.toLowerCase().includes(q),
        )
      : ships;
    const sorted = [...rows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [ships, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function arrow(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search by name, variant, type, manufacturer…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition duration-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
      />
      <p className="text-xs text-neutral-600 transition duration-500 dark:text-neutral-400">
        {filtered.length} of {ships.length} ships
      </p>
      <div className="overflow-x-auto rounded-2xl border border-neutral-300 bg-neutral-100/50 transition duration-500 dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-300 transition duration-500 dark:border-neutral-700">
            <tr>
              <Th onClick={() => toggleSort("id")}>ID{arrow("id")}</Th>
              <Th onClick={() => toggleSort("name")}>Name{arrow("name")}</Th>
              <Th onClick={() => toggleSort("variant")}>Variant{arrow("variant")}</Th>
              <Th onClick={() => toggleSort("type")}>Type{arrow("type")}</Th>
              <Th onClick={() => toggleSort("manufacturer")}>Manufacturer{arrow("manufacturer")}</Th>
              <Th onClick={() => toggleSort("moduleCount")}>Modules{arrow("moduleCount")}</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-neutral-200 transition duration-500 last:border-b-0 hover:bg-neutral-200/40 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                <td className="px-3 py-2 font-mono text-xs">{s.id}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/ships/${String(s.id)}`} className="font-medium text-blue-700 underline transition duration-500 dark:text-blue-300">
                    {s.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {s.variant} {s.variantName ? `· ${s.variantName}` : ""}
                </td>
                <td className="px-3 py-2">{s.type}</td>
                <td className="px-3 py-2">{s.manufacturer}</td>
                <td className="px-3 py-2 text-right tabular-nums">{s.moduleCount}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-neutral-600 transition duration-500 dark:text-neutral-400">
                  No ships match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer font-semibold transition duration-500 hover:text-blue-700 dark:hover:text-blue-300"
      >
        {children}
      </button>
    </th>
  );
}
