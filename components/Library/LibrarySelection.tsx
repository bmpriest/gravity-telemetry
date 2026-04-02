"use client";

import type { SuperCapitalShip } from "@/utils/ships";

interface Props {
  ship: SuperCapitalShip;
  currentShip: SuperCapitalShip | undefined;
  onClick: () => void;
}

export default function LibrarySelection({ ship, currentShip, onClick }: Props) {
  const isActive = currentShip?.name === ship.name;
  return (
    <button
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1 transition duration-500 hover:bg-neutral-200/50 hover:duration-150 dark:hover:bg-neutral-800 ${isActive ? "bg-neutral-200/75 hover:bg-neutral-200/75 dark:bg-neutral-700 dark:hover:bg-neutral-700" : ""}`}
      type="button"
      onClick={onClick}
    >
      <img className="h-10" src={ship.img} alt={ship.name} />
      <p className="text-medium grow text-left transition duration-500">{ship.name}</p>
    </button>
  );
}
