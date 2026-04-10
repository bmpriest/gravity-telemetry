/**
 * Zod schemas shared between admin client forms and API routes.
 * Mirrors the Prisma enum names (PascalCase) — DTO mapping happens in shipMapper.ts.
 */
import { z } from "zod";
import {
  ShipType,
  Manufacturer,
  Row,
  Variant,
  FighterType,
  CarrierSlot,
  ModuleSystem,
  ModuleKind,
  SubsystemKind,
  DamageType,
  WeaponTarget,
  SubsystemStatsKind,
  TargetScope,
} from "@prisma/client";

const enumValues = <T extends Record<string, string>>(e: T): [string, ...string[]] => {
  const vs = Object.values(e);
  return vs as [string, ...string[]];
};

export const shipInputSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: z.string().min(1).max(100),
    title: z.string().min(1).max(150),
    img: z.string().min(1).max(255),
    type: z.enum(enumValues(ShipType)),
    variant: z.enum(enumValues(Variant)),
    variantName: z.string().max(100),
    hasVariants: z.boolean(),
    manufacturer: z.enum(enumValues(Manufacturer)),
    row: z.enum(enumValues(Row)),
    commandPoints: z.number().int().min(0).max(10000),
    serviceLimit: z.number().int().min(0).max(10000),
    fighterType: z.enum(enumValues(FighterType)).nullable().optional(),
    fightersPerSquadron: z.number().int().min(0).max(1000).nullable().optional(),
    hangerCapacities: z
      .array(
        z.object({
          slotType: z.enum(enumValues(CarrierSlot)),
          capacity: z.number().int().min(0).max(1000),
        })
      )
      .default([]),
  })
  .refine(
    (s) => s.type !== "Fighter" || (s.fighterType !== null && s.fighterType !== undefined),
    { message: "Fighters require a fighterType", path: ["fighterType"] }
  )
  .refine(
    (s) => s.type !== "Fighter" || (s.fightersPerSquadron !== null && s.fightersPerSquadron !== undefined),
    { message: "Fighters require fightersPerSquadron", path: ["fightersPerSquadron"] }
  );

export type ShipInput = z.infer<typeof shipInputSchema>;

export const SHIP_TYPES = Object.values(ShipType);
export const MANUFACTURERS = Object.values(Manufacturer);
export const ROWS = Object.values(Row);
export const VARIANTS = Object.values(Variant);
export const FIGHTER_TYPES = Object.values(FighterType);
export const CARRIER_SLOTS = Object.values(CarrierSlot);

export function isCapitalShip(type: string): boolean {
  return (
    type === "Frigate" ||
    type === "Destroyer" ||
    type === "Cruiser" ||
    type === "Battlecruiser" ||
    type === "AuxiliaryShip" ||
    type === "Carrier" ||
    type === "Battleship"
  );
}

export function isSuperCapital(type: string): boolean {
  return (
    type === "Battlecruiser" ||
    type === "AuxiliaryShip" ||
    type === "Carrier" ||
    type === "Battleship"
  );
}

// ──────────────────────── Module schema ────────────────────────

export const moduleInputSchema = z
  .object({
    system: z.enum(enumValues(ModuleSystem)),
    kind: z.enum(enumValues(ModuleKind)),
    isDefault: z.boolean().default(false),
    img: z.string().min(1).max(255),
    name: z.string().max(100).nullable().optional(),
    hp: z.number().int().nullable().optional(),
    // weapon
    antishipDamage: z.number().int().nullable().optional(),
    antiairDamage: z.number().int().nullable().optional(),
    siegeDamage: z.number().int().nullable().optional(),
    // propulsion
    cruise: z.number().int().nullable().optional(),
    warp: z.number().int().nullable().optional(),
    // misc
    armor: z.number().int().nullable().optional(),
    extraHp: z.number().int().nullable().optional(),
    energyShield: z.number().int().nullable().optional(),
    hpRecovery: z.number().int().nullable().optional(),
    storage: z.number().int().nullable().optional(),
    sources: z.array(z.string().min(1).max(100)).default([]),
  })
  .refine((m) => m.kind === "unknown" || (m.name !== null && m.name !== undefined && m.name.length > 0), {
    message: "Known modules require a name",
    path: ["name"],
  });

export type ModuleInput = z.infer<typeof moduleInputSchema>;

export const MODULE_SYSTEMS = Object.values(ModuleSystem);
export const MODULE_KINDS = Object.values(ModuleKind);

// ──────────────────────── Subsystem schema ────────────────────────

const targetPrioritySchema = z.object({
  scope: z.enum(enumValues(TargetScope)),
  order: z.number().int().min(0),
  shipType: z.string().min(1).max(50),
});

export const subsystemInputSchema = z.object({
  kind: z.enum(enumValues(SubsystemKind)),
  count: z.number().int().min(0),
  title: z.string().min(1).max(150),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).default(0),
  // weapon-shaped
  damageType: z.enum(enumValues(DamageType)).nullable().optional(),
  weaponTarget: z.enum(enumValues(WeaponTarget)).nullable().optional(),
  lockonEfficiency: z.number().int().nullable().optional(),
  alpha: z.number().int().nullable().optional(),
  // hanger
  hangerSlot: z.string().max(100).nullable().optional(),
  capacity: z.number().int().nullable().optional(),
  repair: z.number().int().nullable().optional(),
  // stats
  statsKind: z.enum(enumValues(SubsystemStatsKind)).default("none"),
  attacksPerRoundA: z.number().int().nullable().optional(),
  attacksPerRoundB: z.number().int().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  damageFrequency: z.number().int().nullable().optional(),
  cooldown: z.number().int().nullable().optional(),
  lockOnTime: z.number().int().nullable().optional(),
  operationCountA: z.number().int().nullable().optional(),
  operationCountB: z.number().int().nullable().optional(),
  // per-scope
  antishipPosition: z.number().int().nullable().optional(),
  antishipDamage: z.number().int().nullable().optional(),
  antiairPosition: z.number().int().nullable().optional(),
  antiairDamage: z.number().int().nullable().optional(),
  siegePosition: z.number().int().nullable().optional(),
  siegeDamage: z.number().int().nullable().optional(),
  // children
  attributes: z.array(z.string().min(1).max(100)).default([]),
  priorities: z.array(targetPrioritySchema).default([]),
});

export type SubsystemInput = z.infer<typeof subsystemInputSchema>;

export const SUBSYSTEM_KINDS = Object.values(SubsystemKind);
export const DAMAGE_TYPES = Object.values(DamageType);
export const WEAPON_TARGETS = Object.values(WeaponTarget);
export const STATS_KINDS = Object.values(SubsystemStatsKind);
export const TARGET_SCOPES = Object.values(TargetScope);
