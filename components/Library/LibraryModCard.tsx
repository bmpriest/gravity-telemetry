"use client";

import type { AllModule } from "@/utils/ships";
import { italicize } from "@/utils/general";

interface Props {
  mod: AllModule;
  onClick: () => void;
}

export default function LibraryModCard({ mod, onClick }: Props) {
  return (
    <button
      className="group/card relative flex h-40 w-full grow-0 flex-col items-center justify-center rounded-xl bg-neutral-100 pb-3 transition duration-500 hover:bg-neutral-200 hover:duration-150 sm:w-auto sm:grow xl:h-36 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      type="button"
      onClick={onClick}
    >
      <img className="absolute left-0 top-0 size-8 select-none rounded-br-lg rounded-tl-xl" src={mod.img} alt={mod.system} loading="lazy" />
      <h3 className="text-xl font-semibold transition duration-500">{mod.system}</h3>

      {mod.type === "known" ? (
        <p className="w-5/6">
          {italicize(mod.name).map((part, i) => (
            <span key={i} className={`transition duration-500${part[1] ? " italic" : ""}`}>{part[0]}</span>
          ))}
        </p>
      ) : (
        <p className="w-5/6 transition duration-500">Unknown Module</p>
      )}
    </button>
  );
}
