/**
 * Metadata + coercion helpers for the generic admin table editor. Rather than
 * hand-maintaining a column list per table, we read the live model shape from
 * Prisma's DMMF and expose the scalar/enum fields of a whitelisted set of
 * catalogue tables. This lets the admin panel edit "all of these values, broken
 * out by table" (ships, systems, modules, weapons, …) without bespoke forms.
 *
 * Only catalogue tables are whitelisted — auth/session/fleet/blueprint-account
 * tables are intentionally excluded from generic editing.
 */

import { Prisma } from "@prisma/client";

/** model name (as in schema.prisma) → human label, in display order. */
export const ADMIN_TABLES: { model: string; label: string }[] = [
  { model: "Ship", label: "Ships" },
  { model: "System", label: "Systems" },
  { model: "Slot", label: "Slots" },
  { model: "Module", label: "Modules" },
  { model: "Weapon", label: "Weapons" },
  { model: "TargetPriority", label: "Target Priorities" },
  { model: "TargetType", label: "Target Types" },
  { model: "ModuleEffect", label: "Module Effects" },
  { model: "CarriedCraft", label: "Carried Craft" },
  { model: "ShipHangarStat", label: "Hangar Stats" },
  { model: "ShipAffix", label: "Ship Affixes" },
  { model: "Manufacturer", label: "Manufacturers" },
  { model: "BlueprintFragment", label: "Fragments" },
  { model: "ShipFragment", label: "Ship Fragments" },
];

const WHITELIST = new Set(ADMIN_TABLES.map((t) => t.model));

export interface ColumnMeta {
  name: string;
  type: string; // "Int" | "Float" | "String" | "Boolean" | "DateTime" | enum | …
  isList: boolean;
  required: boolean;
  isId: boolean;
}

export function isAllowedTable(model: string): boolean {
  return WHITELIST.has(model);
}

/** The Prisma client accessor name (camelCase) for a model. */
export function modelAccessor(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/** Scalar + enum (non-relation, non-list) columns for a whitelisted model. */
export function getColumns(model: string): ColumnMeta[] {
  const def = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
  if (!def) return [];
  return def.fields
    .filter((f) => (f.kind === "scalar" || f.kind === "enum") && !f.isList)
    .map((f) => ({
      name: f.name,
      type: String(f.type),
      isList: f.isList,
      required: f.isRequired,
      isId: f.isId === true,
    }));
}

/** Coerce an incoming JSON value to the Prisma field's scalar type. */
export function coerceValue(value: unknown, type: string): unknown {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  switch (type) {
    case "Int":
      return typeof value === "number" ? Math.trunc(value) : parseInt(String(value), 10);
    case "Float":
      return typeof value === "number" ? value : parseFloat(String(value));
    case "Boolean":
      return value === true || value === "true" || value === 1 || value === "1";
    case "DateTime":
      return new Date(String(value));
    default:
      return String(value);
  }
}

/** Builds a clean data object from raw input limited to a model's editable columns. */
export function buildWriteData(model: string, raw: Record<string, unknown>): Record<string, unknown> {
  const cols = getColumns(model);
  const out: Record<string, unknown> = {};
  for (const col of cols) {
    if (col.isId) continue; // never write the primary key
    if (!(col.name in raw)) continue;
    const v = coerceValue(raw[col.name], col.type);
    if (v === null && col.required) continue; // don't null a required column
    out[col.name] = v;
  }
  return out;
}
