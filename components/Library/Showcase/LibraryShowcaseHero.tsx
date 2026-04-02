"use client";

import { useState, useEffect, useRef } from "react";
import LibraryShowcaseKnownHero from "./LibraryShowcaseKnownHero";
import LibraryShowcaseUnknownHero from "./LibraryShowcaseUnknownHero";
import { italicize } from "@/utils/general";
import type { AllModule } from "@/utils/ships";

interface Props {
  currentModule: AllModule | undefined;
  className?: string;
}

export default function LibraryShowcaseHero({ currentModule, className }: Props) {
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

  return (
    <div className={`relative flex w-full flex-col items-center justify-center gap-2 rounded-xl bg-neutral-100/25 p-4 transition duration-500 dark:bg-neutral-900${className ? ` ${className}` : ""}`}>
      {mod && (
        <img className="absolute left-0 top-0 size-8 select-none rounded-br-lg rounded-tl-xl" src={mod.img} alt={mod.system} loading="lazy" />
      )}
      <h3 className="text-xl transition duration-500">
        <span className="text-2xl font-semibold transition duration-500">{mod?.system ?? "404"}</span>:{" "}
        {mod?.type === "known"
          ? italicize(mod.name).map((part, i) => (
              <span key={i} className={`transition duration-500${part[1] ? " italic" : ""}`}>{part[0]}</span>
            ))
          : <span className="transition duration-500">Unknown Module</span>
        }
      </h3>

      {mod?.type === "known" ? (
        <LibraryShowcaseKnownHero mod={mod} />
      ) : (
        <LibraryShowcaseUnknownHero />
      )}
    </div>
  );
}
