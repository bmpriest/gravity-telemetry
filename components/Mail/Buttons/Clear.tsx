"use client";

interface Props {
  showDialog: boolean;
  onToggleDialog: (val: boolean) => void;
  onClearText: () => void;
}

export default function MailButtonClear({ showDialog, onToggleDialog, onClearText }: Props) {
  function clearText() {
    if (!showDialog) return;
    onClearText();
    onToggleDialog(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={`du-btn flex select-none items-center justify-center gap-2 rounded-xl border-red-300 bg-red-100 transition duration-500 hover:scale-105 hover:border-red-400 hover:bg-red-200 dark:border-red-500 dark:hover:bg-red-700 ${showDialog ? "scale-105 border-red-400 bg-red-200 dark:bg-red-700" : "dark:bg-red-800"}`}
        onClick={() => onToggleDialog(!showDialog)}
      >
        <span className="hidden transition duration-500 sm:inline-flex md:hidden lg:inline-flex">Clear</span>
        <img className="size-5 transition duration-500 dark:invert" src="/ui/trash.svg" aria-hidden="true" />
      </button>
      {showDialog && (
        <div className="fo-tooltip-content visible -left-4 bottom-12 opacity-100 sm:left-1/2 sm:-translate-x-1/2" role="popover">
          <div className="fo-tooltip-body flex w-64 flex-col items-center justify-center gap-3 rounded-lg border-2 border-red-300 bg-red-100 p-4 text-start shadow transition duration-500 dark:border-red-500 dark:bg-red-800">
            <p className="text-center text-lg font-medium text-black transition duration-500 dark:text-white">Are you sure you want to clear the editor?</p>
            <div className="flex w-full items-center justify-between gap-2">
              <button type="button" className="du-btn du-btn-outline grow rounded-xl border-black py-1 text-base text-black hover:border-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-neutral-200 dark:text-white dark:hover:border-neutral-200 dark:hover:bg-neutral-200 dark:hover:text-black" onClick={clearText}>Yes</button>
              <button type="button" className="du-btn du-btn-outline grow rounded-xl border-black py-1 text-base text-black hover:border-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-neutral-200 dark:text-white dark:hover:border-neutral-200 dark:hover:bg-neutral-200 dark:hover:text-black" onClick={() => onToggleDialog(false)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
