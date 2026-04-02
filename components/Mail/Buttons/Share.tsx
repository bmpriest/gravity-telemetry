"use client";

import { useSearchParams } from "next/navigation";
import type { SaveTemplate } from "@/utils/types";

interface Props {
  showDialog: boolean;
  savedMail: SaveTemplate | undefined;
  onToggleDialog: (val: boolean) => void;
}

export default function MailButtonShare({ showDialog, savedMail, onToggleDialog }: Props) {
  const searchParams = useSearchParams();

  function shareText() {
    if (showDialog) return;
    const baseOrigin = process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin;
    const u = searchParams.get("u");
    const id = searchParams.get("id");
    void navigator.clipboard.writeText(`${baseOrigin}/modules/mail-editor/edit?u=${u}&id=${id}`);
    onToggleDialog(true);
    setTimeout(() => onToggleDialog(false), 1500);
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!savedMail}
        className={`du-btn flex select-none items-center justify-center gap-2 rounded-xl border-blue-300 bg-blue-100 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:hover:bg-blue-700 ${showDialog ? "scale-105 border-blue-400 bg-blue-200 dark:bg-blue-700" : "dark:bg-blue-800"} ${!savedMail ? "cursor-not-allowed" : ""}`}
        onClick={shareText}
      >
        <span className="hidden transition duration-500 sm:inline-flex md:hidden lg:inline-flex">Share</span>
        <img className="size-5 transition duration-500 dark:invert" src="/ui/share.svg" aria-hidden="true" />
      </button>
      {showDialog && (
        <div className="fo-tooltip-content visible bottom-12 left-1/2 -translate-x-1/2 opacity-100" role="popover">
          <div className="fo-tooltip-body flex w-52 flex-col items-center justify-center gap-3 rounded-lg border-2 border-blue-300 bg-blue-100 p-4 text-start shadow transition duration-500 dark:border-blue-500 dark:bg-blue-800">
            <p className="text-center text-lg font-medium text-black transition duration-500 dark:text-white">Link copied to clipboard!</p>
            <img className="size-10 dark:invert" style={{ animation: "spin 1s ease-out" }} src="/ui/checkmarkCircle.svg" aria-hidden="true" />
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(-180deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
