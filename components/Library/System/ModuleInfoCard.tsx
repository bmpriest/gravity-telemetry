"use client";

import { getModulePrimaryDpm, decodeHangarQuantity, type RichModule, type RichSystem } from "@/utils/shipModel";

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
        <img className="size-5 shrink-0 select-none transition duration-500 dark:invert" src={icon} aria-hidden="true" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
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
};

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

export default function ModuleInfoCard({ module, system }: Props) {
  const w = module.weapon;
  const isHangar = !!module.hangarCraftType;
  const isArmor = system.systemTypeName === "Armor";
  const primaryDpm = getModulePrimaryDpm(module);
  const hasAttack = !!primaryDpm && primaryDpm.key !== "operationEfficiency" && primaryDpm.key !== "hpRecovery";

  const priorities = w?.targetPriorities ?? [];
  const showPriority = priorities.length > 0;

  // Effects rendered at the bottom (non-hangar modules) + a synthetic entry for
  // a non-NONE aircraft range.
  const bottomEffects = isHangar ? [] : module.moduleEffects.filter((e) => e.name);
  const aircraftRange = w?.aircraftRangeName && w.aircraftRangeName !== "None" ? w.aircraftRangeName : null;

  return (
    <div className={`flex flex-col items-stretch justify-between rounded-xl bg-neutral-100/40 p-4 transition duration-500 xl:flex-row dark:bg-neutral-900 ${showPriority ? "w-full" : "grow"}`}>
      {/* ---- Module info (left) ---- */}
      <div className={`flex w-full flex-col items-start ${showPriority ? "xl:w-[55%]" : ""}`}>
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
              value={<span className="font-semibold text-yellow-600 dark:text-yellow-400">{Math.round(primaryDpm.value).toLocaleString()}/min</span>}
            />
          )}

          {/* Carried craft (hangar modules) — from module effects, qty decoded */}
          {isHangar && module.moduleEffects.filter((e) => e.name).map((e, i) => (
            <Row key={`cc${i}`} icon={F.craft} label={e.name} value={`x${decodeHangarQuantity(e.value) || module.carriedCraft[i]?.quantity || ""}`} />
          ))}

          <Row icon={F.operation} label="Operation Count" value={!hasAttack && w?.operationCount ? w.operationCount.toLocaleString() : null} />
          <Row icon={F.operation} label="Operation Value" value={w?.operationValue ? w.operationValue.toLocaleString() : null} />
          <Row icon={F.operation} label="Operation Strength" value={w?.operationStrength ? w.operationStrength.toLocaleString() : null} />
          <Row icon={F.damageType} label="Damage Type" value={w?.damageTypeName ?? null} />
          <Row icon={F.target} label="Prioritized Target" value={module.prioritizedTargetLabel ?? null} />
          <Row icon={F.ballistic} label="Ballistic Type" value={module.trajectory ?? null} />
          <Row icon={F.alpha} label="Damage Per Hit" value={w?.damagePerHit ? w.damagePerHit.toLocaleString() : null} />
          <Row icon={F.hp} label="Healing Per Hit" value={w?.healingValue ? w.healingValue.toLocaleString() : null} />

          {/* ---- timing block ---- */}
          {(w?.durationSeconds || w?.ammoCount || w?.cdTimeSeconds || w?.intervalSeconds) && (
            <div className="my-2 h-px w-full bg-neutral-200 transition duration-500 dark:bg-neutral-800" />
          )}
          <Row icon={F.duration} label="Duration" value={w?.durationSeconds ? `${w.durationSeconds}s` : null} />
          <Row
            icon={F.rounds}
            label={hasAttack ? "Ammo × Rounds/Cycle" : "Operation Count"}
            value={w?.ammoCount && w?.roundsPerCycle ? `${w.ammoCount} × ${w.roundsPerCycle}` : null}
          />
          <Row icon={F.time} label="Cooldown" value={w?.cdTimeSeconds ? `${w.cdTimeSeconds}s` : null} />
          <Row icon={F.time} label="Damage Interval" value={w?.intervalSeconds ? `${w.intervalSeconds}s` : null} />

          {/* ---- effects block ---- */}
          {(bottomEffects.length > 0 || aircraftRange) && (
            <div className="my-2 h-px w-full bg-neutral-200 transition duration-500 dark:bg-neutral-800" />
          )}
          {aircraftRange && (
            <div className="flex w-full items-start gap-1.5 py-1">
              <img className="mt-0.5 size-5 shrink-0 select-none transition duration-500 dark:invert" src={F.range} aria-hidden="true" />
              <span className="text-left text-sm transition duration-500"><span className="font-medium">{aircraftRange}</span></span>
            </div>
          )}
          {bottomEffects.map((e, i) => (
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
      </div>

      {/* ---- priority (right) ---- */}
      {showPriority && (
        <>
          <aside className="my-3 min-h-1.5 w-full rounded-full bg-neutral-200 transition duration-500 xl:my-0 xl:mx-3 xl:min-h-0 xl:w-1.5 dark:bg-neutral-800" />
          <div className="flex w-full flex-col items-start xl:w-[40%] xl:items-end">
            <h5 className="text-lg font-medium transition duration-500">{hasAttack ? "Attack" : "Operation"} Priority</h5>

            {primaryDpm && (
              <div className="mt-2 inline-flex items-center gap-1.5">
                <img className="size-4 select-none transition duration-500 dark:invert" src={primaryDpm.icon} aria-hidden="true" />
                <span className="text-sm transition duration-500">{primaryDpm.label}</span>
                <span className="font-semibold text-yellow-600 transition duration-500 dark:text-yellow-400">{Math.round(primaryDpm.value).toLocaleString()}/min</span>
              </div>
            )}

            <div className="mt-3 flex w-full flex-col gap-3">
              {priorities.map((p, idx) => (
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
        </>
      )}
    </div>
  );
}
