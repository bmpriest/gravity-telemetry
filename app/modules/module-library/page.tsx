"use client";

import { useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import LibrarySelection from "@/components/Library/LibrarySelection";
import LibraryHero from "@/components/Library/LibraryHero";
import LibraryModCategory from "@/components/Library/LibraryModCategory";
import LibraryShowcaseBackButton from "@/components/Library/Showcase/LibraryShowcaseBackButton";
import LibraryShowcaseHero from "@/components/Library/Showcase/LibraryShowcaseHero";
import LibraryShowcaseSourceBanner from "@/components/Library/Showcase/LibraryShowcaseSourceBanner";
import LibraryShowcaseCardSubsystemCards from "@/components/Library/Showcase/Card/LibraryShowcaseCardSubsystemCards";
import type { SuperCapitalShip, AllModule } from "@/utils/ships";

export default function ModuleLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shipData = useUserStore((s) => s.shipData);
  const { init } = useUserStore();

  const sParam = searchParams.get("s");
  const mParam = searchParams.get("m");

  useEffect(() => {
    if (!shipData) init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sParam) {
      router.replace("/modules/module-library?s=Constantine+the+Great");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useMemo(
    () => shipData?.filter((ship): ship is SuperCapitalShip => "modules" in ship),
    [shipData]
  );

  const currentShip = useMemo(() => {
    if (!data) return undefined;
    if (!sParam) return data[0];
    return data.find((s) => s.name.toLowerCase() === sParam.toLowerCase()) ?? data[0];
  }, [data, sParam]);

  const currentModule = useMemo<AllModule | undefined>(() => {
    if (!currentShip || !mParam) return undefined;
    return currentShip.modules.find((m) => m.system.toLowerCase() === mParam.toLowerCase());
  }, [currentShip, mParam]);

  const moduleCategories = useMemo(() => {
    if (!currentShip) return undefined;
    return currentShip.modules.reduce<Record<string, AllModule[]>>((acc, mod) => {
      const key = mod.system[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(mod);
      return acc;
    }, {});
  }, [currentShip]);

  function handleSelectShip(ship: SuperCapitalShip) {
    router.push(`/modules/module-library?s=${encodeURIComponent(ship.name)}`);
  }

  function handleSelectModule(mod: AllModule) {
    if (!currentShip) return;
    router.push(`/modules/module-library?s=${encodeURIComponent(currentShip.name)}&m=${encodeURIComponent(mod.system)}`);
  }

  function handleBack() {
    if (!currentShip) return;
    router.push(`/modules/module-library?s=${encodeURIComponent(currentShip.name)}`);
  }

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-start p-8">
      <div className="flex w-full flex-col items-center justify-center md:w-[25rem] lg:w-[30rem]">
        <h1 className="text-3xl font-bold transition duration-500">Module Library</h1>
        <div className="fo-divider my-2 before:transition before:duration-500 after:transition after:duration-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
          <span className="flex items-center justify-center">
            <img className="size-12 select-none transition duration-500 dark:invert" src="/ui/moduleLibrary.svg" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="mt-4 flex w-full flex-col items-center justify-center gap-4 lg:flex-row lg:items-start xl:gap-8">
        <div className="flex w-[90vw] shrink-0 flex-col items-center justify-start gap-1 rounded-xl bg-neutral-100/25 p-2 transition duration-500 sm:w-80 lg:sticky lg:top-20 lg:w-64 xl:w-72 dark:bg-neutral-900">
          {data ? (
            data.map((ship) => (
              <LibrarySelection
                key={`${ship.name}-${ship.variant}`}
                ship={ship}
                currentShip={currentShip}
                onClick={() => handleSelectShip(ship)}
              />
            ))
          ) : (
            Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="fo-skeleton fo-skeleton-animated h-12 w-full rounded-xl bg-neutral-100/50 px-2 py-1 transition duration-500 dark:bg-neutral-700" />
            ))
          )}
        </div>

        <div className="w-[90vw] max-w-[50rem] grow-0 sm:w-auto sm:grow">
          {data && currentShip ? (
            <LibraryHero currentShip={currentShip} />
          ) : (
            <div className="fo-skeleton fo-skeleton-animated flex h-44 rounded-2xl bg-neutral-100/50 p-4 transition duration-500" />
          )}

          <div className="mt-8 w-full overflow-x-hidden">
            <div className="flex w-[200%] items-start justify-center">
              <div className={`flex w-1/2 flex-col items-center justify-center gap-2 transition-transform duration-700${currentModule ? " -translate-x-full" : ""}`}>
                {moduleCategories &&
                  Object.entries(moduleCategories).map(([category, mods]) => (
                    <LibraryModCategory
                      key={category}
                      modules={mods}
                      category={category}
                      onSelect={handleSelectModule}
                    />
                  ))}
              </div>

              <div className={`relative flex w-1/2 flex-col items-center justify-center gap-5 px-8 transition-transform duration-700${currentModule ? " -translate-x-full" : ""}`}>
                <LibraryShowcaseBackButton onClick={handleBack} />

                {data ? (
                  <LibraryShowcaseHero className="mt-16" currentModule={currentModule} />
                ) : (
                  <div className="fo-skeleton fo-skeleton-animated mt-16 h-72 w-full rounded-xl bg-neutral-100/25 p-4 transition duration-500 dark:bg-neutral-900" />
                )}

                {data ? (
                  <LibraryShowcaseSourceBanner currentModule={currentModule} />
                ) : (
                  <div className="fo-skeleton fo-skeleton-animated h-24 w-full rounded-xl bg-neutral-100/25 p-4 transition duration-500 dark:bg-neutral-900" />
                )}

                {data ? (
                  <LibraryShowcaseCardSubsystemCards currentModule={currentModule} />
                ) : (
                  <div className="fo-skeleton fo-skeleton-animated h-72 w-full rounded-xl bg-neutral-100/25 p-4 transition duration-500 dark:bg-neutral-900" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
