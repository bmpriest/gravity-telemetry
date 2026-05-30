"use client";

import { aircraftSize, formatBuildTime, isSupercapital, type RichShip } from "@/utils/shipModel";

interface Props {
  ship: RichShip;
}

const CRAFT_LABELS: Readonly<Record<string, string>> = {
  uav: "UAV",
  corvette: "Corvette",
  small_fighter: "Small Fighter",
  medium_fighter: "Medium Fighter",
  large_fighter: "Large Fighter",
};

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-neutral-100/40 p-4 transition duration-500 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-500 transition duration-500 dark:text-neutral-400">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg bg-neutral-200/50 px-2 py-1.5 transition duration-500 dark:bg-neutral-800">
      <span className="text-[0.65rem] uppercase tracking-wide text-neutral-500 transition duration-500 dark:text-neutral-400">{label}</span>
      <span className="font-semibold transition duration-500">{value}</span>
    </div>
  );
}

function FireStat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <img className="size-6 shrink-0 select-none transition duration-500 dark:invert" src={icon} aria-hidden="true" />
      <span className="grow text-left text-sm text-neutral-600 transition duration-500 dark:text-neutral-400">{label}</span>
      <span className="font-bold text-yellow-600 transition duration-500 dark:text-yellow-400">{value.toLocaleString()}</span>
    </div>
  );
}

const RATING_ICONS: Readonly<Record<string, string>> = {
  antiShip: "/weapons/stats/antiship.svg",
  antiAir: "/weapons/stats/antiair.svg",
  siege: "/weapons/stats/siege.svg",
  support: "/weapons/stats/hpRecovery.svg",
  survivability: "/weapons/stats/armor.svg",
  strategic: "/ui/trophy.svg",
};

function Rating({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  const v = value || "--";
  const color =
    v === "S" ? "text-purple-600 dark:text-purple-400"
    : v === "A" ? "text-green-600 dark:text-green-400"
    : v === "B" ? "text-blue-600 dark:text-blue-400"
    : v === "C" ? "text-neutral-600 dark:text-neutral-300"
    : "text-neutral-400";
  return (
    <div className="flex items-center gap-2 rounded-lg bg-neutral-200/50 px-2 py-1.5 transition duration-500 dark:bg-neutral-800">
      <img className="size-5 shrink-0 select-none transition duration-500 dark:invert" src={icon} aria-hidden="true" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
      <span className="grow text-left text-xs text-neutral-600 transition duration-500 dark:text-neutral-400">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{v}</span>
    </div>
  );
}

export default function BlueprintStatBoxes({ ship }: Props) {
  const supercap = isSupercapital(ship.type);
  const isAircraft = ship.type === "Fighter" || ship.type === "Corvette";

  // ---- AIRCRAFT STATS content ----
  let aircraftContent: React.ReactNode = null;
  if (isAircraft) {
    const size = ship.type === "Corvette" ? "Corvette" : aircraftSize(ship.aircraftType) ?? ship.aircraftType ?? "—";
    aircraftContent = (
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Class</span><span className="font-medium">{size}</span></div>
        {ship.battleMoveTypeName && <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Movement</span><span className="font-medium">{ship.battleMoveTypeName}</span></div>}
        {ship.aircraftFormationSize ? <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Squadron Size</span><span className="font-medium">{ship.aircraftFormationSize}</span></div> : null}
        {ship.aircraftDualPurpose && <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Dual-Purpose</span><span className="font-medium text-green-600 dark:text-green-400">Yes</span></div>}
      </div>
    );
  } else if (ship.hangarStats.length > 0) {
    // Capital carriers — dedupe identical rows.
    const seen = new Set<string>();
    const rows = ship.hangarStats.filter((h) => {
      const k = `${h.craftType}|${h.capacity}|${h.systemName}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    aircraftContent = (
      <div className="flex flex-col gap-1.5 text-sm">
        {ship.aircraftFormationSize ? <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Formation Size</span><span className="font-medium">{ship.aircraftFormationSize}</span></div> : null}
        {rows.map((h, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">{CRAFT_LABELS[h.craftType] ?? h.craftType}</span>
            <span className="font-medium">×{h.capacity}{h.carriesDualPurpose ? " · DP" : ""}</span>
          </div>
        ))}
      </div>
    );
  } else if (supercap) {
    // Supercap — derive from default (included) hangar systems.
    const rows: { label: string; capacity: number }[] = [];
    for (const sys of ship.systems) {
      if (sys.systemTypeName !== "Hangar" || !sys.includedWithBlueprint) continue;
      for (const m of sys.modules) {
        if (m.hangarCraftType) rows.push({ label: CRAFT_LABELS[m.hangarCraftType] ?? m.hangarCraftType, capacity: (m.hangarCapacity ?? 0) * m.quantity });
      }
    }
    if (rows.length > 0) {
      aircraftContent = (
        <div className="flex flex-col gap-1.5 text-sm">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">{r.label}</span>
              <span className="font-medium">×{r.capacity}</span>
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Box title="Firepower Stats">
        <div className="flex flex-col gap-2">
          <FireStat icon="/weapons/stats/antiship.svg" label="Anti-Ship" value={ship.dpm.antiShip} />
          <FireStat icon="/weapons/stats/antiair.svg" label="Anti-Air" value={ship.dpm.antiAir} />
          <FireStat icon="/weapons/stats/siege.svg" label="Siege" value={ship.dpm.siege} />
          {ship.dpm.hpRecovery > 0 && <FireStat icon="/weapons/stats/hpRecovery.svg" label="HP Recovery" value={ship.dpm.hpRecovery} />}
          {ship.dpm.operationEfficiency > 0 && <FireStat icon="/weapons/types/operationCount.svg" label="Operation" value={ship.dpm.operationEfficiency} />}
        </div>
      </Box>

      {aircraftContent && <Box title="Aircraft Stats">{aircraftContent}</Box>}

      <Box title="Basic Stats">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="HP" value={ship.hp.toLocaleString()} />
          <Stat label="Armor" value={ship.armor.toLocaleString()} />
          <Stat label="Energy Shield" value={`${ship.energyShield}%`} />
          <Stat label="HP Recovery" value={`${ship.armorRepairRate}%`} />
          <Stat label="Cruising Speed" value={ship.cruisingSpeed.toLocaleString()} />
          <Stat label="Warp Speed" value={ship.warpSpeed.toLocaleString()} />
          <Stat label="Service Limit" value={ship.serviceLimit} />
          <Stat label="View Radius" value={ship.viewRadius.toLocaleString()} />
        </div>
        <h4 className="mb-2 mt-3 text-xs font-bold uppercase tracking-wider text-neutral-500 transition duration-500 dark:text-neutral-400">Production Info</h4>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Metal" value={ship.production.metal.toLocaleString()} />
          <Stat label="Crystal" value={ship.production.crystal.toLocaleString()} />
          <Stat label="Deuterium" value={ship.production.deuterium.toLocaleString()} />
          <Stat label="Build Time" value={formatBuildTime(ship.production.buildTimeSeconds)} />
          <Stat label="Storage" value={ship.storage.toLocaleString()} />
        </div>
      </Box>

      <Box title="Combat Roles">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Rating icon={RATING_ICONS.antiShip} label="Anti-Ship" value={ship.ratings.antiShip} />
          <Rating icon={RATING_ICONS.antiAir} label="Anti-Air" value={ship.ratings.antiAir} />
          <Rating icon={RATING_ICONS.siege} label="Siege" value={ship.ratings.siege} />
          <Rating icon={RATING_ICONS.support} label="Support" value={ship.ratings.support} />
          <Rating icon={RATING_ICONS.survivability} label="Survivability" value={ship.ratings.survivability} />
          <Rating icon={RATING_ICONS.strategic} label="Strategic" value={ship.ratings.strategic} />
        </div>
      </Box>
    </div>
  );
}
