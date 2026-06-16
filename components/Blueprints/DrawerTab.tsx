"use client";

interface Props {
  label: string;
  open: boolean;
  onToggle: () => void;
}

/**
 * Vertical tab that lives on the right edge of a ship card. The label is
 * rotated 90° (reading bottom-to-top) as a visual tell that toggling it expands
 * a drawer *out of the card itself* — used for fragment tracking and
 * supercapital module editing on the Blueprint Tracker and Fragments pages.
 */
export default function DrawerTab({ label, open, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex w-10 basis-1/2 grow select-none items-center justify-center self-stretch border-l text-black transition duration-500 dark:text-white ${
        open
          ? "border-blue-400 bg-blue-200 dark:border-blue-600 dark:bg-blue-700"
          : "border-neutral-300 bg-blue-100 hover:bg-blue-200 dark:border-neutral-700 dark:bg-blue-800 dark:hover:bg-blue-700"
      }`}
      title={label}
    >
      <span
        className="whitespace-nowrap text-sm font-semibold"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </button>
  );
}
