"use client";

import LibraryModCard from "./LibraryModCard";
import type { AllModule } from "@/utils/ships";

interface Props {
  modules: AllModule[];
  category: string;
  onSelect: (mod: AllModule) => void;
}

export default function LibraryModCategory({ modules, category, onSelect }: Props) {
  return (
    <div className="group flex w-full items-center justify-center gap-3 xl:gap-6">
      <div className="hidden h-40 w-12 shrink-0 select-none items-center justify-center rounded-xl bg-neutral-100 text-4xl transition duration-500 group-hover:bg-neutral-200 group-hover:duration-150 lg:flex xl:h-36 dark:bg-neutral-900 dark:group-hover:bg-neutral-800">
        {category}
      </div>
      <div className="flex w-full grid-cols-3 grid-rows-1 flex-col items-center justify-center gap-2 sm:grid">
        {modules.map((mod) => (
          <LibraryModCard key={mod.system} mod={mod} onClick={() => onSelect(mod)} />
        ))}
      </div>
    </div>
  );
}
