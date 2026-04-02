"use client";

interface Props {
  showDialog: boolean;
  outputText: string;
  onToggleDialog: (val: boolean) => void;
}

export default function MailButtonCopy({ showDialog, outputText, onToggleDialog }: Props) {
  function copyText() {
    if (showDialog) return;
    void navigator.clipboard.writeText(outputText);
    onToggleDialog(true);
    setTimeout(() => onToggleDialog(false), 1500);
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={`du-btn flex select-none items-center justify-center gap-2 rounded-xl border-green-300 bg-green-100 transition duration-500 hover:scale-105 hover:border-green-400 hover:bg-green-200 dark:border-green-500 dark:hover:bg-green-700 ${showDialog ? "scale-105 border-green-400 bg-green-200 dark:bg-green-700" : "dark:bg-green-800"}`}
        onClick={copyText}
      >
        <span className="hidden transition duration-500 sm:inline-flex md:hidden lg:inline-flex">Copy</span>
        <img className="size-5 transition duration-500 dark:invert" src="/ui/copy.svg" aria-hidden="true" />
      </button>
      {showDialog && (
        <div className="fo-tooltip-content visible bottom-12 left-1/2 -translate-x-1/2 opacity-100" role="popover">
          <div className="fo-tooltip-body flex w-52 flex-col items-center justify-center gap-3 rounded-lg border-2 border-green-300 bg-green-100 p-4 text-start shadow transition duration-500 dark:border-green-500 dark:bg-green-800">
            <p className="text-center text-lg font-medium text-black transition duration-500 dark:text-white">Copied to clipboard!</p>
            <img className="size-10 dark:invert" style={{ animation: "spin 1s ease-out" }} src="/ui/checkmarkCircle.svg" aria-hidden="true" />
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(-180deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
