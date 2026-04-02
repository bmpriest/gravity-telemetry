"use client";

interface Props {
  onClick: () => void;
}

export default function LibraryShowcaseBackButton({ onClick }: Props) {
  return (
    <button
      className="absolute left-8 top-0 flex select-none items-center justify-center gap-2 rounded-xl bg-neutral-100 p-2 px-8 transition duration-500 hover:bg-neutral-200 hover:duration-150 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      type="button"
      onClick={onClick}
    >
      <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/arrowLeft.svg" alt="Go back to the module list" />
      <p className="font-medium transition duration-500">Back</p>
    </button>
  );
}
