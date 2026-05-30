"use client";

import Link from "next/link";
import { resolveSystemIcon } from "@/utils/icons";
import type { RichSystem } from "@/utils/shipModel";

interface Props {
  system: RichSystem;
  supercap: boolean;
  /** For supercaps the card links here (System Library); otherwise onClick. */
  href?: string;
  onClick?: () => void;
}

/** A system row in the blueprint view: full-height icon, optional code, name. */
export default function BlueprintSystemCard({ system, supercap, href, onClick }: Props) {
  const icon = resolveSystemIcon(system.iconKey, system.systemTypeName);

  const inner = (
    <>
      <div className="flex h-full w-16 shrink-0 items-center justify-center bg-neutral-200/70 transition duration-500 dark:bg-neutral-800">
        <img className="size-9 select-none transition duration-500 dark:invert" src={icon} alt={system.systemTypeName} />
      </div>
      <div className="flex min-w-0 grow items-center gap-2 px-3 py-3">
        {supercap && system.code && (
          <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-xs font-bold text-white transition duration-500 dark:bg-neutral-200 dark:text-neutral-900">{system.code}</span>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight transition duration-500">{system.name}</p>
          <p className="truncate text-xs text-neutral-500 transition duration-500 dark:text-neutral-400">{system.systemTypeName}</p>
        </div>
      </div>
    </>
  );

  const cls = "flex h-16 w-full items-stretch overflow-hidden rounded-xl bg-neutral-100/40 text-left transition duration-300 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800";

  if (supercap && href) {
    return <Link href={href} className={cls}>{inner}</Link>;
  }
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}
