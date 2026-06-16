"use client";

interface Props {
  unlocked: boolean;
  /** Manufacturer logo path; shown once owned. Null for admin-made manufacturers. */
  logo?: string | null;
  shipName: string;
  owner: boolean | undefined;
  onToggle: () => void;
}

/**
 * Owned-state control in the top-left of a ship card. Shows a padlock while the
 * blueprint is unowned; clicking marks it owned and swaps the icon to the ship's
 * manufacturer logo (a checkmark when no logo exists). Clicking again un-owns it.
 */
export default function LockToggle({ unlocked, logo, shipName, owner, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      disabled={!owner}
      title={unlocked ? "Owned — click to remove" : "Click to mark as owned"}
      aria-pressed={unlocked}
      className="flex items-center justify-center backdrop-blur transition duration-300 hover:scale-110 disabled:cursor-auto disabled:hover:scale-100"
    >
      {unlocked ? (
        logo ? (
          <img className="size-8 object-contain invert dark:invert-0" src={logo} alt={`${shipName} manufacturer`} />
        ) : (
          <img className="size-8 transition duration-500 dark:invert" src="/ui/checkmarkCircle.svg" alt="Owned" />
        )
      ) : (
        <img className="size-8 transition duration-500 dark:invert" src="/ui/lock.svg" alt="Not owned" />
      )}
    </button>
  );
}
