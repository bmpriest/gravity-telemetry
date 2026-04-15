// Manufacturer was a closed string union when manufacturers lived in a Prisma
// enum. With the move to a Manufacturer table they're admin-editable, so the
// type is now an open string. The `manufacturers` constant is no longer
// authoritative — fetch the live list from `/api/admin/manufacturers` (admin)
// or accept whatever name comes back from `/api/ships`.
export type ManufacturerOption = string;

export interface Ship {
  id: number;

  /** Name of the ship, as shown ingame.
   * @example "Conamara Chaos"
   */
  name: string;

  /** Title of the ship, shown next to the name.
   * @example "High-Speed Plasma Cruiser"
   */
  title: string;

  /** Image of the ship, found in `/public/ships`.
   *
   * Format: `shipName_variant.png`
   * @example "/ships/conamaraChaos_b.png"
   */
  img: string;

  /** A-D are normal variants; "H" identifies a Hero variant. The DB column is
   *  String so the admin form can introduce new variant letters without a
   *  schema change, but in practice only A-D and H are in use. */
  variant: "A" | "B" | "C" | "D" | "H";

  /** Name of the variant, shown next to the variant letter.
   * @example "Plasma Type"
   */
  variantName: string;

  /** Whether or not the ship has other variants. */
  hasVariants: boolean;
  manufacturer: ManufacturerOption;
  row: "Front" | "Middle" | "Back";
  commandPoints: number;
  serviceLimit: number;
}

export interface Fighter extends Ship {
  type: "Fighter";
  fighterType: "Small" | "Medium" | "Large";
  /** Number of fighters per unit. */
  fightersPerSquadron: number;
  dualPurpose: boolean;
}

export interface Corvette extends Ship {
  type: "Corvette";
}

export interface CapitalShip extends Ship {
  type: "Frigate" | "Destroyer" | "Cruiser";
}

export interface MediumFighterCapitalShip extends CapitalShip {
  /** Number of medium fighters held. */
  mediumFighterCapacity: number;
  onlyCarriesDualPurpose: boolean;
}

export interface LargeFighterCapitalShip extends CapitalShip {
  /** Number of large fighters held. */
  largeFighterCapacity: number;
  onlyCarriesDualPurpose: boolean;
}

export interface CorvetteCapitalShip extends CapitalShip {
  /** Number of corvettes held. */
  corvetteCapacity: number;
  onlyCarriesDualPurpose?: boolean;
}

export const attributes = {
  "Interception Capability": "Has a chance to intercept missiles or torpedoes that target friendly ship in the same row",
  "Interception Capability (Fleet)": "Has a chance to intercept missiles or torpedoes that target any friendly ships in the fleet",
  Crit: "Has a chance to deal additional Crit damage to the target",
  "Anti-Aircraft Counterattack":
    "When not under attack by aerial targets, it can strike at opposing air targets targetting same-row friendly ships. Can quickly counterattack aerial targets that strike this ship. During the counterattack, increases Hit Rate by an additional amount",
  "Anti-Aircraft Support": "Can provide anti-aircraft support to all friendly ships",
  "Anti-Aircraft Special Ammo": "Switches to Special Ammo when striking an aircraft target, increasing the Damage Per Hit by an additional amount",
  "Anti-Aircraft Lightweight Ammo": "Switches to Lightweight Ammo to trade for mobility when striking an aircraft, reducing the Damage Per hit by an additional amount",
  "Anti-Aircraft Cycle": "The weapon's operating efficiency is increased when striking an aircraft target, reducing the CD by an additional amount",
  "Anti-Aircraft High-Speed Strike": "Utilizes the High-Speed Strike mode when striking an aircraft target, reducing the duration of the strikes by an additional amount",
  "Ship Calibration Support": "Increase the Hit Rate of the target ship by 20%",

  "Anti-Aircraft Critical Strike": "Has a 25% chance to deal an additional 100% Crit Damage to aircraft",
  "Increase Energy Weapon Damage": "Increases the damage of the ship's energy weapon by 10%",
  "Reduce System Crit Damage Taken": "Reduces Crit Damage taken by all systems by 15%",
  "Ship Shielding Support": "Initiate Shielding Support to the target and increase the Evasion of the target ship to energy weapons by 15%",
  "Energy Damage Reduction": "Reduces the Damage taken from energy weapon attacks by 15%",
  "Damage Resistance": "During the duration of the module operation, initiate Calibration Support to the target, redirecting some aircraft firepower from the locked target ship toward itself",
  "Damage Resistance II":
    "During the duration of the module operation, initiate Calibration Support to the target, redirecting some missile/torpedo firepower from the locked target ship toward itself",
  "Evasive Counterattack": "When attacked, there is a chance to deal an additional counterattack on the target",
  "Physical Damage Reduction": "Reduces the Damage taken from projectile weapon attacks by 15%",
  "Crit Damage Reduction": "Reduces Crit Damage received by 30%",
  "Increase Hit Rate": "Increases the Hit Rate of all weapons on the ship by 5%",
  "Increase Ion Damage": "Increases the damage of the ship's ion weapon by 25%",
  "Additional HP Auto-Repair": "Automatically repairs the damaged portion of additional HP after each battle",
  "Reduce Evasion": "Reduce ship evasion by 10%",
  "Reduce Hit Rate": "Reduces the Hit Rate of the primary weapon by 5%",
  "Oscillatory Excitation": "Triggers one of the onboard weapons to initiate an extra shot every 6 seconds",
  "Collaborative Calibration": "Calibrates the fire control of an onboard weapon once every 15s, increasing the Hit Rate by 30% for 15s",
  "Self-holding Capability": "Provides self-held command points for the auxiliary ship",
  "Increase Production Speed": "Increases Shipbuilding speed of the auxiliary ship",
  "Back-Row Torpedo Hit Evasion": "+8% torpedo evasion to back-row ships in the fleet",
  "Back-Row Missile Hit Evasion": "+8% missile evasion to back-row ships in the fleet",
  "Increase Back-Row Torpedo Hit Rate": "Raise torpedo weapon Hit Rate of back-row ships in the fleet by 12%",
  "Increase Back-Row Missile Hit Rate": "Raise missile weapon Hit Rate of back-row ships in the fleet by 12%",
  "Ship Disguise": "When itself is selected as an attack target, it will be mislabeled as a carrier by the enemy",
  "Increase Repair Speed": "When using the auxiliary ship to conduct repairs, increases the repair speed by 20%",
  "Increase Aircraft Damage": "Increases primary weapon Damage of carried Antonios aircraft by 15%",
  "Increase Aircraft Hit Rate": "Increases primary weapon Hit Rate of carried Antonios aircraft by 15%",
  "Aircraft Recovery": "Aircraft returning to all hangers recover 10% HP",
  "Attack Against Systems": "Has a chance to deal damage to the target's systems (Primary Weapon System: Low efficiency)",
  "Firepower Recon Support": "Increases allies' primary weapon's Crit Chance by 30% and Crit Damage by 40%",
  "UAV Cooperation": "Each aircraft in the same hanger comes with a UAV. Tthe UAV and the aircraft will attack the same target together.",
  "UAV Aerial Cover Support": "Each aircraft in the same hanger comes with a UAV. The UAV provides anti-aircraft support and strikes back at enemy aircraft that attack the supporting aircraft."
};

export interface Subsystem {
  id: number;
  count: number;
  title: string;
  name: string;
  attributes: (keyof typeof attributes)[] | null;
}

interface SubsystemStats {
  targetPriority: {
    antiship?: {
      /** If antiship appears above antiair, position = 0
       *
       * If antiship appears below antiair, position = 1
       */
      position: number;
      /** Antiship target priority represented as [order, type]
       * @example "01 Corvette" = [1, "Corvette"]
       * @example "02 Cruiser" = [2, "Cruiser"]
       */
      priorities: [number, "Frigate" | "Destroyer" | "Cruiser" | "Battlecruiser" | "Auxiliary Ship" | "Carrier" | "Battleship"][];
      damage: number;
    };
    antiair?: {
      /** If antiship appears above antiair, position = 0
       *
       * If antiship appears below antiair, position = 1
       */
      position: number;
      /** Antiship target priority represented as [order, type]
       * @example "01 Corvette" = [1, "Corvette"]
       * @example "02 Cruiser" = [2, "Cruiser"]
       */
      priorities: [number, "Fighter" | "Corvette" | "Landing Ship"][];
      damage: number;
    };
    siege?: {
      /** If antiship appears above antiair, position = 0
       *
       * If antiship appears below antiair, position = 1
       */
      position: number;
      damage: number;
    };
  };
  /** Cooldown in seconds */
  cooldown: number;
  /** Lock-on time in seconds */
  lockOnTime: number;
}

interface ProjectileSubsystemStats extends SubsystemStats {
  /** Attacks per round (A x B) represented as [A, B]
   * @example "2 x 1" = [2, 1]
   */
  attacksPerRound: [number, number];
  /** Duration in seconds */
  duration?: number;
}

interface EnergySubsystemStats extends SubsystemStats {
  /** Duration in seconds */
  duration: number;
  damageFrequency: number;
}

interface UavSubsystemStats {
  /** Target priority represented as [order, type]
   * @example "01 Corvette" = [1, "Corvette"]
   * @example "02 Cruiser" = [2, "Cruiser"]
   */
  targetPriority: [number, "Fighter" | "Corvette" | "Frigate" | "Destroyer" | "Cruiser" | "Battlecruiser" | "Auxiliary Ship" | "Carrier" | "Battleship"][];
  /** Duration in seconds */
  duration: number;
  /** Cooldown in seconds */
  cooldown: number;
  /** Lock-on time in seconds */
  lockOnTime: number;
  /** Operation count (A x B) represented as [A, B]
   * @example "2 x 1" = [2, 1]
   */
  operationCount: [number, number];
}

export interface WeaponSubsystem extends Subsystem {
  type: "weapon";
  damageType: "Projectile" | "Energy";
  target: "Building" | "Aircraft" | "Small Ship" | "Large Ship";
  /** Percentage represented as a number between 0 and 100 */
  lockonEfficiency: number | null;
  /** Alpha damage (damage per hit) */
  alpha: number;
  stats: ProjectileSubsystemStats | EnergySubsystemStats | null;
}

export interface AircraftSubsystem extends Subsystem {
  type: "hanger";
  hanger: "Small Fighter" | "Medium Fighter" | "Large Fighter" | "Corvette";
  capacity: number;
  onlyCarriesDualPurpose?: boolean;
}

export interface MiscSubsytem extends Subsystem {
  type: "misc";
}

interface UAVSubsystem extends Subsystem {
  type: "hanger";
  capacity: number;
}

export interface AttackUAVSubsystem extends UAVSubsystem {
  hanger: "Area-Denial Anti-Aircraft UAV" | "Cooperative Offensive UAV" | "Tactical UAV" | "Siege UAV" | "Military UAV" | "Guard UAV";
  damageType: "Projectile" | "Energy";
  target: "Building" | "Aircraft" | "Small Ship" | "Large Ship";
  /** Percentage represented as a number between 0 and 100 */
  lockonEfficiency: number | null;
  /** Alpha damage (damage per hit) */
  alpha: number;
  stats: ProjectileSubsystemStats | EnergySubsystemStats | null;
}

export interface RepairUAVSubsystem extends UAVSubsystem {
  hanger: "Repair UAV";
  repair: number;
}

export interface MiscUAVSubsystem extends UAVSubsystem {
  hanger: "Spotter UAV" | "Shield UAV" | "Info UAV" | "Recon UAV";
  stats: UavSubsystemStats;
}

export type ModuleSystemName = "M1" | "M2" | "M3" | "A1" | "A2" | "A3" | "B1" | "B2" | "B3" | "C1" | "C2" | "C3" | "D1" | "D2" | "D3" | "E1" | "E2" | "F1" | "F2" | "G1" | "G2" | "H1" | "H2";

interface Module {
  /** Database id for the module — used as the foreign key when persisting
   *  blueprint unlocks against the normalized schema. */
  id: number;
  /** Image of the weapon type, found in `/public/weapons/icons`. */
  img: string;
  system: ModuleSystemName;
  /** Whether or not the module comes with the ship */
  default?: boolean;
}

interface KnownModule extends Module {
  type: "known";
  /** Array of names of people this module's stats were sourced from */
  sourcedFrom: string[] | null;
}

export interface UnknownModule extends Module {
  type: "unknown";
  unknown: true;
}

export interface WeaponModule extends KnownModule {
  name: string;
  stats: {
    type: "weapon";
    antiship: number | null;
    antiair: number | null;
    siege: number | null;
    hp: number;
  };
  subsystems: (WeaponSubsystem | AircraftSubsystem | AttackUAVSubsystem)[];
}

export interface PropulsionModule extends KnownModule {
  name: string;
  stats: {
    type: "propulsion";
    cruise: number | null;
    warp: number | null;
    hp: number;
  };
  subsystems: MiscSubsytem[];
}

export interface MiscModule extends KnownModule {
  name: string;
  stats: {
    type: "armor";
    armor: number | null;
    extraHP: number | null;
    /** Percentage represented as a number between 0 and 100 */
    energyShield: number | null;
    hpRecovery?: number;
    storage?: number;
    hp: number;
  };
  subsystems: (MiscSubsytem | RepairUAVSubsystem | MiscUAVSubsystem)[];
}

export type AllModule = UnknownModule | WeaponModule | PropulsionModule | MiscModule;

export interface SuperCapitalShip extends Ship {
  type: "Battlecruiser" | "Auxiliary Ship" | "Carrier" | "Battleship";
  modules: AllModule[];
}

export type AllShip = Fighter | Corvette | CapitalShip | MediumFighterCapitalShip | LargeFighterCapitalShip | CorvetteCapitalShip | SuperCapitalShip;

export function findShip(ships: AllShip[] | undefined, ship: AllShip | undefined, name?: string, variant?: string) {
  if (ship) return ships?.find((s) => s.name.toLowerCase() === ship.name.toLowerCase() && s.variant.toLowerCase() === ship.variant.toLowerCase());
  return ships?.find((s) => s.name.toLowerCase() === name?.toLowerCase() && s.variant.toLowerCase() === variant?.toLowerCase());
}

export function shipNameToImage(name: string) {
  return name.toLowerCase().replaceAll("-", "").replaceAll("'", "").replaceAll(".", "").split(" ").join("_");
}

/**
 * Returns the effective image URL for a ship, falling back through:
 *   1. ship.img if it's a non-empty string
 *   2. the (name, "A") sibling's img from `siblingsByNameAndVariant`, if any
 *   3. the generic ship-type icon at /ships/classes/{type}.svg
 *
 * The classes/ directory contains pre-existing per-type SVGs (battleship.svg,
 * carrier.svg, "auxiliary ship.svg", etc.) so the third fallback never 404s
 * for any ship type the catalogue actually carries.
 *
 * `siblingsByNameAndVariant` is an optional lookup keyed as
 * `${name}::${variantUpper}` so the mapper can pre-build it once per request
 * rather than scanning the catalogue per ship.
 */
export function resolveShipImage(
  ship: { img: string; name: string; type: string; hasVariants: boolean },
  siblingsByNameAndVariant?: Map<string, string>,
): string {
  if (ship.img && ship.img.length > 0) return ship.img;

  if (ship.hasVariants && siblingsByNameAndVariant) {
    const aImg = siblingsByNameAndVariant.get(`${ship.name}::A`);
    if (aImg && aImg.length > 0) return aImg;
  }

  // The classes/ directory uses lowercase filenames with "auxiliary ship.svg"
  // for the AuxiliaryShip type — i.e. a literal space in the filename. The
  // type strings already arrive in display form ("Auxiliary Ship") so a simple
  // lowercase is enough.
  return `/ships/classes/${ship.type.toLowerCase()}.svg`;
}
