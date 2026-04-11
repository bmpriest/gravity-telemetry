/**
 * Shared input parsers for the admin write endpoints. Centralizing the enum
 * coercions here keeps the route handlers thin and makes sure the seed script
 * and the live admin path use the exact same vocabulary for ship/module fields.
 *
 * Inputs come from the admin form on the wire, so every helper accepts unknown
 * and throws on anything it can't normalize — never silently coerces.
 */

export type ShipTypeEnum =
  | "Fighter" | "Corvette" | "Frigate" | "Destroyer" | "Cruiser"
  | "Battlecruiser" | "AuxiliaryShip" | "Carrier" | "Battleship";

export function parseShipType(t: unknown): ShipTypeEnum {
  if (typeof t !== "string") throw new Error("type is required.");
  if (t === "Auxiliary Ship") return "AuxiliaryShip";
  if ([
    "Fighter", "Corvette", "Frigate", "Destroyer", "Cruiser",
    "Battlecruiser", "AuxiliaryShip", "Carrier", "Battleship",
  ].includes(t)) return t as ShipTypeEnum;
  throw new Error(`Unknown ship type: ${t}`);
}

// Manufacturer is now a Manufacturer table FK rather than an enum, so the
// payload carries `manufacturerId`. This helper validates the id without
// resolving it (the route handler does the existence check via Prisma so we
// can return a clean 4xx if the id is dangling).
export function parseManufacturerId(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error("manufacturerId must be a positive integer.");
  }
  return value;
}

export function parseRow(r: unknown): "Front" | "Middle" | "Back" {
  if (r === "Front" || r === "Middle" || r === "Back") return r;
  throw new Error(`Unknown row: ${r}`);
}

export function parseFighterSize(s: unknown): "Small" | "Medium" | "Large" | null {
  if (s == null || s === "") return null;
  if (s === "Small" || s === "Medium" || s === "Large") return s;
  throw new Error(`Unknown fighter size: ${s}`);
}

export function parseDamageType(d: unknown): "Projectile" | "Energy" | null {
  if (d == null || d === "") return null;
  if (d === "Projectile" || d === "Energy") return d;
  throw new Error(`Unknown damage type: ${d}`);
}

export function parseWeaponTarget(t: unknown): "Building" | "Aircraft" | "SmallShip" | "LargeShip" | null {
  if (t == null || t === "") return null;
  if (t === "Building" || t === "Aircraft") return t;
  if (t === "Small Ship" || t === "SmallShip") return "SmallShip";
  if (t === "Large Ship" || t === "LargeShip") return "LargeShip";
  throw new Error(`Unknown weapon target: ${t}`);
}

export function parseModuleKind(k: unknown): "weapon" | "propulsion" | "armor" | "unknown" {
  if (k === "weapon" || k === "propulsion" || k === "armor" || k === "unknown") return k;
  throw new Error(`Unknown module kind: ${k}`);
}

export function parseSubsystemKind(k: unknown): "weapon" | "hanger" | "misc" {
  if (k === "weapon" || k === "hanger" || k === "misc") return k;
  throw new Error(`Unknown subsystem kind: ${k}`);
}

export function asInt(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`${fieldName} must be an integer.`);
  return value;
}

export function asIntOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  throw new Error("Expected integer.");
}

export function asFloatOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error("Expected number.");
}

export function asStringOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  throw new Error("Expected string.");
}
