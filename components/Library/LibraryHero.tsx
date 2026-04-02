"use client";

import type { SuperCapitalShip } from "@/utils/ships";

interface Props {
  currentShip: SuperCapitalShip;
}

export default function LibraryHero({ currentShip }: Props) {
  return (
    <div className="relative flex w-full items-center justify-center rounded-2xl bg-neutral-100/25 p-4 transition duration-500 dark:bg-neutral-900">
      <aside className="absolute left-0 top-0 rounded-br-2xl rounded-tl-2xl px-10 py-4">
        <h5 className="text-lg font-medium transition duration-500">{currentShip.name}</h5>
        <p className="transition duration-500">{currentShip.type}</p>
      </aside>

      <img className="h-32 select-none sm:h-40" src={currentShip.img} alt={currentShip.name} />

      <aside className="absolute bottom-0 right-0 rounded-br-2xl rounded-tl-2xl px-10 py-4">
        <p className="transition duration-500">{currentShip.modules.length} Modules</p>
      </aside>
    </div>
  );
}
