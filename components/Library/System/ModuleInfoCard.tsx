"use client";

import { Fragment } from "react";
import { getModulePrimaryDpm, decodeHangarQuantity, type RichModule, type RichSystem } from "@/utils/shipModel";
import { DPM_META } from "@/utils/icons";

interface Props {
  module: RichModule;
  system: RichSystem;
}

/** A labelled row: icon, field name, value. Renders nothing if value is empty. */
function Row({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "--") return null;
  return (
    <div className="flex w-full items-center justify-between gap-2 py-0.5">
      <span className="inline-flex items-center gap-1.5 text-left font-medium text-neutral-700 transition duration-500 dark:text-neutral-300">
        <img className="size-5 shrink-0 select-none transition duration-500 invert dark:invert-0" src={icon} aria-hidden="true" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
        {label}
      </span>
      <span className="text-right transition duration-500">{value}</span>
    </div>
  );
}

const F = {
  hangar: "/weapons/types/damageType.svg",
  damageType: "/weapons/types/damageType.svg",
  target: "/weapons/types/target.svg",
  ballistic: "/weapons/types/operationCount.svg",
  alpha: "/weapons/types/alpha.svg",
  duration: "/weapons/types/duration.svg",
  rounds: "/weapons/types/operationCount.svg",
  time: "/weapons/stats/time.svg",
  hp: "/weapons/stats/extraHp.svg",
  armor: "/weapons/stats/armor.svg",
  shield: "/weapons/stats/energyShield.svg",
  operation: "/weapons/types/operationCount.svg",
  effect: "/ui/researchAgreement.svg",
  range: "/weapons/upgrades/aircraftHitrate.svg",
  craft: "/weapons/icons/aircraft.png",

  ico_damageType: "/weapons/attributes/icon_damage_type.png",
  ico_target: "/weapons/attributes/icon_target_shipattack.png",
  ico_ballistic: "/weapons/attributes/icon_trajectory_type.png",
  ico_duration: "/weapons/attributes/icon_duration.png",
  ico_lockOntime: "/weapons/attributes/icon_lockingtime.png",
  ico_DPH: "/weapons/attributes/icon_weapon_damage.png",
  ico_interval: "/weapons/attributes/icon_weapon_interval.png",
  ico_ammoRounds: "/weapons/attributes/icon_weapon_lauches.png",
  ico_cooldown: "/weapons/attributes/icon_weapon_interval.png",

  ico_opDPM: "/weapons/attributes/icon_firepower_job_ratio.png",
  ico_opValue: "/weapons/attributes/icon_job_value.png",
  ico_opStrength: "/weapons/attributes/icon_job_strength.png",
  ico_opCount: "/weapons/attributes/icon_work_amount.png",
};

type DpmCat = "antiShip" | "antiAir" | "siege";

const SHIP_TYPE_DPM_CAT: Readonly<Record<string, DpmCat>> = {
  Frigate: "antiShip",
  Destroyer: "antiShip",
  Cruiser: "antiShip",
  Battlecruiser: "antiShip",
  "Auxiliary Ship": "antiShip",
  Carrier: "antiShip",
  Battleship: "antiShip",
  Fighter: "antiAir",
  "Small Fighter": "antiAir",
  "Medium Fighter": "antiAir",
  "Large Fighter": "antiAir",
  "Fighter/Scout": "antiAir",
  "Fighter/Attacker": "antiAir",
  "Fighter/Interceptor": "antiAir",
  "Fighter/Bomber": "antiAir",
  UAV: "antiAir",
  Corvette: "antiAir",
  "Landing Ship": "antiAir",
};

const DPM_CAT_ORDER: DpmCat[] = ["antiShip", "antiAir", "siege"];

const CRAFT_LABELS: Readonly<Record<string, string>> = {
  uav: "UAV",
  corvette: "Corvette",
  small_fighter: "Small Fighter",
  medium_fighter: "Medium Fighter",
  large_fighter: "Large Fighter",
};

/** Fills a "{}" or "{NNN}" placeholder in an effect description with its value. */
function fillDesc(desc: string | null, attrDesc: string | null, value: number | null): string {
  const text = (desc && desc.includes("{") ? desc : attrDesc || desc) ?? "";
  if (value == null) return text.replace(/\{[^}]*\}/g, "").trim();
  return text.replace(/\{[^}]*\}/g, String(value));
}

// ----------------------------------------------------------------------------
// WeaponSection — renders weapon stats (left) + target priorities (right) for
// a single RichModule. Used for both main module weapons and UAV sub-systems.
// ----------------------------------------------------------------------------

function WeaponSection({ module }: { module: RichModule }) {
  const w = module.weapon;
  if (!w) return null;

  const primaryDpm = getModulePrimaryDpm(module);
  const hasAttack = !!primaryDpm && primaryDpm.key !== "operationEfficiency" && primaryDpm.key !== "hpRecovery";

  const priorities = w.targetPriorities ?? [];
  const showPriority = priorities.length > 0;

  const primaryCat = primaryDpm?.key as DpmCat | undefined;
  const catOrder: DpmCat[] = primaryCat
    ? [primaryCat, ...DPM_CAT_ORDER.filter((c) => c !== primaryCat)]
    : DPM_CAT_ORDER;

  const prioritiesByCategory = catOrder.map((cat) => {
    const catPriorities = priorities
      .map((p) => ({ ...p, shipTypes: p.shipTypes.filter((t) => (SHIP_TYPE_DPM_CAT[t.targetType] ?? "siege") === cat) }))
      .filter((p) => p.shipTypes.length > 0);
    const dpmValue = w.dpm[cat] ?? 0;
    return { cat, priorities: catPriorities, dpmValue };
  }).filter(({ cat, priorities: ps, dpmValue }) => ps.length > 0 && (cat !== "siege" || dpmValue > 0));

  const effects = module.moduleEffects.filter((e) => e.name);
  const aircraftRange = w.aircraftRangeName && w.aircraftRangeName !== "None" ? w.aircraftRangeName : null;
  const hasTimingBlock = !!(w.durationSeconds || w.ammoCount || w.cdTimeSeconds || w.intervalSeconds || w.lockOnTimeSeconds);
  const hasEffectsBlock = effects.length > 0 || !!aircraftRange;

  return (
    <div className={`flex w-full flex-col xl:flex-row`}>
      {/* Stats (left) */}
      <div className={`flex w-full flex-col ${showPriority ? "xl:w-[55%]" : ""}`}>
        <Row icon={F.ico_opCount} label="Operation Count" value={!hasAttack && w.operationCount ? w.operationCount.toLocaleString() : null} />
        <Row icon={F.ico_opValue} label="Operation Value" value={w.operationValue ? w.operationValue.toLocaleString() : null} />
        <Row icon={F.ico_opStrength} label="Operation Strength" value={w.operationStrength ? w.operationStrength.toLocaleString() : null} />
        <Row icon={F.ico_damageType} label="Damage Type" value={w.damageTypeName ?? null} />
        <Row icon={F.ico_target} label="Prioritized Target" value={module.prioritizedTargetLabel ?? null} />
        <Row icon={F.ico_ballistic} label="Ballistic Type" value={module.trajectory ?? null} />
        <Row icon={F.ico_DPH} label="Damage Per Hit" value={w.damagePerHit ? w.damagePerHit.toLocaleString() : null} />
        <Row icon={F.hp} label="Healing Per Hit" value={w.healingValue ? w.healingValue.toLocaleString() : null} />

        {hasTimingBlock && <div className="my-2 h-px w-full bg-neutral-200 transition duration-500 dark:bg-neutral-800" />}
        <Row icon={F.ico_duration} label="Duration" value={w.durationSeconds ? `${w.durationSeconds}s` : null} />
        <Row
          icon={F.ico_ammoRounds}
          label={hasAttack ? "Ammo × Rounds/Cycle" : "Operation Count"}
          value={w.ammoCount && w.roundsPerCycle ? `${w.ammoCount} × ${w.roundsPerCycle}` : null}
        />
        <Row icon={F.ico_cooldown} label="Cooldown" value={w.cdTimeSeconds ? `${w.cdTimeSeconds}s` : null} />
        <Row icon={F.ico_interval} label="Damage Interval" value={w.intervalSeconds ? `${w.intervalSeconds}s` : null} />
        <Row icon={F.ico_lockOntime} label="Lock-On Time" value={w.lockOnTimeSeconds ? `${w.lockOnTimeSeconds}s` : null} />

        {hasEffectsBlock && <div className="my-2 h-px w-full bg-neutral-200 transition duration-500 dark:bg-neutral-800" />}
        {aircraftRange && (
          <div className="flex w-full items-start gap-1.5 py-1">
            <img className="mt-0.5 size-5 shrink-0 select-none transition duration-500 dark:invert" src={F.range} aria-hidden="true" />
            <span className="text-left text-sm transition duration-500"><span className="font-medium">{aircraftRange}</span></span>
          </div>
        )}
        {effects.map((e, i) => (
          <div key={`eff${i}`} className="flex w-full items-start gap-1.5 py-1">
            <img className="mt-0.5 size-5 shrink-0 select-none transition duration-500 dark:invert" src={F.effect} aria-hidden="true" />
            <span className="text-left text-sm transition duration-500">
              <span className="font-medium">{e.name}</span>
              {(() => {
                const d = fillDesc(e.desc, e.attrDesc, e.value);
                return d ? <span className="text-neutral-600 transition duration-500 dark:text-neutral-400"> — {d}</span> : null;
              })()}
            </span>
          </div>
        ))}
      </div>

      {/* Priorities (right) */}
      {showPriority && (
        <>
          <aside className="my-3 min-h-1.5 w-full rounded-full bg-neutral-200 transition duration-500 xl:mx-3 xl:my-0 xl:min-h-0 xl:w-1.5 dark:bg-neutral-800" />
          <div className="flex w-full flex-col items-start xl:w-[40%] xl:items-end">
            <h5 className="text-lg font-medium transition duration-500">{hasAttack ? "Attack" : "Operation"} Priority</h5>
            <div className="mt-3 flex w-full flex-col gap-5">
              {prioritiesByCategory.map(({ cat, priorities: catPriorities, dpmValue }) => (
                <div key={cat} className="flex w-full flex-col gap-2">
                  <div className="inline-flex items-center gap-1.5">
                    <img className="size-4 select-none transition duration-500 dark:invert" src={DPM_META[cat].icon} aria-hidden="true" />
                    <span className="text-sm font-semibold transition duration-500">
                      {cat === primaryDpm?.key && module.prioritizedTargetLabel ? module.prioritizedTargetLabel : DPM_META[cat].label}
                    </span>
                    {dpmValue > 0 && (
                      <span className="font-semibold text-yellow-600 transition duration-500 dark:text-yellow-400">
                        {Math.round(dpmValue * module.quantity).toLocaleString()}/min
                      </span>
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    {catPriorities.map((p, idx) => (
                      <div key={idx} className="flex w-full flex-col rounded-xl shadow">
                        <div className="flex items-center gap-2 rounded-t-xl bg-neutral-200 px-3 py-1 transition duration-500 dark:bg-neutral-700">
                          <span className="select-none text-sm font-semibold text-neutral-700 transition duration-500 dark:text-neutral-300">
                            {String(p.priorityRank).padStart(2, "0")}
                          </span>
                          <span className="text-sm text-neutral-600 transition duration-500 dark:text-neutral-400">Priority</span>
                        </div>
                        {p.shipTypes.map((t, ti) => (
                          <div key={ti} className="flex w-full items-center gap-2 bg-neutral-200/25 px-3 py-0.5 transition duration-500 last:rounded-b-xl last:pb-1 dark:bg-neutral-700/40">
                            <img
                              className="size-4 shrink-0 select-none transition duration-500 dark:invert"
                              src={`/ships/classes/${t.targetType.toLowerCase()}.svg`}
                              alt={t.targetType}
                              onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
                            />
                            <span className="grow text-left text-sm transition duration-500">{t.targetType}</span>
                            <span className="text-right text-xs text-neutral-600 transition duration-500 dark:text-neutral-400">Hit: {t.targetHitRate}%</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main card
// ----------------------------------------------------------------------------

export default function ModuleInfoCard({ module, system }: Props) {
  const w = module.weapon;
  const isHangar = !!module.hangarCraftType;
  const isArmor = system.systemTypeName === "Armor";
  const primaryDpm = getModulePrimaryDpm(module);

  // UAV systems: collect weapon-bearing systems from all carried craft.
  const uavSystems = isHangar
    ? module.carriedCraft.flatMap((cc) =>
        cc.systems.map((sys) => {
          // Pick the first module with a weapon as the primary weapon-bearer for this system.
          const weaponModule = sys.modules.find((m) => m.weapon) ?? null;
          return { sys, weaponModule };
        })
      ).filter(({ weaponModule }) => weaponModule !== null) as { sys: RichSystem; weaponModule: RichModule }[]
    : [];

  // Card needs full width when any weapon section will render a two-column priority panel.
  const needsFullWidth = (w?.targetPriorities?.length ?? 0) > 0 || uavSystems.some(({ weaponModule }) => (weaponModule.weapon?.targetPriorities?.length ?? 0) > 0);

  return (
    <div className={`flex flex-col items-stretch justify-between rounded-xl bg-neutral-100/40 p-4 transition duration-500 dark:bg-neutral-900 ${needsFullWidth ? "w-full" : "grow"}`}>
      {/* ---- Module info ---- */}
      <div className="flex w-full flex-col items-start">
        {/* Row 1: quantity | shortName / typeName */}
        <div className="flex w-full items-start justify-between gap-3 border-b border-neutral-200 pb-2 dark:border-neutral-800">
          <span className="rounded-lg bg-yellow-100 px-2 py-0.5 text-sm font-semibold text-yellow-800 transition duration-500 dark:bg-yellow-900 dark:text-yellow-200">x{module.quantity}</span>
          <div className="flex flex-col items-end text-right">
            <span className="font-semibold leading-tight transition duration-500">{module.shortName || module.name}</span>
            <span className="text-sm leading-tight text-neutral-600 transition duration-500 dark:text-neutral-400">{module.typeName}</span>
          </div>
        </div>

        <div className="mt-2 flex w-full flex-col">
          {isArmor && <Row icon={F.hp} label="HP" value={system.hp ? system.hp.toLocaleString() : null} />}
          <Row icon={F.craft} label="Hangar Type" value={module.hangarCraftType ? CRAFT_LABELS[module.hangarCraftType] ?? module.hangarCraftType : null} />
          {isArmor && <Row icon={F.armor} label="Armor" value={system.armor ? system.armor.toLocaleString() : null} />}
          {isArmor && <Row icon={F.shield} label="Energy Shield" value={system.energyShield ? `${system.energyShield}%` : null} />}

          {primaryDpm && (
            <Row
              icon={primaryDpm.icon}
              label={`${primaryDpm.label} DPM`}
              value={<span className="font-semibold text-yellow-600 dark:text-yellow-400">{Math.round(primaryDpm.value * module.quantity).toLocaleString()}/min</span>}
            />
          )}

          {/* Carried craft list (hangar modules) — names + quantities from module effects */}
          {isHangar && module.moduleEffects.filter((e) => e.name).map((e, i) => (
            <Row key={`cc${i}`} icon={F.craft} label={e.name} value={`x${decodeHangarQuantity(e.value) || module.carriedCraft[i]?.quantity || ""}`} />
          ))}

          {/* Non-hangar weapon stats — delegated to WeaponSection */}
          {!isHangar && <WeaponSection module={module} />}

          {/* Module effects for non-weapon, non-hangar modules (Propulsion, Subsystem, etc.) */}
          {!isHangar && !w && module.moduleEffects.filter((e) => e.name).map((e, i) => (
            <div key={`eff${i}`} className="flex w-full items-start gap-1.5 py-1">
              <img className="mt-0.5 size-5 shrink-0 select-none transition duration-500 dark:invert" src={F.effect} aria-hidden="true" />
              <span className="text-left text-sm transition duration-500">
                <span className="font-medium">{e.name}</span>
                {(() => {
                  const d = fillDesc(e.desc, e.attrDesc, e.value);
                  return d ? <span className="text-neutral-600 transition duration-500 dark:text-neutral-400"> — {d}</span> : null;
                })()}
              </span>
            </div>
          ))}

          {/* ---- UAV weapon systems ---- */}
          {uavSystems.map(({ sys, weaponModule }, idx) => (
            <Fragment key={`uav-sys-${idx}`}>
              <div className="my-3 h-px w-full bg-neutral-200 transition duration-500 dark:bg-neutral-800" />
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold transition duration-500">{sys.name}</span>
                <span className="text-xs text-neutral-500 transition duration-500 dark:text-neutral-400">{sys.systemTypeName}</span>
              </div>
              <WeaponSection module={weaponModule} />
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
