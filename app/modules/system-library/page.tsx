"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import {
  BLUEPRINT_TYPE_ORDER, isSupercapital, sortSystemsForLibrary, type RichShip, type RichSystem
} from "@/utils/shipModel";
import SystemView from "@/components/Library/System/SystemView";
import SystemListCard from "@/components/Library/System/SystemListCard";

export default function SystemLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const richShipData = useUserStore((s) => s.richShipData);
  const fetchRichShipData = useUserStore((s) => s.fetchRichShipData);

  const shipParam = searchParams.get("ship");
  const sysParam = searchParams.get("sys");

  useEffect(() => {
    if (!richShipData) void fetchRichShipData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Every supercapital ship, ordered by type then name.
  const ships = useMemo(() => {
    if (!richShipData) return undefined;
    const order = (t: string) => {
      const i = (BLUEPRINT_TYPE_ORDER as readonly string[]).indexOf(t);
      return i === -1 ? 99 : i;
    };
    return richShipData
      .filter((s) => isSupercapital(s.type))
      .sort((a, b) => order(a.type) - order(b.type) || a.shortName.localeCompare(b.shortName) || a.variant.localeCompare(b.variant));
  }, [richShipData]);

  const currentShip = useMemo<RichShip | undefined>(() => {
    if (!ships || ships.length === 0) return undefined;
    if (shipParam) return ships.find((s) => String(s.id) === shipParam) ?? ships[0];
    return ships[0];
  }, [ships, shipParam]);

  const sortedSystems = useMemo(() => (currentShip ? sortSystemsForLibrary(currentShip.systems) : []), [currentShip]);
  const currentSystem = useMemo(() => sortedSystems.find((s) => String(s.id) === sysParam), [sortedSystems, sysParam]);

  function countSystems(sortedSystems: RichSystem[]) {
    let i = 0;
    for (const sys of sortedSystems) {
      if (sys.code) {
        i++;
      }
    }
    return i;
  }

  function selectShip(ship: RichShip) {
    router.push(`/modules/system-library?ship=${ship.id}`);
  }
  function selectSystem(systemId: number) {
    if (!currentShip) return;
    router.push(`/modules/system-library?ship=${currentShip.id}&sys=${systemId}`);
  }
  function back() {
    if (!currentShip) return;
    router.push(`/modules/system-library?ship=${currentShip.id}`);
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] w-full flex-col items-center p-4 sm:p-8">
      <div className="mt-2 flex w-full max-w-[80rem] flex-col items-stretch gap-4 lg:flex-row lg:items-start xl:gap-8">
        {/* ---- Ship selector ---- */}
        <div className="flex max-h-[80vh] w-full shrink-0 flex-col gap-1 overflow-y-auto rounded-xl bg-neutral-100/40 p-2 transition duration-500 lg:sticky lg:top-20 lg:w-64 xl:w-72 dark:bg-neutral-900">
          {ships ? (
            ships.map((ship) => (
              <button
                key={ship.id}
                type="button"
                onClick={() => selectShip(ship)}
                className={`flex items-center gap-2 rounded-lg p-2 text-left transition duration-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 ${currentShip?.id === ship.id ? "bg-neutral-200 dark:bg-neutral-800" : ""}`}
              >
                <img
                  className="h-12 shrink-0 rounded object-contain "
                  src={ship.img || `/ships/classes/${ship.type.toLowerCase()}.svg`}
                  alt={ship.shortName}
                  onError={(e) => ((e.target as HTMLImageElement).src = `/ships/classes/${ship.type.toLowerCase()}.svg`)}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium leading-tight transition duration-500">{ship.shortName}</p>
                  {/* <p className="truncate text-xs text-neutral-500 transition duration-500 dark:text-neutral-400">
                    {ship.variant}{ship.variantName ? ` · ${ship.variantName}` : ""}
                  </p> */}
                </div>
              </button>
            ))
          ) : (
            Array.from({ length: 10 }, (_, i) => <div key={i} className="fo-skeleton fo-skeleton-animated h-14 w-full rounded-lg bg-neutral-200/50" />)
          )}
        </div>

        {/* ---- Main ---- */}
        <div className="min-w-0 grow">
          {currentShip && (
            <div className="mb-4 flex items-center gap-4 rounded-2xl bg-neutral-100/40 p-4 transition duration-500 dark:bg-neutral-900">
              <img
                className="h-28 shrink-0 object-contain overflow-visible"
                src={currentShip.img || `/ships/classes/${currentShip.type.toLowerCase()}.svg`}
                alt={currentShip.shortName}
                onError={(e) => ((e.target as HTMLImageElement).src = `/ships/classes/${currentShip.type.toLowerCase()}.svg`)}
              />
              <div>
                <h1 className="text-2xl font-bold transition duration-500">{currentShip.shortName}</h1>
                <p className="text-neutral-600 transition duration-500 dark:text-neutral-400">{currentShip.title || currentShip.type}</p>
                <p className="mt-1 text-sm text-neutral-500 transition duration-500 dark:text-neutral-400">{countSystems(sortedSystems)} systems</p>
              </div>
            </div>
          )}

          {currentSystem ? (
            <div>
              <button
                type="button"
                onClick={back}
                className="mb-4 inline-flex items-center gap-2 rounded-lg bg-neutral-200 px-3 py-1.5 font-medium transition duration-300 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <img className="size-5 dark:invert" src="/ui/arrowLeft.svg" aria-hidden="true" /> Back to systems
              </button>
              <SystemView system={currentSystem} shipType={currentShip!.type} />
            </div>
          ) : (
            <div className="grid grid-cols-auto auto-cols-fr grid-rows-auto gap-3">
              {sortedSystems.map((sys) => (
                <SystemListCard key={sys.id} system={sys} shipType={currentShip!.type} onClick={() => selectSystem(sys.id)} />
              ))}
              {!currentShip && Array.from({ length: 8 }, (_, i) => <div key={i} className="fo-skeleton fo-skeleton-animated h-36 rounded-xl bg-neutral-200/50" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
