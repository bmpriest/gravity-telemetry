"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { BLUEPRINT_TYPE_ORDER, groupVariants, isSupercapital, type RichShip } from "@/utils/shipModel";
import BlueprintLibraryCard from "@/components/Blueprints/Library/BlueprintLibraryCard";
import BlueprintStatBoxes from "@/components/Blueprints/Library/BlueprintStatBoxes";
import BlueprintSystemCard from "@/components/Blueprints/Library/BlueprintSystemCard";
import SystemView from "@/components/Library/System/SystemView";

export default function BlueprintLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const richShipData = useUserStore((s) => s.richShipData);
  const fetchRichShipData = useUserStore((s) => s.fetchRichShipData);

  const shipParam = searchParams.get("ship");
  const sysParam = searchParams.get("sys");

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!richShipData) void fetchRichShipData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Combat ships only, grouped into one entry per (type, shortName).
  const groupsByType = useMemo(() => {
    if (!richShipData) return undefined;
    const combat = richShipData.filter((s) => (BLUEPRINT_TYPE_ORDER as readonly string[]).includes(s.type));
    const grouped = groupVariants(combat);
    const byType = new Map<string, { primary: RichShip; variants: RichShip[] }[]>();
    for (const g of grouped) {
      const arr = byType.get(g.primary.type) ?? [];
      arr.push(g);
      byType.set(g.primary.type, arr);
    }
    for (const arr of byType.values()) arr.sort((a, b) => a.primary.shortName.localeCompare(b.primary.shortName));
    return byType;
  }, [richShipData]);

  const currentShip = useMemo(() => richShipData?.find((s) => String(s.id) === shipParam), [richShipData, shipParam]);
  const variantGroup = useMemo(() => {
    if (!currentShip || !richShipData) return [];
    return richShipData
      .filter((s) => s.type === currentShip.type && s.shortName === currentShip.shortName)
      .sort((a, b) => a.variant.localeCompare(b.variant));
  }, [currentShip, richShipData]);

  const supercap = currentShip ? isSupercapital(currentShip.type) : false;
  const sortedSystems = useMemo(() => (currentShip ? [...currentShip.systems].sort((a, b) => a.index - b.index) : []), [currentShip]);
  const currentSystem = useMemo(() => sortedSystems.find((s) => String(s.id) === sysParam), [sortedSystems, sysParam]);

  function openShip(id: number) {
    router.push(`/modules/blueprint-library?ship=${id}`);
  }
  function openVariant(id: number) {
    router.push(`/modules/blueprint-library?ship=${id}`);
  }
  function openSystemInline(systemId: number) {
    router.push(`/modules/blueprint-library?ship=${currentShip!.id}&sys=${systemId}`);
  }
  function backToList() {
    router.push(`/modules/blueprint-library`);
  }
  function backToSystems() {
    router.push(`/modules/blueprint-library?ship=${currentShip!.id}`);
  }

  // ============================ DETAIL VIEW ============================
  if (currentShip) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] w-full flex-col items-center p-4 sm:p-8">
        <div className="w-full max-w-[80rem]">
          <button type="button" onClick={backToList} className="mb-4 inline-flex items-center gap-2 rounded-lg bg-neutral-200 px-3 py-1.5 font-medium transition duration-300 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700">
            <img className="size-5 dark:invert" src="/ui/arrowLeft.svg" aria-hidden="true" /> All blueprints
          </button>

          {/* ---- top bar: logo, name, variants, CP ---- */}
          <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-neutral-100/40 p-4 transition duration-500 sm:flex-row sm:items-center dark:bg-neutral-900">
            {currentShip.manufacturer.logo && (
              <img className="size-12 shrink-0 select-none rounded object-contain" src={currentShip.manufacturer.logo} alt={currentShip.manufacturer.name} />
            )}
            <div className="grow">
              <h1 className="text-2xl font-bold transition duration-500">{currentShip.shortName}</h1>
              <p className="text-neutral-600 transition duration-500 dark:text-neutral-400">{currentShip.title || currentShip.type}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {variantGroup.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => openVariant(v.id)}
                  title={v.variantName}
                  className={`flex min-w-[3rem] flex-col items-center rounded-lg px-2 py-1 transition duration-300 ${v.id === currentShip.id ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900" : "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"}`}
                >
                  <span className="text-lg font-bold leading-none">{v.variant}</span>
                  <span className="max-w-[6rem] truncate text-[0.6rem] leading-tight">{v.variantName || "—"}</span>
                </button>
              ))}
            </div>
            <div className="flex shrink-0 flex-col items-center rounded-xl bg-neutral-800 px-4 py-2 text-white transition duration-500 dark:bg-neutral-200 dark:text-neutral-900">
              <span className="text-2xl font-bold leading-none">{currentShip.commandPoints}</span>
              <span className="text-[0.65rem] uppercase tracking-wide">Command Pts</span>
            </div>
          </div>

          {/* ---- body: stat boxes (left) + systems / SystemView (right) ---- */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="w-full shrink-0 lg:sticky lg:top-20 lg:w-80">
              <BlueprintStatBoxes ship={currentShip} />
            </div>

            <div className="min-w-0 grow">
              {!supercap && currentSystem ? (
                <div>
                  <button type="button" onClick={backToSystems} className="mb-4 inline-flex items-center gap-2 rounded-lg bg-neutral-200 px-3 py-1.5 font-medium transition duration-300 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700">
                    <img className="size-5 dark:invert" src="/ui/arrowLeft.svg" aria-hidden="true" /> Back to systems
                  </button>
                  <SystemView system={currentSystem} shipType={currentShip.type} />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-neutral-500 transition duration-500 dark:text-neutral-400">Systems</h3>
                  {sortedSystems.map((sys) => (
                    <BlueprintSystemCard
                      key={sys.id}
                      system={sys}
                      supercap={supercap}
                      href={supercap ? `/modules/system-library?ship=${currentShip.id}&sys=${sys.id}` : undefined}
                      onClick={supercap ? undefined : () => openSystemInline(sys.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================ LIST VIEW ============================
  const q = search.trim().toLowerCase();
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] w-full flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-[80rem]">
        {/* search */}
        <div className="mb-4 flex items-center gap-2 rounded-full bg-neutral-100/60 px-4 py-2 transition duration-500 dark:bg-neutral-900">
          <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/search.svg" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ships…"
            className="w-full bg-transparent outline-none transition duration-500"
          />
          {search && <button type="button" onClick={() => setSearch("")}><img className="size-5 dark:invert" src="/ui/close.svg" aria-hidden="true" /></button>}
        </div>

        <div className="flex gap-4">
          {/* type filter bar */}
          <div className="sticky top-20 flex h-fit shrink-0 flex-col gap-1 rounded-2xl bg-neutral-100/40 p-2 transition duration-500 dark:bg-neutral-900">
            {BLUEPRINT_TYPE_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                title={t}
                onClick={() => setTypeFilter((cur) => (cur === t ? null : t))}
                className={`flex items-center justify-center rounded-lg p-2 transition duration-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 ${typeFilter === t ? "bg-neutral-800 dark:bg-neutral-200" : ""}`}
              >
                <img className={`size-7 select-none transition duration-500 ${typeFilter === t ? "invert dark:invert-0" : "dark:invert"}`} src={`/ships/classes/${t.toLowerCase()}.svg`} alt={t} />
              </button>
            ))}
          </div>

          {/* grid */}
          <div className="min-w-0 grow">
            {!groupsByType ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }, (_, i) => <div key={i} className="fo-skeleton fo-skeleton-animated h-56 rounded-2xl bg-neutral-200/50" />)}
              </div>
            ) : (
              BLUEPRINT_TYPE_ORDER.filter((t) => !typeFilter || t === typeFilter).map((t) => {
                const groups = (groupsByType.get(t) ?? []).filter((g) => !q || g.primary.shortName.toLowerCase().includes(q) || g.primary.name.toLowerCase().includes(q));
                if (groups.length === 0) return null;
                return (
                  <section key={t} className="mb-8">
                    <h2 className="mb-3 flex items-center gap-2 text-xl font-bold transition duration-500">
                      <img className="size-7 dark:invert" src={`/ships/classes/${t.toLowerCase()}.svg`} alt="" />
                      {t}{t === "Fighter" ? "s" : t.endsWith("s") ? "" : "s"}
                      <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">({groups.length})</span>
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      {groups.map((g) => (
                        <BlueprintLibraryCard key={g.primary.id} ship={g.primary} variantCount={g.variants.length} onClick={() => openShip(g.primary.id)} />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
