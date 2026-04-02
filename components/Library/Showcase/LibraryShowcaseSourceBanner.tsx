"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AllModule } from "@/utils/ships";

interface Props {
  currentModule: AllModule | undefined;
}

export default function LibraryShowcaseSourceBanner({ currentModule }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mod, setMod] = useState<AllModule | undefined>(currentModule);
  const lastModuleRef = useRef<symbol | undefined>(
    currentModule ? Symbol(currentModule.system) : undefined
  );

  useEffect(() => {
    if (currentModule) {
      lastModuleRef.current = Symbol(currentModule.system);
      setMod(currentModule);
    } else {
      const thisModule = lastModuleRef.current;
      const timeout = setTimeout(() => {
        if (thisModule === lastModuleRef.current) setMod(undefined);
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [currentModule]);

  if (mod?.type !== "known" || !mod.sourcedFrom) return null;

  function handleContact() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("c", "true");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex w-full items-center justify-center gap-4 rounded-xl bg-neutral-100/25 p-4 transition duration-500 dark:bg-neutral-900">
      <img className="size-12 select-none transition duration-500 dark:invert" src="/ui/info.svg" aria-hidden="true" />

      <div className="flex flex-col items-center justify-center gap-3 xl:gap-1">
        <h5 className="text-lg">
          This module&apos;s data was sourced from{" "}
          <span className="text-lg font-medium">{mod.sourcedFrom.join(" & ")}!</span>
        </h5>
        <span className="inline-flex flex-col items-center justify-center text-sm xl:flex-row xl:gap-1">
          Want to contribute? Check out
          <button className="flex items-center justify-center gap-1 font-medium hover:underline" type="button" onClick={handleContact}>
            how to contribute
            <span className="du-tooltip" data-tip="Contact">
              <span className="fo-btn fo-btn-circle fo-btn-text size-6 min-h-6">
                <img className="size-4 transition duration-500 dark:invert" src="/ui/contact.svg" alt="Contact me" />
              </span>
            </span>
          </button>
        </span>
      </div>
    </div>
  );
}
