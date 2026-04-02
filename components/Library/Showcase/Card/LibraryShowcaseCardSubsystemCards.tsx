"use client";

import { useState, useEffect, useRef } from "react";
import LibraryShowcaseCardSubsystemCard from "./LibraryShowcaseCardSubsystemCard";
import type { AllModule, WeaponSubsystem, AircraftSubsystem, AttackUAVSubsystem, RepairUAVSubsystem, MiscSubsytem, MiscUAVSubsystem } from "@/utils/ships";

type AnySubsystem = WeaponSubsystem | AircraftSubsystem | AttackUAVSubsystem | RepairUAVSubsystem | MiscSubsytem | MiscUAVSubsystem;

interface Props {
  currentModule: AllModule | undefined;
}

export default function LibraryShowcaseCardSubsystemCards({ currentModule }: Props) {
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

  if (mod?.type !== "known") return null;

  return (
    <div className="flex w-full flex-wrap items-stretch justify-center gap-5">
      {(mod.subsystems as AnySubsystem[]).map((subsystem, i) => (
        <LibraryShowcaseCardSubsystemCard key={i} subsystem={subsystem} />
      ))}
    </div>
  );
}
